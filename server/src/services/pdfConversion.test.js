const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs').promises;
const http = require('http');
const os = require('os');
const path = require('path');
const { convertWithRemoteService } = require('./pdfConversion');

test('Ubuntu 转换客户端上传 DOCX 并保存 Windows 节点返回的 PDF', async () => {
  const originalUrl = process.env.PDF_CONVERSION_SERVICE_URL;
  const originalKey = process.env.PDF_CONVERSION_SERVICE_KEY;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-remote-test-'));
  const inputPath = path.join(tempDir, '测试委托单.docx');
  const outputPath = path.join(tempDir, 'output.pdf');
  let requestBody = Buffer.alloc(0);
  let authorization = '';

  const server = http.createServer((request, response) => {
    authorization = request.headers.authorization || '';
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      requestBody = Buffer.concat(chunks);
      response.writeHead(200, { 'content-type': 'application/pdf' });
      response.end(Buffer.from('%PDF-1.4\n%%EOF'));
    });
  });

  try {
    await fs.writeFile(inputPath, Buffer.from('docx-content'));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    process.env.PDF_CONVERSION_SERVICE_URL = `http://127.0.0.1:${server.address().port}`;
    process.env.PDF_CONVERSION_SERVICE_KEY = 'remote-test-secret';

    assert.equal(await convertWithRemoteService(inputPath, outputPath), true);
    assert.equal(authorization, 'Bearer remote-test-secret');
    assert.equal(requestBody.toString(), 'docx-content');
    assert.equal((await fs.readFile(outputPath)).subarray(0, 5).toString(), '%PDF-');
  } finally {
    if (originalUrl === undefined) delete process.env.PDF_CONVERSION_SERVICE_URL;
    else process.env.PDF_CONVERSION_SERVICE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.PDF_CONVERSION_SERVICE_KEY;
    else process.env.PDF_CONVERSION_SERVICE_KEY = originalKey;
    await new Promise((resolve) => server.close(() => resolve()));
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
