const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const { appendRequestImagesToPdf, detectSupportedImageType } = require('./orderAttachmentImages');

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test('附件图片只接受真实 PNG/JPEG 文件头', () => {
  assert.equal(detectSupportedImageType(PNG_1X1).mimeType, 'image/png');
  assert.equal(detectSupportedImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])).mimeType, 'image/jpeg');
  assert.equal(detectSupportedImageType(Buffer.from('not-an-image')), null);
});

test('每张附件图片追加为独立 PDF 页面并保持原页面尺寸', async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ordering-image-pdf-'));
  t.after(() => fs.rm(tempDir, { recursive: true, force: true }));
  const pdfPath = path.join(tempDir, 'order.pdf');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  page.drawRectangle({ x: 0, y: 730, width: 595.28, height: 111.89, color: rgb(0.9, 0.95, 0.92) });
  await fs.writeFile(pdfPath, await pdf.save());

  const result = await appendRequestImagesToPdf(pdfPath, [
    { originalFilename: '样品1.png', buffer: PNG_1X1 },
    { originalFilename: '样品2.png', buffer: PNG_1X1 }
  ]);
  const output = await PDFDocument.load(await fs.readFile(pdfPath));
  assert.equal(result.appendedPageCount, 2);
  assert.equal(output.getPageCount(), 3);
  for (const appendedPage of output.getPages().slice(1)) {
    assert.deepEqual(appendedPage.getSize(), page.getSize());
  }
});
