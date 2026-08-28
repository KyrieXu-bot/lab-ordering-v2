const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const multer = require('multer');
const pool = require('../db');
const { requireSales, requireReviewer, isReviewer } = require('../middleware/auth');
const { createCommissionFromPayload } = require('./commission');
const { generateOrderTemplateBuffer } = require('../services/orderTemplate');
const { convertDocxToPdf } = require('../services/pdfConversion');
const { addSampleFlowQrToPdf } = require('../services/sampleFlowQr');
const { syncRequestSalesperson } = require('../services/salesSignature');
const { buildOrderRequestPdfTemplateData } = require('../services/orderRequestPdfData');
const { applyOrderModification, appendOrderTestItems } = require('../services/orderFollowUp');
const {
  allocateOrderId,
  buildApprovedPayload,
  extractReservedOrderId,
  targetOrderPrefix
} = require('../services/orderNumberAllocation');

const router = express.Router();
const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');
const requestAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 }
}).single('file');

function receiveRequestAttachment(req, res, next) {
  requestAttachmentUpload(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: '单个附件不能超过 20MB' });
    return res.status(400).json({ message: '附件上传失败，请检查文件后重试' });
  });
}

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

function cleanOriginalFilename(value) {
  const rawName = path.basename(String(value || '附件'));
  let filename = rawName;
  try {
    const decoded = Buffer.from(rawName, 'latin1').toString('utf8');
    if (!decoded.includes('\uFFFD') && /[^\x00-\x7F]/.test(decoded)) filename = decoded;
  } catch (_) {}
  return filename.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 255) || '附件';
}

function resolveUploadPath(storedPath) {
  const normalized = String(storedPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const absolutePath = path.resolve(uploadsRoot, ...normalized.split('/'));
  if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    throw Object.assign(new Error('附件存储路径不合法'), { status: 400 });
  }
  return absolutePath;
}

async function nextVersionedPdfPaths(absoluteDir, baseName) {
  for (let version = 0; version < 10000; version += 1) {
    const suffix = version ? `(${version})` : '';
    const storageBaseName = `${baseName}${suffix}`;
    const pdfPath = path.join(absoluteDir, `${storageBaseName}.pdf`);
    try {
      await fs.access(pdfPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          storageBaseName,
          docxPath: path.join(absoluteDir, `${storageBaseName}.docx`),
          pdfPath
        };
      }
      throw error;
    }
  }
  throw new Error('该委托单的 PDF 历史版本数量过多，无法继续生成');
}

function canAccessRequest(row, user) {
  return isReviewer(user) || row.applicant_user_id === user.user_id;
}

async function addEvent(conn, requestId, userId, eventType, note = null) {
  await conn.query(
    `INSERT INTO order_request_events (request_id, actor_user_id, event_type, note)
     VALUES (?, ?, ?, ?)`,
    [requestId, userId, eventType, note]
  );
}

async function linkRequestFilesToLims(conn, requestId, orderId) {
  const [requestFiles] = await conn.query(
    `SELECT original_filename, stored_path, created_by
     FROM order_request_files
     WHERE request_id = ? AND file_type = 'user_upload'
     ORDER BY file_id`,
    [requestId]
  );
  if (!requestFiles.length) return;
  const [testItems] = await conn.query(
    `SELECT test_item_id FROM test_items WHERE order_id = ? ORDER BY test_item_id`,
    [orderId]
  );
  for (const requestFile of requestFiles) {
    const projectFilename = String(requestFile.original_filename || '附件').slice(0, 200);
    const projectFilepath = resolveUploadPath(requestFile.stored_path).replace(/\\/g, '/');
    for (const testItem of testItems) {
      await conn.query(
        `INSERT INTO project_files
          (category, filename, filepath, order_id, test_item_id, sample_id, uploaded_by)
         VALUES ('order_attachment', ?, ?, ?, ?, NULL, ?)`,
        [projectFilename, projectFilepath, orderId, testItem.test_item_id, requestFile.created_by]
      );
    }
  }
}

router.get('/', async (req, res, next) => {
  try {
    const reviewer = isReviewer(req.user);
    const paginationRequested = req.query.page !== undefined || req.query.page_size !== undefined;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.page_size, 10) || 20));
    const allowedStatuses = new Set(['submitted', 'approved', 'returned', 'withdrawn']);
    const requestedStatus = String(req.query.status || '').trim();
    const keyword = String(req.query.keyword || '').trim().slice(0, 100);
    const reservedOrderSql = `NULLIF(JSON_UNQUOTE(JSON_EXTRACT(r.reviewed_payload, '$.workflow.reservedOrderId')), 'null')`;
    const displayOrderSql = `COALESCE(r.approved_order_id, r.target_order_id, ${reservedOrderSql})`;
    if (requestedStatus && !allowedStatuses.has(requestedStatus)) {
      return res.status(400).json({ message: '申请状态筛选值不正确' });
    }

    const baseConditions = [];
    const baseParams = [];
    if (!reviewer) {
      baseConditions.push('r.applicant_user_id = ?');
      baseParams.push(req.user.user_id);
    }
    if (keyword) {
      const fuzzyKeyword = `%${keyword}%`;
      baseConditions.push(`(
        CONCAT('SQ', LPAD(r.request_id, 8, '0')) LIKE ?
        OR COALESCE(${displayOrderSql}, '') LIKE ?
        OR EXISTS (
          SELECT 1 FROM commissioners search_commissioner
          WHERE search_commissioner.commissioner_id = r.commissioner_id
            AND search_commissioner.commissioner_name LIKE ?
        )
        OR EXISTS (
          SELECT 1 FROM customers search_customer
          WHERE search_customer.customer_id = r.customer_id
            AND search_customer.customer_name LIKE ?
        )
      )`);
      baseParams.push(fuzzyKeyword, fuzzyKeyword, fuzzyKeyword, fuzzyKeyword);
    }
    const conditions = [...baseConditions];
    const params = [...baseParams];
    if (reviewer && requestedStatus) {
      conditions.push('r.status = ?');
      params.push(requestedStatus);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const baseWhere = baseConditions.length ? `WHERE ${baseConditions.join(' AND ')}` : '';
    const urgencySql = `COALESCE(
      CASE WHEN JSON_VALID(r.reviewed_payload) THEN JSON_UNQUOTE(JSON_EXTRACT(r.reviewed_payload, '$.formSnapshot.formData.orderUrgencyType')) END,
      CASE WHEN JSON_VALID(r.reviewed_payload) THEN JSON_UNQUOTE(JSON_EXTRACT(r.reviewed_payload, '$.commissionData.orderInfo.order_urgency_type')) END,
      CASE WHEN JSON_VALID(r.submitted_payload) THEN JSON_UNQUOTE(JSON_EXTRACT(r.submitted_payload, '$.formSnapshot.formData.orderUrgencyType')) END,
      CASE WHEN JSON_VALID(r.submitted_payload) THEN JSON_UNQUOTE(JSON_EXTRACT(r.submitted_payload, '$.commissionData.orderInfo.order_urgency_type')) END,
      'normal'
    )`;
    const orderBy = reviewer
      ? `ORDER BY
           CASE
             WHEN r.status = 'submitted' AND ${urgencySql} IN ('urgent_1_5x', 'urgent_2x') THEN 0
             WHEN r.status = 'submitted' THEN 1
             ELSE 2
           END,
           r.submitted_at DESC, r.request_id DESC`
      : `ORDER BY CASE WHEN r.status = 'submitted' THEN 0 ELSE 1 END,
           r.submitted_at DESC, r.request_id DESC`;
    const limitSql = paginationRequested ? 'LIMIT ? OFFSET ?' : '';
    const listParams = paginationRequested
      ? [...params, pageSize, (page - 1) * pageSize]
      : params;

    if (!reviewer && String(req.query.grouped || '') === '1') {
      const groupKeySql = `COALESCE(${displayOrderSql}, CONCAT('REQUEST-', r.request_id))`;
      const groupStatusSql = `SUBSTRING_INDEX(GROUP_CONCAT(r.status ORDER BY r.submitted_at DESC, r.request_id DESC), ',', 1)`;
      const groupHavingSql = requestedStatus ? `HAVING ${groupStatusSql} = ?` : '';
      const groupLimitSql = paginationRequested ? 'LIMIT ? OFFSET ?' : '';
      const groupedBaseParams = requestedStatus ? [...params, requestedStatus] : params;
      const groupParams = paginationRequested ? [...groupedBaseParams, pageSize, (page - 1) * pageSize] : groupedBaseParams;
      const [groupRows] = await pool.query(
        `SELECT ${groupKeySql} AS group_key, MAX(r.submitted_at) AS latest_submitted_at
         FROM order_requests r ${where}
         GROUP BY ${groupKeySql}
         ${groupHavingSql}
         ORDER BY latest_submitted_at DESC
         ${groupLimitSql}`,
        groupParams
      );
      const groupKeys = groupRows.map(row => row.group_key);
      let groupedItems = [];
      if (groupKeys.length) {
        const groupedConditions = ['r.applicant_user_id = ?', `${groupKeySql} IN (${groupKeys.map(() => '?').join(',')})`];
        const [groupedRows] = await pool.query(
          `SELECT r.request_id, r.applicant_user_id, applicant.name AS applicant_name,
                  r.reviewer_user_id, reviewer.name AS reviewer_name, r.status,
                  r.request_type, r.parent_request_id, r.root_request_id, r.target_order_id,
                  r.customer_id, r.payer_id, r.commissioner_id,
                  COALESCE(m.commissioner_name, c.customer_name) AS customer_name,
                  r.review_note, ${displayOrderSql} AS approved_order_id,
                  (CASE
                    WHEN r.request_type = 'normal' THEN r.approved_order_id IS NOT NULL
                    WHEN r.request_type = 'modification' THEN r.status = 'approved'
                    ELSE r.applied_at IS NOT NULL
                  END) AS order_opened, r.version,
                  r.attachment_file_id, f.original_filename AS attachment_filename,
                  (EXISTS(SELECT 1 FROM project_files pf WHERE pf.order_id = COALESCE(r.approved_order_id, r.target_order_id)
                    AND pf.category = 'order_attachment' AND pf.test_item_id IS NOT NULL
                    AND pf.filepath LIKE CONCAT('%/', f.stored_path))
                   AND NOT EXISTS(SELECT 1 FROM order_requests newer_change
                    WHERE newer_change.target_order_id = COALESCE(r.approved_order_id, r.target_order_id) AND newer_change.request_type = 'modification'
                      AND newer_change.status = 'approved' AND newer_change.reviewed_at > f.created_at)
                   AND NOT EXISTS(SELECT 1 FROM order_requests newer_addition
                    WHERE newer_addition.target_order_id = COALESCE(r.approved_order_id, r.target_order_id)
                      AND newer_addition.request_type = 'additional_test' AND newer_addition.status = 'approved'
                      AND newer_addition.reviewed_at > f.created_at)) AS pdf_generated,
                  ${urgencySql} AS order_urgency_type, ${groupKeySql} AS group_key,
                  r.created_at, r.submitted_at, r.reviewed_at, r.withdrawn_at, r.updated_at
           FROM order_requests r
           JOIN users applicant ON applicant.user_id = r.applicant_user_id
           LEFT JOIN users reviewer ON reviewer.user_id = r.reviewer_user_id
           LEFT JOIN commissioners m ON m.commissioner_id = r.commissioner_id
           LEFT JOIN customers c ON c.customer_id = r.customer_id
           LEFT JOIN order_request_files f ON f.file_id = r.attachment_file_id
           WHERE ${groupedConditions.join(' AND ')}
           ORDER BY r.submitted_at DESC, r.request_id DESC`,
          [req.user.user_id, ...groupKeys]
        );
        const groupOrder = new Map(groupKeys.map((key, index) => [String(key), index]));
        groupedItems = groupedRows
          .map(row => ({ ...row, request_no: requestNumber(row.request_id) }))
          .sort((a, b) => (groupOrder.get(String(a.group_key)) - groupOrder.get(String(b.group_key))) || (b.request_id - a.request_id));
      }
      const [[groupTotal]] = await pool.query(
        `SELECT COUNT(*) AS total FROM (SELECT ${groupKeySql} FROM order_requests r ${where} GROUP BY ${groupKeySql} ${groupHavingSql}) grouped_requests`,
        groupedBaseParams
      );
      const total = Number(groupTotal?.total || 0);
      return res.json({
        items: groupedItems,
        pagination: { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) },
        counts: {}
      });
    }

    const [rows] = await pool.query(
      `SELECT r.request_id, r.applicant_user_id, applicant.name AS applicant_name,
              r.reviewer_user_id, reviewer.name AS reviewer_name, r.status,
              r.request_type, r.parent_request_id, r.root_request_id, r.target_order_id,
              r.customer_id, r.payer_id, r.commissioner_id,
              COALESCE(m.commissioner_name, c.customer_name) AS customer_name,
              r.review_note, ${displayOrderSql} AS approved_order_id,
              (CASE
                WHEN r.request_type = 'normal' THEN r.approved_order_id IS NOT NULL
                WHEN r.request_type = 'modification' THEN r.status = 'approved'
                ELSE r.applied_at IS NOT NULL
              END) AS order_opened, r.version,
              r.attachment_file_id, f.original_filename AS attachment_filename,
              (EXISTS(
                SELECT 1 FROM project_files pf
                WHERE pf.order_id = COALESCE(r.approved_order_id, r.target_order_id)
                  AND pf.category = 'order_attachment'
                  AND pf.test_item_id IS NOT NULL
                  AND pf.filepath LIKE CONCAT('%/', f.stored_path)
              ) AND NOT EXISTS(
                SELECT 1 FROM order_requests newer_change
                WHERE newer_change.target_order_id = COALESCE(r.approved_order_id, r.target_order_id)
                  AND newer_change.request_type = 'modification' AND newer_change.status = 'approved'
                  AND newer_change.reviewed_at > f.created_at
              ) AND NOT EXISTS(
                SELECT 1 FROM order_requests newer_addition
                WHERE newer_addition.target_order_id = COALESCE(r.approved_order_id, r.target_order_id)
                  AND newer_addition.request_type = 'additional_test' AND newer_addition.status = 'approved'
                  AND newer_addition.reviewed_at > f.created_at
              )) AS pdf_generated,
              ${urgencySql} AS order_urgency_type,
              r.created_at, r.submitted_at, r.reviewed_at, r.withdrawn_at, r.updated_at
       FROM order_requests r
       JOIN users applicant ON applicant.user_id = r.applicant_user_id
       LEFT JOIN users reviewer ON reviewer.user_id = r.reviewer_user_id
       LEFT JOIN commissioners m ON m.commissioner_id = r.commissioner_id
       LEFT JOIN customers c ON c.customer_id = r.customer_id
       LEFT JOIN order_request_files f ON f.file_id = r.attachment_file_id
       ${where}
       ${orderBy}
       ${limitSql}`,
      listParams
    );
    const items = rows.map((row) => ({ ...row, request_no: requestNumber(row.request_id) }));
    if (!paginationRequested) return res.json(items);

    const [[totalRows], [statusRows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM order_requests r ${where}`, params),
      pool.query(
        `SELECT r.status, COUNT(*) AS total
         FROM order_requests r
         ${baseWhere}
         GROUP BY r.status`,
        baseParams
      )
    ]);
    const total = Number(totalRows[0]?.total || 0);
    const counts = { submitted: 0, approved: 0, returned: 0, withdrawn: 0 };
    statusRows.forEach((row) => { counts[row.status] = Number(row.total || 0); });
    return res.json({
      items,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.max(1, Math.ceil(total / pageSize))
      },
      counts
    });
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
    const salesperson = await syncRequestSalesperson(conn, requestPayload, { refreshSignatureDate: true });
    if (!salesperson) return res.status(400).json({ message: '所选付款方未绑定有效的服务方联系人，无法添加电子签名' });

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO order_requests
        (applicant_user_id, status, request_type, customer_id, payer_id, commissioner_id,
         submitted_payload, schema_version, submitted_at)
       VALUES (?, 'submitted', 'normal', ?, ?, ?, ?, 1, CURRENT_TIMESTAMP(3))`,
      [
        req.user.user_id,
        commissionData.customerId || null,
        commissionData.paymentId || null,
        commissionData.commissionerId || null,
        JSON.stringify(requestPayload)
      ]
    );
    await conn.query('UPDATE order_requests SET root_request_id = request_id WHERE request_id = ?', [result.insertId]);
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

router.post('/:id/follow-up', requireSales, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const requestType = String(req.body?.request_type || '').trim();
    const requestPayload = req.body?.payload;
    if (!['modification', 'additional_test'].includes(requestType)) {
      return res.status(400).json({ message: '二次申请类型不正确' });
    }
    if (!requestPayload?.commissionData || !requestPayload?.templateData) {
      return res.status(400).json({ message: '申请内容格式不正确' });
    }
    const salesperson = await syncRequestSalesperson(conn, requestPayload, { refreshSignatureDate: true });
    if (!salesperson) return res.status(400).json({ message: '所选付款方未绑定有效的服务方联系人，无法提交二次申请' });
    await conn.beginTransaction();
    const [[source]] = await conn.query(
      `SELECT request_id, applicant_user_id, status, request_type, root_request_id,
              approved_order_id, target_order_id
       FROM order_requests WHERE request_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!source) throw Object.assign(new Error('原申请不存在'), { status: 404 });
    if (source.applicant_user_id !== req.user.user_id) throw Object.assign(new Error('无权操作该申请'), { status: 403 });
    if (source.status !== 'approved') throw Object.assign(new Error('只有已通过的申请才能发起修改或加测'), { status: 409 });
    const targetOrderId = source.approved_order_id || source.target_order_id;
    if (!targetOrderId) throw Object.assign(new Error('原申请尚未完成正式开单'), { status: 409 });
    const [[activeFollowUp]] = await conn.query(
      `SELECT request_id FROM order_requests
       WHERE target_order_id = ? AND request_type = ? AND status = 'submitted' LIMIT 1 FOR UPDATE`,
      [targetOrderId, requestType]
    );
    if (activeFollowUp) throw Object.assign(new Error(`该委托单已有待审批的${requestType === 'modification' ? '修改' : '加测'}申请`), { status: 409 });
    requestPayload.workflow = {
      ...(requestPayload.workflow || {}),
      requestType,
      sourceRequestId: source.request_id,
      targetOrderId
    };
    requestPayload.commissionData.orderInfo = {
      ...(requestPayload.commissionData.orderInfo || {}),
      order_num: targetOrderId
    };
    requestPayload.templateData = { ...(requestPayload.templateData || {}), order_num: targetOrderId };
    const [result] = await conn.query(
      `INSERT INTO order_requests
        (applicant_user_id, status, request_type, parent_request_id, root_request_id, target_order_id,
         customer_id, payer_id, commissioner_id, submitted_payload, schema_version, submitted_at)
       VALUES (?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, 2, CURRENT_TIMESTAMP(3))`,
      [
        req.user.user_id, requestType, source.request_id, source.root_request_id || source.request_id, targetOrderId,
        requestPayload.commissionData.customerId || null, requestPayload.commissionData.paymentId || null,
        requestPayload.commissionData.commissionerId || null, JSON.stringify(requestPayload)
      ]
    );
    await addEvent(conn, result.insertId, req.user.user_id, 'submitted', requestType === 'modification' ? '修改申请' : '加测申请');
    await conn.commit();
    res.status(201).json({ request_id: result.insertId, request_no: requestNumber(result.insertId), request_type: requestType, status: 'submitted', approved_order_id: targetOrderId });
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally { conn.release(); }
});

router.put('/:id', requireSales, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const requestPayload = req.body?.payload;
    const commissionData = requestPayload?.commissionData;
    const templateData = requestPayload?.templateData;
    const expectedVersion = Number(req.body?.version);
    if (!commissionData || !Array.isArray(commissionData.testItems)) {
      return res.status(400).json({ message: '申请内容格式不正确' });
    }
    if (!templateData) return res.status(400).json({ message: '缺少委托单模板数据' });
    if (!Number.isInteger(expectedVersion)) return res.status(400).json({ message: '申请版本信息缺失，请刷新后重试' });
    const salesperson = await syncRequestSalesperson(conn, requestPayload, { refreshSignatureDate: true });
    if (!salesperson) return res.status(400).json({ message: '所选付款方未绑定有效的服务方联系人，无法更新电子签名' });

    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT request_id, applicant_user_id, status, version
       FROM order_requests
       WHERE request_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!row) throw Object.assign(new Error('申请不存在'), { status: 404 });
    if (row.applicant_user_id !== req.user.user_id) {
      throw Object.assign(new Error('无权修改该申请'), { status: 403 });
    }
    if (!['submitted', 'returned'].includes(row.status)) {
      throw Object.assign(new Error('该申请已被处理，不能再修改'), { status: 409 });
    }
    if (Number(row.version) !== expectedVersion) {
      throw Object.assign(new Error('申请内容已发生变化，请刷新后重新修改'), { status: 409 });
    }

    await conn.query(
      `UPDATE order_requests
       SET submitted_at = IF(status = 'returned', CURRENT_TIMESTAMP(3), submitted_at),
           status = 'submitted', reviewer_user_id = NULL, review_note = NULL, reviewed_at = NULL,
           customer_id = ?, payer_id = ?, commissioner_id = ?, submitted_payload = ?,
           schema_version = 1, version = version + 1
       WHERE request_id = ?`,
      [
        commissionData.customerId || null,
        commissionData.paymentId || null,
        commissionData.commissionerId || null,
        JSON.stringify(requestPayload),
        row.request_id
      ]
    );
    await addEvent(conn, row.request_id, req.user.user_id, 'submitted', '业务修改申请');
    await conn.commit();
    res.json({ ok: true, status: 'submitted', version: expectedVersion + 1 });
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally { conn.release(); }
});

router.get('/:id/files', async (req, res, next) => {
  try {
    const [[requestRow]] = await pool.query(
      `SELECT request_id, applicant_user_id, status, approved_order_id, target_order_id
       FROM order_requests WHERE request_id = ?`,
      [req.params.id]
    );
    if (!requestRow) return res.status(404).json({ message: '申请不存在' });
    if (!canAccessRequest(requestRow, req.user)) return res.status(403).json({ message: '无权查看该申请附件' });

    const [files] = await pool.query(
      `SELECT f.file_id, f.original_filename, f.mime_type, f.file_size, f.created_at,
              EXISTS(
                SELECT 1 FROM project_files pf
                WHERE pf.order_id = COALESCE(r.approved_order_id, r.target_order_id)
                  AND pf.category = 'order_attachment'
                  AND pf.filepath = CONCAT(?, '/', f.stored_path)
              ) AS linked_to_lims
       FROM order_request_files f
       JOIN order_requests r ON r.request_id = f.request_id
       WHERE f.request_id = ? AND f.file_type = 'user_upload'
         AND (COALESCE(r.approved_order_id, r.target_order_id) IS NULL OR EXISTS(
           SELECT 1 FROM project_files visible_pf
           WHERE visible_pf.order_id = COALESCE(r.approved_order_id, r.target_order_id)
             AND visible_pf.category = 'order_attachment'
             AND visible_pf.filepath = CONCAT(?, '/', f.stored_path)
         ))
       ORDER BY f.file_id`,
      [uploadsRoot.replace(/\\/g, '/'), requestRow.request_id, uploadsRoot.replace(/\\/g, '/')]
    );
    res.json(files.map((file) => ({
      ...file,
      can_delete: requestRow.status === 'submitted'
        ? true
        : requestRow.status === 'returned' && !isReviewer(req.user)
    })));
  } catch (error) { next(error); }
});

router.post('/:id/files', receiveRequestAttachment, async (req, res, next) => {
  const conn = await pool.getConnection();
  let absolutePath = null;
  try {
    if (!req.file) return res.status(400).json({ message: '请选择需要上传的附件' });
    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT request_id, applicant_user_id, status, version
       FROM order_requests WHERE request_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!row) throw Object.assign(new Error('申请不存在'), { status: 404 });
    if (!canAccessRequest(row, req.user)) throw Object.assign(new Error('无权上传该申请附件'), { status: 403 });
    const reviewer = isReviewer(req.user);
    const canUpload = row.status === 'submitted' || (row.status === 'returned' && !reviewer);
    if (!canUpload) throw Object.assign(new Error('当前申请状态不能上传附件'), { status: 409 });

    const originalFilename = cleanOriginalFilename(req.file.originalname);
    const rawExtension = path.extname(originalFilename).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12);
    const storedFilename = `${Date.now()}-${crypto.randomBytes(10).toString('hex')}${rawExtension}`;
    const storedPath = path.posix.join('order-request-attachments', String(row.request_id), storedFilename);
    absolutePath = resolveUploadPath(storedPath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, req.file.buffer, { flag: 'wx' });

    const [result] = await conn.query(
      `INSERT INTO order_request_files
        (request_id, file_type, original_filename, stored_path, mime_type, file_size, created_by)
       VALUES (?, 'user_upload', ?, ?, ?, ?, ?)`,
      [
        row.request_id,
        originalFilename,
        storedPath,
        String(req.file.mimetype || 'application/octet-stream').slice(0, 100),
        req.file.size,
        req.user.user_id
      ]
    );
    await conn.query('UPDATE order_requests SET version = version + 1 WHERE request_id = ?', [row.request_id]);
    await conn.commit();
    res.status(201).json({
      file_id: result.insertId,
      original_filename: originalFilename,
      mime_type: req.file.mimetype || 'application/octet-stream',
      file_size: req.file.size,
      can_delete: true,
      version: Number(row.version) + 1
    });
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (absolutePath) await fs.rm(absolutePath, { force: true }).catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally { conn.release(); }
});

router.get('/:id/files/:fileId/download', async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT r.applicant_user_id, r.status, r.approved_order_id, r.target_order_id,
              f.original_filename, f.stored_path, f.mime_type,
              EXISTS(
                SELECT 1 FROM project_files pf
                WHERE pf.order_id = COALESCE(r.approved_order_id, r.target_order_id)
                  AND pf.category = 'order_attachment'
                  AND pf.filepath = CONCAT(?, '/', f.stored_path)
              ) AS linked_to_lims
       FROM order_request_files f
       JOIN order_requests r ON r.request_id = f.request_id
       WHERE f.request_id = ? AND f.file_id = ? AND f.file_type = 'user_upload'`,
      [uploadsRoot.replace(/\\/g, '/'), req.params.id, req.params.fileId]
    );
    if (!row) return res.status(404).json({ message: '附件不存在' });
    if (!canAccessRequest(row, req.user)) return res.status(403).json({ message: '无权下载该申请附件' });
    if ((row.approved_order_id || row.target_order_id) && row.status === 'approved' && !row.linked_to_lims) {
      return res.status(404).json({ message: '附件已在 LIMS 中删除' });
    }
    const absolutePath = resolveUploadPath(row.stored_path);
    await fs.access(absolutePath);
    res.type(row.mime_type || 'application/octet-stream');
    res.download(absolutePath, row.original_filename);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ message: '附件文件不存在' });
    next(error);
  }
});

router.delete('/:id/files/:fileId', async (req, res, next) => {
  const conn = await pool.getConnection();
  let absolutePath = null;
  let quarantinePath = null;
  try {
    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT r.request_id, r.applicant_user_id, r.status, r.version, f.file_id, f.stored_path
       FROM order_requests r
       JOIN order_request_files f ON f.request_id = r.request_id
       WHERE r.request_id = ? AND f.file_id = ? AND f.file_type = 'user_upload'
       FOR UPDATE`,
      [req.params.id, req.params.fileId]
    );
    if (!row) throw Object.assign(new Error('附件不存在'), { status: 404 });
    if (!canAccessRequest(row, req.user)) throw Object.assign(new Error('无权删除该申请附件'), { status: 403 });
    const reviewer = isReviewer(req.user);
    const canDelete = row.status === 'submitted' || (row.status === 'returned' && !reviewer);
    if (!canDelete) throw Object.assign(new Error('审批通过后的附件请在 LIMS 中删除'), { status: 409 });

    absolutePath = resolveUploadPath(row.stored_path);
    quarantinePath = `${absolutePath}.deleting-${crypto.randomBytes(6).toString('hex')}`;
    try {
      await fs.rename(absolutePath, quarantinePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      quarantinePath = null;
    }
    await conn.query('DELETE FROM order_request_files WHERE file_id = ?', [row.file_id]);
    await conn.query('UPDATE order_requests SET version = version + 1 WHERE request_id = ?', [row.request_id]);
    await conn.commit();
    if (quarantinePath) await fs.rm(quarantinePath, { force: true });
    res.json({ ok: true, version: Number(row.version) + 1 });
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (quarantinePath && absolutePath) await fs.rename(quarantinePath, absolutePath).catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally { conn.release(); }
});

router.post('/:id/generate-pdf', async (req, res, next) => {
  const conn = await pool.getConnection();
  const createdPaths = [];
  let lockName = null;
  let lockAcquired = false;
  let committed = false;
  try {
    const [[row]] = await conn.query(
      `SELECT r.request_id, r.applicant_user_id, r.status, r.request_type, r.approved_order_id,
              r.target_order_id, r.applied_at, r.reviewed_payload, r.submitted_payload,
              r.attachment_file_id, r.sample_flow_token,
              attachment.original_filename AS attachment_filename, attachment.created_at AS attachment_created_at
       FROM order_requests r
       LEFT JOIN order_request_files attachment ON attachment.file_id = r.attachment_file_id
       WHERE r.request_id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ message: '申请不存在' });
    if (!canAccessRequest(row, req.user)) return res.status(403).json({ message: '无权生成该委托单 PDF' });
    const orderIdValue = String(row.approved_order_id || row.target_order_id || '').trim();
    const requestReady = row.status === 'approved'
      && orderIdValue
      && (row.request_type !== 'additional_test' || Boolean(row.applied_at));
    if (!requestReady) {
      return res.status(409).json({ message: row.request_type === 'additional_test' ? '加测项目完成正式录入后才能生成 PDF' : '申请通过并取得正式委托单号后才能生成 PDF' });
    }

    lockName = `order_request_pdf_${orderIdValue}`;
    const [[lockResult]] = await conn.query('SELECT GET_LOCK(?, 0) AS acquired', [lockName]);
    lockAcquired = Number(lockResult?.acquired) === 1;
    if (!lockAcquired) return res.status(409).json({ message: '该委托单正在生成 PDF，请稍后刷新' });

    const [[baseRequest]] = await conn.query(
      `SELECT request_id, applicant_user_id, reviewed_payload, submitted_payload, sample_flow_token
       FROM order_requests
       WHERE request_type = 'normal' AND approved_order_id = ? AND status = 'approved'
       ORDER BY request_id LIMIT 1`,
      [orderIdValue]
    );
    if (!baseRequest) return res.status(409).json({ message: '未找到该正式委托单的原始申请' });
    const baseReviewedPayload = parseJson(baseRequest.reviewed_payload);
    const baseSubmittedPayload = parseJson(baseRequest.submitted_payload);
    const [[latestModification]] = await conn.query(
      `SELECT reviewed_payload, submitted_payload, reviewed_at
       FROM order_requests
       WHERE target_order_id = ? AND request_type = 'modification' AND status = 'approved'
       ORDER BY reviewed_at DESC, request_id DESC LIMIT 1`,
      [orderIdValue]
    );
    const [additionalTests] = await conn.query(
      `SELECT submitted_payload, reviewed_payload, reviewed_at, applied_at
       FROM order_requests
       WHERE target_order_id = ? AND request_type = 'additional_test'
         AND status = 'approved' AND applied_at IS NOT NULL
       ORDER BY applied_at, request_id`,
      [orderIdValue]
    );
    const modificationPayload = parseJson(latestModification?.reviewed_payload) || parseJson(latestModification?.submitted_payload);
    const payload = modificationPayload || baseReviewedPayload || baseSubmittedPayload || {};
    const salesperson = await syncRequestSalesperson(conn, payload);
    if (!salesperson) return res.status(409).json({ message: '当前付款方未绑定有效的服务方联系人，无法生成带电子签名的 PDF' });
    const templateData = buildOrderRequestPdfTemplateData(
      modificationPayload || baseReviewedPayload,
      baseSubmittedPayload,
      orderIdValue,
      additionalTests.map((item) => parseJson(item.reviewed_payload) || parseJson(item.submitted_payload) || {})
    );
    if (!templateData) return res.status(400).json({ message: '申请中缺少委托单模板数据' });
    if (!Array.isArray(templateData.testItems) || !templateData.testItems.length) {
      return res.status(400).json({ message: '申请中缺少业务填写的检测项目快照，无法生成 PDF' });
    }

    const [testItems] = await conn.query(
      `SELECT test_item_id FROM test_items WHERE order_id = ? ORDER BY test_item_id`,
      [orderIdValue]
    );
    if (!testItems.length) {
      return res.status(409).json({ message: '正式委托单下没有检测项目，无法关联附件' });
    }
    const latestChangeAt = [latestModification?.reviewed_at, ...additionalTests.map((item) => item.applied_at)]
      .filter(Boolean)
      .reduce((latest, value) => Math.max(latest, new Date(value).getTime()), 0);
    const [[currentPdf]] = await conn.query(
      `SELECT f.file_id, f.original_filename, f.stored_path, f.created_at
       FROM order_request_files f
       JOIN order_requests owner_request ON owner_request.request_id = f.request_id
       WHERE f.file_type = 'application_pdf'
         AND COALESCE(owner_request.approved_order_id, owner_request.target_order_id) = ?
         AND EXISTS(
           SELECT 1 FROM project_files pf
           WHERE pf.order_id = ? AND pf.category = 'order_attachment'
             AND pf.filepath LIKE CONCAT('%/', f.stored_path)
         )
       ORDER BY f.created_at DESC, f.file_id DESC LIMIT 1`,
      [orderIdValue, orderIdValue]
    );
    const pdfIsCurrent = currentPdf?.created_at
      && new Date(currentPdf.created_at).getTime() >= latestChangeAt;
    if (currentPdf && pdfIsCurrent) {
      const [[linkedFile]] = await conn.query(
        `SELECT COUNT(DISTINCT test_item_id) AS linked_count
         FROM project_files pf
         WHERE pf.order_id = ?
           AND pf.category = 'order_attachment'
           AND pf.test_item_id IS NOT NULL
           AND pf.filepath LIKE CONCAT('%/', ?)`,
        [orderIdValue, currentPdf.stored_path]
      );
      if (Number(linkedFile?.linked_count || 0) >= testItems.length) {
        return res.json({
          ok: true,
          already_generated: true,
          file_id: currentPdf.file_id,
          filename: currentPdf.original_filename
        });
      }
    }

    const orderId = safeFilePart(orderIdValue, '委托单');
    const hasAdditionalTest = additionalTests.length > 0;
    let filenameSource = currentPdf;
    if (!filenameSource) {
      [[filenameSource]] = await conn.query(
        `SELECT f.original_filename
         FROM order_request_files f
         JOIN order_requests owner_request ON owner_request.request_id = f.request_id
         WHERE f.file_type = 'application_pdf'
           AND COALESCE(owner_request.approved_order_id, owner_request.target_order_id) = ?
         ORDER BY f.created_at DESC, f.file_id DESC LIMIT 1`,
        [orderIdValue]
      );
    }
    const existingStem = filenameSource?.original_filename
      ? path.basename(filenameSource.original_filename, path.extname(filenameSource.original_filename)).replace(/-加测$/, '')
      : '';
    const customerName = safeFilePart(baseSubmittedPayload?.formSnapshot?.selectedCustomer?.customer_name, '委托方');
    const contactName = safeFilePart(baseSubmittedPayload?.formSnapshot?.selectedCustomer?.contact_name, '联系人');
    const stableBaseName = safeFilePart(existingStem, `${orderId}-${customerName}-${contactName}`);
    const baseName = `${stableBaseName}${hasAdditionalTest ? '-加测' : ''}`;
    const relativeDir = path.join('order-requests', orderId);
    const absoluteDir = path.join(__dirname, '..', '..', 'uploads', relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });
    const { storageBaseName, docxPath, pdfPath } = await nextVersionedPdfPaths(absoluteDir, baseName);
    createdPaths.push(docxPath, pdfPath);

    const sampleFlowToken = baseRequest.sample_flow_token || row.sample_flow_token || `SF_${crypto.randomBytes(18).toString('base64url')}`;

    const docxBuffer = await generateOrderTemplateBuffer(templateData);
    await fs.writeFile(docxPath, docxBuffer);
    const conversion = await convertDocxToPdf(docxPath, pdfPath);
    const qrResult = await addSampleFlowQrToPdf(pdfPath, sampleFlowToken);
    const pdfStat = await fs.stat(pdfPath);
    if (!pdfStat.size) throw new Error('生成的 PDF 文件为空');

    const filename = `${baseName}.pdf`;
    const storedPath = path.posix.join('order-requests', orderId, `${storageBaseName}.pdf`);
    const projectFilepath = pdfPath.replace(/\\/g, '/');

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
    const [generatedPdfFiles] = await conn.query(
      `SELECT DISTINCT f.stored_path
       FROM order_request_files f
       JOIN order_requests owner_request ON owner_request.request_id = f.request_id
       WHERE f.file_type = 'application_pdf' AND f.file_id <> ?
         AND COALESCE(owner_request.approved_order_id, owner_request.target_order_id) = ?`,
      [fileResult.insertId, orderIdValue]
    );
    const previousProjectPaths = generatedPdfFiles
      .map((file) => resolveUploadPath(file.stored_path).replace(/\\/g, '/'))
      .filter(Boolean);
    if (previousProjectPaths.length) {
      await conn.query(
        `DELETE FROM project_files
         WHERE order_id = ? AND category = 'order_attachment'
           AND filepath IN (${previousProjectPaths.map(() => '?').join(',')})`,
        [orderIdValue, ...previousProjectPaths]
      );
    }
    for (const testItem of testItems) {
      await conn.query(
        `INSERT INTO project_files
          (category, filename, filepath, order_id, test_item_id, sample_id, uploaded_by)
         VALUES ('order_attachment', ?, ?, ?, ?, NULL, ?)`,
        [filename, projectFilepath, orderIdValue, testItem.test_item_id, req.user.user_id]
      );
    }
    await conn.query(
      `UPDATE order_requests
       SET attachment_file_id = ?, sample_flow_token = ?, version = version + 1
       WHERE request_id = ?`,
      [fileResult.insertId, sampleFlowToken, row.request_id]
    );
    if (baseRequest.request_id !== row.request_id && !baseRequest.sample_flow_token) {
      await conn.query(
        `UPDATE order_requests SET sample_flow_token = ? WHERE request_id = ?`,
        [sampleFlowToken, baseRequest.request_id]
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
    row.reserved_order_id = extractReservedOrderId(row.reviewed_payload) || null;
    row.display_order_id = row.approved_order_id || row.target_order_id || row.reserved_order_id || null;
    row.order_opened = row.request_type === 'normal'
      ? Boolean(row.approved_order_id)
      : row.request_type === 'modification'
        ? row.status === 'approved'
        : Boolean(row.applied_at);
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
  let lockName = null;
  let lockAcquired = false;
  try {
    const expectedVersion = Number(req.body?.version);
    if (!Number.isInteger(expectedVersion)) {
      return res.status(400).json({ message: '申请版本信息缺失，请刷新后重试' });
    }

    const [[candidate]] = await conn.query(
      `SELECT request_id, status, request_type, target_order_id, version, submitted_at, submitted_payload
       FROM order_requests WHERE request_id = ?`,
      [req.params.id]
    );
    if (!candidate) return res.status(404).json({ message: '申请不存在' });
    if (candidate.status !== 'submitted') return res.status(409).json({ message: '该申请已被处理，不能重复通过' });
    if (candidate.request_type !== 'normal') {
      await conn.beginTransaction();
      const [[followUp]] = await conn.query(
        `SELECT request_id, status, request_type, target_order_id, version, submitted_payload
         FROM order_requests WHERE request_id = ? FOR UPDATE`,
        [req.params.id]
      );
      if (!followUp || followUp.status !== 'submitted') throw Object.assign(new Error('该申请已被处理'), { status: 409 });
      if (Number(followUp.version) !== expectedVersion) throw Object.assign(new Error('申请已被业务修改，请刷新后重新审核'), { status: 409 });
      const payload = parseJson(followUp.submitted_payload) || {};
      if (followUp.request_type === 'modification') {
        await applyOrderModification(conn, followUp.target_order_id, payload);
        await linkRequestFilesToLims(conn, followUp.request_id, followUp.target_order_id);
      }
      const reviewedPayload = {
        ...payload,
        workflow: { ...(payload.workflow || {}), approvedAt: new Date().toISOString(), targetOrderId: followUp.target_order_id }
      };
      if (followUp.request_type === 'additional_test') {
        reviewedPayload.formSnapshot = reviewedPayload.formSnapshot || {};
        reviewedPayload.formSnapshot.formData = {
          ...(reviewedPayload.formSnapshot.formData || {}),
          orderNum: followUp.target_order_id,
          testItems: []
        };
      }
      await conn.query(
        `UPDATE order_requests
         SET status = 'approved', reviewer_user_id = ?, reviewed_payload = ?, applied_at = ?,
             review_note = ?, reviewed_at = CURRENT_TIMESTAMP(3), version = version + 1
         WHERE request_id = ?`,
        [
          req.user.user_id, JSON.stringify(reviewedPayload),
          followUp.request_type === 'modification' ? new Date() : null,
          String(req.body?.note || '').trim() || null, followUp.request_id
        ]
      );
      await addEvent(conn, followUp.request_id, req.user.user_id, 'approved', followUp.target_order_id);
      await conn.commit();
      return res.json({ ok: true, status: 'approved', orderNum: followUp.target_order_id, requestType: followUp.request_type, requiresOpen: followUp.request_type === 'additional_test', version: expectedVersion + 1 });
    }
    const prefix = targetOrderPrefix(candidate.submitted_at, candidate.submitted_payload);
    lockName = `order_number_${prefix}`;
    const [[lockResult]] = await conn.query('SELECT GET_LOCK(?, 5) AS acquired', [lockName]);
    lockAcquired = Number(lockResult?.acquired) === 1;
    if (!lockAcquired) return res.status(409).json({ message: '系统正在分配同月份委托单号，请稍后重试' });

    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT request_id, status, approved_order_id, version, submitted_at, submitted_payload
       FROM order_requests WHERE request_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!row) throw Object.assign(new Error('申请不存在'), { status: 404 });
    if (row.status !== 'submitted' || row.approved_order_id) {
      throw Object.assign(new Error('该申请已被处理，不能重复通过'), { status: 409 });
    }
    if (Number(row.version) !== expectedVersion) {
      throw Object.assign(new Error('申请已被业务修改，请刷新后重新审核'), { status: 409 });
    }

    const [orderRows] = await conn.query(
      `SELECT order_id FROM orders WHERE order_id LIKE ? FOR UPDATE`,
      [`${prefix}%`]
    );
    const [requestRows] = await conn.query(
      `SELECT request_id, status, submitted_at, submitted_payload, reviewed_payload, approved_order_id
       FROM order_requests
       FOR UPDATE`
    );
    const reservedOrderId = allocateOrderId({
      prefix,
      targetRequestId: row.request_id,
      orderIds: orderRows.map((item) => item.order_id),
      requestRows
    });
    const approvedAt = new Date().toISOString();
    const approvedPayload = buildApprovedPayload(row.submitted_payload, reservedOrderId, approvedAt);
    await conn.query(
      `UPDATE order_requests
       SET status = 'approved', reviewer_user_id = ?, reviewed_payload = ?,
           review_note = ?, reviewed_at = CURRENT_TIMESTAMP(3), version = version + 1
       WHERE request_id = ?`,
      [
        req.user.user_id,
        JSON.stringify(approvedPayload),
        String(req.body?.note || '').trim() || null,
        row.request_id
      ]
    );
    await addEvent(conn, row.request_id, req.user.user_id, 'approved', reservedOrderId);
    await conn.commit();
    res.json({ ok: true, status: 'approved', orderNum: reservedOrderId, version: expectedVersion + 1 });
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally {
    if (lockAcquired) await conn.query('SELECT RELEASE_LOCK(?)', [lockName]).catch(() => {});
    conn.release();
  }
});

router.post('/:id/open', requireReviewer, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const reviewedPayload = req.body?.payload;
    const commissionData = reviewedPayload?.commissionData;
    const expectedVersion = Number(req.body?.version);
    if (!commissionData) return res.status(400).json({ message: '缺少正式开单内容' });
    if (!Number.isInteger(expectedVersion)) return res.status(400).json({ message: '申请版本信息缺失，请刷新后重试' });

    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT request_id, status, request_type, target_order_id, approved_order_id, applied_at, reviewed_payload, version
       FROM order_requests WHERE request_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!row) throw Object.assign(new Error('申请不存在'), { status: 404 });
    if (row.status !== 'approved') throw Object.assign(new Error('申请尚未审批通过，不能开单'), { status: 409 });
    if ((row.request_type === 'normal' && row.approved_order_id) || (row.request_type === 'additional_test' && row.applied_at)) {
      throw Object.assign(new Error(row.request_type === 'additional_test' ? '该加测申请已经完成录入' : '该申请已经完成开单'), { status: 409 });
    }
    if (Number(row.version) !== expectedVersion) {
      throw Object.assign(new Error('申请内容已发生变化，请刷新后重新开单'), { status: 409 });
    }
    const reservedOrderId = row.request_type === 'additional_test'
      ? row.target_order_id
      : extractReservedOrderId(row.reviewed_payload);
    if (!reservedOrderId) throw Object.assign(new Error('申请缺少关联的委托单号，请重新审批'), { status: 409 });

    commissionData.orderInfo = { ...(commissionData.orderInfo || {}), order_num: reservedOrderId };
    reviewedPayload.workflow = {
      ...(parseJson(row.reviewed_payload)?.workflow || {}),
      ...(reviewedPayload.workflow || {}),
      reservedOrderId,
      openedAt: new Date().toISOString()
    };
    reviewedPayload.templateData = { ...(reviewedPayload.templateData || {}), order_num: reservedOrderId };
    reviewedPayload.formSnapshot = reviewedPayload.formSnapshot || {};
    reviewedPayload.formSnapshot.formData = {
      ...(reviewedPayload.formSnapshot.formData || {}),
      orderNum: reservedOrderId
    };

    const salesperson = await syncRequestSalesperson(conn, reviewedPayload);
    if (!salesperson) {
      throw Object.assign(new Error('所选付款方未绑定有效的服务方联系人，无法添加电子签名'), { status: 400 });
    }
    const result = row.request_type === 'additional_test'
      ? { orderNum: reservedOrderId, testItemIds: await appendOrderTestItems(conn, reservedOrderId, reviewedPayload, req.user.user_id) }
      : await createCommissionFromPayload(commissionData, {
          connection: conn,
          operatorUserId: req.user.user_id
        });
    await linkRequestFilesToLims(conn, row.request_id, result.orderNum);
    if (row.request_type === 'additional_test') {
      await conn.query(
        `UPDATE order_requests SET reviewed_payload = ?, applied_at = CURRENT_TIMESTAMP(3), version = version + 1 WHERE request_id = ?`,
        [JSON.stringify(reviewedPayload), row.request_id]
      );
    } else {
      await conn.query(
        `UPDATE order_requests SET reviewed_payload = ?, approved_order_id = ?, applied_at = CURRENT_TIMESTAMP(3), version = version + 1 WHERE request_id = ?`,
        [JSON.stringify(reviewedPayload), result.orderNum, row.request_id]
      );
    }
    await addEvent(conn, row.request_id, req.user.user_id, 'opened', result.orderNum);
    await conn.commit();
    res.json({ ok: true, status: 'approved', orderNum: result.orderNum, version: expectedVersion + 1 });
  } catch (error) {
    await conn.rollback().catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally { conn.release(); }
});

module.exports = { router };
