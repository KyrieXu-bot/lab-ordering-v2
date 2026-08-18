const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const pool = require('../db');
const { requireSales, requireReviewer, isReviewer } = require('../middleware/auth');
const { createCommissionFromPayload } = require('./commission');
const { generateOrderTemplateBuffer } = require('../services/orderTemplate');
const { convertDocxToPdf } = require('../services/pdfConversion');
const { addSampleFlowQrToPdf } = require('../services/sampleFlowQr');

const router = express.Router();

function parseJson(value) {
  if (value == null || typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return null; }
}

function requestNumber(id) {
  return `SQ${String(id).padStart(8, '0')}`;
}

function safeFilePart(value, fallback = '未填写') {
  const text = String(value || fallback).trim();
  return text.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 80) || fallback;
}

async function addEvent(conn, requestId, userId, eventType, note = null) {
  await conn.query(
    `INSERT INTO order_request_events (request_id, actor_user_id, event_type, note)
     VALUES (?, ?, ?, ?)`,
    [requestId, userId, eventType, note]
  );
}

router.get('/', async (req, res, next) => {
  try {
    const reviewer = isReviewer(req.user);
    const params = [];
    let where = '';
    if (!reviewer) {
      where = 'WHERE r.applicant_user_id = ?';
      params.push(req.user.user_id);
    } else if (req.query.status) {
      where = 'WHERE r.status = ?';
      params.push(req.query.status);
    }

    const [rows] = await pool.query(
      `SELECT r.request_id, r.applicant_user_id, applicant.name AS applicant_name,
              r.reviewer_user_id, reviewer.name AS reviewer_name, r.status,
              r.customer_id, r.payer_id, r.commissioner_id,
              COALESCE(m.commissioner_name, c.customer_name) AS customer_name,
              r.review_note, r.approved_order_id, r.attachment_file_id, f.original_filename AS attachment_filename,
              EXISTS(
                SELECT 1 FROM project_files pf
                WHERE pf.order_id = r.approved_order_id
                  AND pf.category = 'order_attachment'
                  AND pf.test_item_id IS NOT NULL
              ) AS pdf_generated,
              r.created_at, r.submitted_at, r.reviewed_at, r.withdrawn_at, r.updated_at
       FROM order_requests r
       JOIN users applicant ON applicant.user_id = r.applicant_user_id
       LEFT JOIN users reviewer ON reviewer.user_id = r.reviewer_user_id
       LEFT JOIN commissioners m ON m.commissioner_id = r.commissioner_id
       LEFT JOIN customers c ON c.customer_id = r.customer_id
       LEFT JOIN order_request_files f ON f.file_id = r.attachment_file_id
       ${where}
       ORDER BY CASE WHEN r.status = 'submitted' THEN 0 ELSE 1 END, r.submitted_at DESC, r.request_id DESC`,
      params
    );
    res.json(rows.map((row) => ({ ...row, request_no: requestNumber(row.request_id) })));
  } catch (error) { next(error); }
});

router.post('/', requireSales, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const requestPayload = req.body?.payload;
    const commissionData = requestPayload?.commissionData;
    const templateData = requestPayload?.templateData;
    if (!commissionData || !Array.isArray(commissionData.testItems)) {
      return res.status(400).json({ message: '申请内容格式不正确' });
    }
    if (!templateData) return res.status(400).json({ message: '缺少委托单模板数据' });

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO order_requests
        (applicant_user_id, status, customer_id, payer_id, commissioner_id,
         submitted_payload, schema_version, submitted_at)
       VALUES (?, 'submitted', ?, ?, ?, ?, 1, CURRENT_TIMESTAMP(3))`,
      [
        req.user.user_id,
        commissionData.customerId || null,
        commissionData.paymentId || null,
        commissionData.commissionerId || null,
        JSON.stringify(requestPayload)
      ]
    );
    const requestNo = requestNumber(result.insertId);
    await addEvent(conn, result.insertId, req.user.user_id, 'submitted');
    await conn.commit();
    res.status(201).json({
      request_id: result.insertId,
      request_no: requestNo,
      status: 'submitted'
    });
  } catch (error) {
    await conn.rollback().catch(() => {});
    next(error);
  } finally { conn.release(); }
});

router.post('/:id/generate-pdf', requireSales, async (req, res, next) => {
  const conn = await pool.getConnection();
  const createdPaths = [];
  const lockName = `order_request_pdf_${req.params.id}`;
  let lockAcquired = false;
  let committed = false;
  try {
    const [[lockResult]] = await conn.query('SELECT GET_LOCK(?, 0) AS acquired', [lockName]);
    lockAcquired = Number(lockResult?.acquired) === 1;
    if (!lockAcquired) return res.status(409).json({ message: '该委托单正在生成 PDF，请稍后刷新' });

    const [[row]] = await conn.query(
      `SELECT request_id, applicant_user_id, status, approved_order_id,
              reviewed_payload, submitted_payload, attachment_file_id, sample_flow_token
       FROM order_requests
       WHERE request_id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ message: '申请不存在' });
    if (row.applicant_user_id !== req.user.user_id) {
      return res.status(403).json({ message: '无权生成该申请的 PDF' });
    }
    if (row.status !== 'approved' || !String(row.approved_order_id || '').trim()) {
      return res.status(409).json({ message: '申请通过并取得正式委托单号后才能生成 PDF' });
    }
    const payload = parseJson(row.reviewed_payload) || parseJson(row.submitted_payload) || {};
    const templateData = payload.templateData;
    if (!templateData) return res.status(400).json({ message: '申请中缺少委托单模板数据' });

    const [testItems] = await conn.query(
      `SELECT test_item_id FROM test_items WHERE order_id = ? ORDER BY test_item_id`,
      [row.approved_order_id]
    );
    if (!testItems.length) {
      return res.status(409).json({ message: '正式委托单下没有检测项目，无法关联附件' });
    }
    if (row.attachment_file_id && row.sample_flow_token) {
      const [[linkedFile]] = await conn.query(
        `SELECT COUNT(DISTINCT test_item_id) AS linked_count
         FROM project_files
         WHERE order_id = ? AND category = 'order_attachment' AND test_item_id IS NOT NULL`,
        [row.approved_order_id]
      );
      if (Number(linkedFile?.linked_count || 0) >= testItems.length) {
        return res.json({ ok: true, already_generated: true, file_id: row.attachment_file_id });
      }
    }

    const customerName = safeFilePart(payload?.formSnapshot?.selectedCustomer?.customer_name, '委托方');
    const contactName = safeFilePart(payload?.formSnapshot?.selectedCustomer?.contact_name, '联系人');
    const orderId = safeFilePart(row.approved_order_id, '委托单');
    const baseName = `${orderId}-${customerName}-${contactName}`;
    const relativeDir = path.join('order-requests', String(row.request_id));
    const absoluteDir = path.join(__dirname, '..', '..', 'uploads', relativeDir);
    const docxPath = path.join(absoluteDir, `${baseName}.docx`);
    const pdfPath = path.join(absoluteDir, `${baseName}.pdf`);
    await fs.mkdir(absoluteDir, { recursive: true });
    createdPaths.push(docxPath, pdfPath);

    const sampleFlowToken = row.sample_flow_token || `SF_${crypto.randomBytes(18).toString('base64url')}`;

    const docxBuffer = await generateOrderTemplateBuffer({ ...templateData, order_num: row.approved_order_id });
    await fs.writeFile(docxPath, docxBuffer);
    const conversion = await convertDocxToPdf(docxPath, pdfPath);
    const qrResult = await addSampleFlowQrToPdf(pdfPath, sampleFlowToken);
    const pdfStat = await fs.stat(pdfPath);
    if (!pdfStat.size) throw new Error('生成的 PDF 文件为空');

    const filename = `${baseName}.pdf`;
    const storedPath = path.posix.join('order-requests', String(row.request_id), filename);
    const publicFilepath = `/uploads/${storedPath}`;

    await conn.beginTransaction();
    const [[lockedRequest]] = await conn.query(
      `SELECT attachment_file_id, sample_flow_token FROM order_requests WHERE request_id = ? FOR UPDATE`,
      [row.request_id]
    );

    const [fileResult] = await conn.query(
      `INSERT INTO order_request_files
        (request_id, file_type, original_filename, stored_path, mime_type, file_size, created_by)
       VALUES (?, 'application_pdf', ?, ?, 'application/pdf', ?, ?)`,
      [row.request_id, filename, storedPath, pdfStat.size, req.user.user_id]
    );
    await conn.query(
      `DELETE FROM project_files
       WHERE order_id = ? AND category = 'order_attachment' AND test_item_id IS NOT NULL`,
      [row.approved_order_id]
    );
    for (const testItem of testItems) {
      await conn.query(
        `INSERT INTO project_files
          (category, filename, filepath, order_id, test_item_id, sample_id, uploaded_by)
         VALUES ('order_attachment', ?, ?, ?, ?, NULL, ?)`,
        [filename, publicFilepath, row.approved_order_id, testItem.test_item_id, req.user.user_id]
      );
    }
    await conn.query(
      `UPDATE order_requests
       SET attachment_file_id = ?, sample_flow_token = ?, version = version + 1
       WHERE request_id = ?`,
      [fileResult.insertId, sampleFlowToken, row.request_id]
    );
    if (lockedRequest.attachment_file_id) {
      await conn.query(
        `DELETE FROM order_request_files WHERE file_id = ?`,
        [lockedRequest.attachment_file_id]
      );
    }
    await conn.commit();
    committed = true;
    await fs.rm(docxPath, { force: true }).catch(() => {});
    res.status(201).json({
      ok: true,
      file_id: fileResult.insertId,
      filename,
      linked_test_item_count: testItems.length,
      conversion_engine: conversion.engine,
      qr_page_count: qrResult.pageCount
    });
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (!committed) {
      await Promise.all(createdPaths.map((filePath) => fs.rm(filePath, { force: true }).catch(() => {})));
    }
    next(error);
  } finally {
    if (lockAcquired) await conn.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
    conn.release();
  }
});

router.get('/:id/attachment', async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT r.applicant_user_id, r.attachment_file_id,
              f.original_filename, f.stored_path, f.mime_type
       FROM order_requests r
       LEFT JOIN order_request_files f ON f.file_id = r.attachment_file_id
       WHERE r.request_id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ message: '申请不存在' });
    if (!isReviewer(req.user) && row.applicant_user_id !== req.user.user_id) {
      return res.status(403).json({ message: '无权下载该申请附件' });
    }
    if (!row.attachment_file_id || !row.stored_path) return res.status(404).json({ message: '该申请没有 PDF 附件' });
    const storageRoots = [
      path.resolve(__dirname, '..', '..', 'uploads'),
      path.resolve(__dirname, '..', '..', 'private_uploads')
    ];
    let filePath = null;
    for (const storageRoot of storageRoots) {
      const candidate = path.resolve(storageRoot, row.stored_path);
      if (!candidate.startsWith(`${storageRoot}${path.sep}`)) continue;
      try {
        await fs.access(candidate);
        filePath = candidate;
        break;
      } catch (_) {}
    }
    if (!filePath) return res.status(404).json({ message: '附件文件不存在' });
    res.type(row.mime_type || 'application/pdf');
    res.download(filePath, row.original_filename);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ message: '附件文件不存在' });
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT r.*, applicant.name AS applicant_name, reviewer.name AS reviewer_name
       FROM order_requests r
       JOIN users applicant ON applicant.user_id = r.applicant_user_id
       LEFT JOIN users reviewer ON reviewer.user_id = r.reviewer_user_id
       WHERE r.request_id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ message: '申请不存在' });
    if (!isReviewer(req.user) && row.applicant_user_id !== req.user.user_id) {
      return res.status(403).json({ message: '无权查看该申请' });
    }
    row.submitted_payload = parseJson(row.submitted_payload);
    row.reviewed_payload = parseJson(row.reviewed_payload);
    row.request_no = requestNumber(row.request_id);
    res.json(row);
  } catch (error) { next(error); }
});

router.post('/:id/withdraw', requireSales, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT request_id, applicant_user_id, status FROM order_requests WHERE request_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!row) throw Object.assign(new Error('申请不存在'), { status: 404 });
    if (row.applicant_user_id !== req.user.user_id) throw Object.assign(new Error('无权撤回该申请'), { status: 403 });
    if (row.status !== 'submitted') throw Object.assign(new Error('当前状态不能撤回'), { status: 409 });

    await conn.query(
      `UPDATE order_requests
       SET status = 'withdrawn', withdrawn_at = CURRENT_TIMESTAMP(3), version = version + 1
       WHERE request_id = ?`,
      [row.request_id]
    );
    await addEvent(conn, row.request_id, req.user.user_id, 'withdrawn');
    await conn.commit();
    res.json({ ok: true, status: 'withdrawn' });
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally { conn.release(); }
});

router.post('/:id/return', requireReviewer, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const note = String(req.body?.note || '').trim();
    if (!note) return res.status(400).json({ message: '请填写退回原因' });
    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT request_id, status FROM order_requests WHERE request_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!row) throw Object.assign(new Error('申请不存在'), { status: 404 });
    if (row.status !== 'submitted') throw Object.assign(new Error('该申请已被处理'), { status: 409 });
    await conn.query(
      `UPDATE order_requests
       SET status = 'returned', reviewer_user_id = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP(3), version = version + 1
       WHERE request_id = ?`,
      [req.user.user_id, note, row.request_id]
    );
    await addEvent(conn, row.request_id, req.user.user_id, 'returned', note);
    await conn.commit();
    res.json({ ok: true, status: 'returned' });
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally { conn.release(); }
});

router.post('/:id/approve', requireReviewer, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const reviewedPayload = req.body?.payload;
    const commissionData = reviewedPayload?.commissionData;
    if (!commissionData) return res.status(400).json({ message: '缺少审核后的开单内容' });
    const approvedOrderId = String(commissionData?.orderInfo?.order_num || '').trim();
    if (!approvedOrderId) {
      return res.status(400).json({ message: '审批通过前必须填写正式委托单号' });
    }
    commissionData.orderInfo = { ...commissionData.orderInfo, order_num: approvedOrderId };

    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT request_id, status, approved_order_id FROM order_requests WHERE request_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!row) throw Object.assign(new Error('申请不存在'), { status: 404 });
    if (row.status !== 'submitted' || row.approved_order_id) {
      throw Object.assign(new Error('该申请已被处理，不能重复通过'), { status: 409 });
    }

    const result = await createCommissionFromPayload(commissionData, {
      connection: conn,
      operatorUserId: req.user.user_id
    });
    await conn.query(
      `UPDATE order_requests
       SET status = 'approved', reviewer_user_id = ?, reviewed_payload = ?,
           approved_order_id = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP(3), version = version + 1
       WHERE request_id = ?`,
      [
        req.user.user_id,
        JSON.stringify(reviewedPayload),
        result.orderNum,
        String(req.body?.note || '').trim() || null,
        row.request_id
      ]
    );
    await addEvent(conn, row.request_id, req.user.user_id, 'approved', result.orderNum);
    await conn.commit();
    res.json({ ok: true, status: 'approved', orderNum: result.orderNum });
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally { conn.release(); }
});

module.exports = { router };
