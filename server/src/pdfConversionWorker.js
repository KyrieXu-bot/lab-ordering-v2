const crypto = require('crypto');
const express = require('express');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { convertWithWord } = require('./services/pdfConversion');

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function secureEquals(left, right) {
  const leftHash = crypto.createHash('sha256').update(String(left)).digest();
  const rightHash = crypto.createHash('sha256').update(String(right)).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function createPdfConversionWorker(options = {}) {
  const apiKey = String(options.apiKey || process.env.PDF_WORKER_API_KEY || '').trim();
  if (!apiKey) throw new Error('缺少 PDF_WORKER_API_KEY，拒绝启动 PDF 转换服务');

  const maxFileSizeMb = parsePositiveInteger(process.env.PDF_WORKER_MAX_FILE_SIZE_MB, 20);
  const conversionTimeoutMs = parsePositiveInteger(process.env.PDF_WORKER_TIMEOUT_MS, 120000);
  const convert = options.convert || ((inputPath, outputPath) => (
    convertWithWord(inputPath, outputPath, { timeoutMs: conversionTimeoutMs })
  ));
  const app = express();
  let queueTail = Promise.resolve();
  let queuedJobs = 0;
  let active = false;

  function authenticate(req, res, next) {
    const authorization = String(req.get('authorization') || '');
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!token || !secureEquals(token, apiKey)) return res.status(401).json({ message: '未授权' });
    return next();
  }

  function enqueue(job) {
    queuedJobs += 1;
    const runJob = async () => {
      queuedJobs -= 1;
      active = true;
      try { return await job(); } finally { active = false; }
    };
    const result = queueTail.then(runJob, runJob);
    queueTail = result.catch(() => {});
    return result;
  }

  app.get('/health', authenticate, (_req, res) => {
    res.json({ status: 'ok', engine: 'microsoft-word', active, queuedJobs });
  });

  app.post('/convert', authenticate, express.raw({ type: '*/*', limit: `${maxFileSizeMb}mb` }), async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ message: '请求中没有 DOCX 文件内容' });
    }

    try {
      const pdfBuffer = await enqueue(async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lab-pdf-worker-'));
        const inputPath = path.join(tempDir, 'input.docx');
        const outputPath = path.join(tempDir, 'output.pdf');
        try {
          await fs.writeFile(inputPath, req.body);
          const converted = await convert(inputPath, outputPath);
          if (!converted) throw new Error('当前系统无法调用 Microsoft Word');
          return await fs.readFile(outputPath);
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }
      });
      res.set({
        'content-type': 'application/pdf',
        'content-length': String(pdfBuffer.length),
        'x-pdf-engine': 'microsoft-word'
      });
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('[pdf-worker] conversion failed', error);
      return res.status(500).json({ message: error.message || 'Word 转换失败' });
    }
  });

  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ message: `DOCX 超过 ${maxFileSizeMb}MB 限制` });
    }
    console.error('[pdf-worker] request failed', error);
    return res.status(500).json({ message: 'PDF 转换服务出现错误' });
  });

  return app;
}

module.exports = { createPdfConversionWorker, secureEquals };
