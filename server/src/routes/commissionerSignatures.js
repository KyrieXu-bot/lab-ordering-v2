const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const pool = require('../db');
const { requireSales } = require('../middleware/auth');
const {
  commissionerSignaturesDirectory,
  normalizeCommissionerId,
  commissionerSignaturePath,
  commissionerSignatureExists,
  isPngBuffer
} = require('../services/commissionerSignature');

const router = express.Router();
const MAX_SIGNATURE_SIZE = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIGNATURE_SIZE, files: 1 }
}).single('signature');

function receiveSignature(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: '委托方签名图片不能超过 5MB' });
    return res.status(400).json({ message: '签名图片上传失败，请检查文件后重试' });
  });
}

async function findCommissioner(commissionerId) {
  const [[row]] = await pool.query(
    `SELECT commissioner_id FROM commissioners WHERE commissioner_id = ? AND is_active = 1`,
    [commissionerId]
  );
  return row || null;
}

router.get('/:commissionerId', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    const commissionerId = normalizeCommissionerId(req.params.commissionerId);
    if (!commissionerId) return res.status(400).json({ message: '委托方ID不正确' });
    if (!(await findCommissioner(commissionerId))) return res.status(404).json({ message: '委托方不存在或已停用' });
    const signaturePath = commissionerSignaturePath(commissionerId);
    if (!(await commissionerSignatureExists(commissionerId))) {
      return res.status(404).json({ message: '该委托方尚未配置电子签名' });
    }
    res.type('png').sendFile(signaturePath);
  } catch (error) { next(error); }
});

router.post('/:commissionerId', requireSales, receiveSignature, async (req, res, next) => {
  try {
    const commissionerId = normalizeCommissionerId(req.params.commissionerId);
    if (!commissionerId) return res.status(400).json({ message: '委托方ID不正确' });
    if (!req.file) return res.status(400).json({ message: '请选择 PNG 签名图片' });
    if (!isPngBuffer(req.file.buffer)) return res.status(400).json({ message: '委托方签名必须是 PNG 图片' });
    if (!(await findCommissioner(commissionerId))) return res.status(404).json({ message: '委托方不存在或已停用' });
    await fs.mkdir(commissionerSignaturesDirectory, { recursive: true });
    const signaturePath = commissionerSignaturePath(commissionerId);
    const replaced = await commissionerSignatureExists(commissionerId);
    await fs.writeFile(signaturePath, req.file.buffer);
    res.status(201).json({
      ok: true,
      commissioner_id: Number(commissionerId),
      filename: `${commissionerId}.png`,
      replaced
    });
  } catch (error) { next(error); }
});

router.delete('/:commissionerId', requireSales, async (req, res, next) => {
  try {
    const commissionerId = normalizeCommissionerId(req.params.commissionerId);
    if (!commissionerId) return res.status(400).json({ message: '委托方ID不正确' });
    if (!(await findCommissioner(commissionerId))) return res.status(404).json({ message: '委托方不存在或已停用' });
    if (!(await commissionerSignatureExists(commissionerId))) {
      return res.status(404).json({ message: '该委托方尚未配置电子签名' });
    }
    await fs.rm(commissionerSignaturePath(commissionerId), { force: true });
    res.json({ ok: true, commissioner_id: Number(commissionerId) });
  } catch (error) { next(error); }
});

module.exports = { router, MAX_SIGNATURE_SIZE };
