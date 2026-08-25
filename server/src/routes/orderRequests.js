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

router.get('/', async (req, res, next) => {
  try {
    const reviewer = isReviewer(req.user);
    const paginationRequested = req.query.page !== undefined || req.query.page_size !== undefined;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.page_size, 10) || 20));
    const allowedStatuses = new Set(['submitted', 'approved', 'returned', 'withdrawn']);
    const requestedStatus = String(req.query.status || '').trim();
    if (reviewer && requestedStatus && !allowedStatuses.has(requestedStatus)) {
      return res.status(400).json({ message: '申请状态筛选值不正确' });
    }

    const baseConditions = [];
    const baseParams = [];
    if (!reviewer) {
      baseConditions.push('r.applicant_user_id = ?');
      baseParams.push(req.user.user_id);
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
      `SELECT request_id, applicant_user_id, status, approved_order_id
       FROM order_requests WHERE request_id = ?`,
      [req.params.id]
    );
    if (!requestRow) return res.status(404).json({ message: '申请不存在' });
    if (!canAccessRequest(requestRow, req.user)) return res.status(403).json({ message: '无权查看该申请附件' });

    const [files] = await pool.query(
      `SELECT f.file_id, f.original_filename, f.mime_type, f.file_size, f.created_at,
              EXISTS(
                SELECT 1 FROM project_files pf
                WHERE pf.order_id = r.approved_order_id
                  AND pf.category = 'order_attachment'
                  AND pf.filepath = CONCAT(?, '/', f.stored_path)
              ) AS linked_to_lims
       FROM order_request_files f
       JOIN order_requests r ON r.request_id = f.request_id
       WHERE f.request_id = ? AND f.file_type = 'user_upload'
         AND (r.status <> 'approved' OR EXISTS(
           SELECT 1 FROM project_files visible_pf
           WHERE visible_pf.order_id = r.approved_order_id
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
      `SELECT r.applicant_user_id, r.status, r.approved_order_id,
              f.original_filename, f.stored_path, f.mime_type,
              EXISTS(
                SELECT 1 FROM project_files pf
                WHERE pf.order_id = r.approved_order_id
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
    if (row.status === 'approved' && !row.linked_to_lims) {
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
    const salesperson = await syncRequestSalesperson(conn, payload);
    if (!salesperson) return res.status(409).json({ message: '当前付款方未绑定有效的服务方联系人，无法生成带电子签名的 PDF' });
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
    const projectFilepath = pdfPath.replace(/\\/g, '/');

    await conn.beginTransaction();
    const [[lockedRequest]] = await conn.query(
      `SELECT attachment_file_id, sample_flow_token FROM order_requests WHERE request_id = ? FOR UPDATE`,
      [row.request_id]
    );
    let previousPdfFile = null;
    if (lockedRequest.attachment_file_id) {
      [[previousPdfFile]] = await conn.query(
        `SELECT stored_path FROM order_request_files
         WHERE file_id = ? AND file_type = 'application_pdf'`,
        [lockedRequest.attachment_file_id]
      );
    }

    const [fileResult] = await conn.query(
      `INSERT INTO order_request_files
        (request_id, file_type, original_filename, stored_path, mime_type, file_size, created_by)
       VALUES (?, 'application_pdf', ?, ?, 'application/pdf', ?, ?)`,
      [row.request_id, filename, storedPath, pdfStat.size, req.user.user_id]
    );
    if (previousPdfFile?.stored_path) {
      await conn.query(
        `DELETE FROM project_files
         WHERE order_id = ? AND category = 'order_attachment' AND filepath = ?`,
        [row.approved_order_id, resolveUploadPath(previousPdfFile.stored_path).replace(/\\/g, '/')]
      );
    }
    for (const testItem of testItems) {
      await conn.query(
        `INSERT INTO project_files
          (category, filename, filepath, order_id, test_item_id, sample_id, uploaded_by)
         VALUES ('order_attachment', ?, ?, ?, ?, NULL, ?)`,
        [filename, projectFilepath, row.approved_order_id, testItem.test_item_id, req.user.user_id]
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
    const expectedVersion = Number(req.body?.version);
    if (!approvedOrderId) {
      return res.status(400).json({ message: '审批通过前必须填写正式委托单号' });
    }
    if (!Number.isInteger(expectedVersion)) {
      return res.status(400).json({ message: '申请版本信息缺失，请刷新后重试' });
    }
    commissionData.orderInfo = { ...commissionData.orderInfo, order_num: approvedOrderId };

    await conn.beginTransaction();
    const [[row]] = await conn.query(
      `SELECT request_id, status, approved_order_id, version FROM order_requests WHERE request_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!row) throw Object.assign(new Error('申请不存在'), { status: 404 });
    if (row.status !== 'submitted' || row.approved_order_id) {
      throw Object.assign(new Error('该申请已被处理，不能重复通过'), { status: 409 });
    }
    if (Number(row.version) !== expectedVersion) {
      throw Object.assign(new Error('申请已被业务修改，请刷新后重新审核'), { status: 409 });
    }

    const salesperson = await syncRequestSalesperson(conn, reviewedPayload);
    if (!salesperson) {
      throw Object.assign(new Error('所选付款方未绑定有效的服务方联系人，无法添加电子签名'), { status: 400 });
    }

    const result = await createCommissionFromPayload(commissionData, {
      connection: conn,
      operatorUserId: req.user.user_id
    });
    const [requestFiles] = await conn.query(
      `SELECT original_filename, stored_path, created_by
       FROM order_request_files
       WHERE request_id = ? AND file_type = 'user_upload'
       ORDER BY file_id`,
      [row.request_id]
    );
    if (requestFiles.length) {
      const [testItems] = await conn.query(
        `SELECT test_item_id FROM test_items WHERE order_id = ? ORDER BY test_item_id`,
        [result.orderNum]
      );
      for (const requestFile of requestFiles) {
        const projectFilename = String(requestFile.original_filename || '附件').slice(0, 200);
        const projectFilepath = resolveUploadPath(requestFile.stored_path).replace(/\\/g, '/');
        for (const testItem of testItems) {
          await conn.query(
            `INSERT INTO project_files
              (category, filename, filepath, order_id, test_item_id, sample_id, uploaded_by)
             VALUES ('order_attachment', ?, ?, ?, ?, NULL, ?)`,
            [projectFilename, projectFilepath, result.orderNum, testItem.test_item_id, requestFile.created_by]
          );
        }
      }
    }
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
