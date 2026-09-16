const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const PizZip = require('pizzip');
const { generateOrderTemplateBuffer, injectSignatureAtMarker, templatePath } = require('./orderTemplate');

test('委托单模板把检测项目和备注中的换行渲染为 Word 换行符', async () => {
  const buffer = await generateOrderTemplateBuffer({
    sales_name: '测试业务员',
    testItems: [{
      idx: 1,
      test_item: '检测项目第一行\n检测项目第二行',
      note: '备注第一行\n备注第二行'
    }]
  });
  const documentXml = new PizZip(buffer).file('word/document.xml').asText();

  assert.match(documentXml, /检测项目第一行[\s\S]*?<w:br\/>[\s\S]*?检测项目第二行/);
  assert.match(documentXml, /备注第一行[\s\S]*?<w:br\/>[\s\S]*?备注第二行/);
});

test('委托方签名图片被注入 Authorized Signature 区域', async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'commissioner-signature-'));
  t.after(() => fs.rm(tempDir, { recursive: true, force: true }));
  const signaturePath = path.join(tempDir, '2319.png');
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]),
    Buffer.from([0x00, 0x00, 0x00, 0x78, 0x00, 0x00, 0x00, 0x26])
  ]);
  await fs.writeFile(signaturePath, png);
  const zip = new PizZip(await fs.readFile(templatePath));

  await injectSignatureAtMarker(zip, {
    marker: 'Authorized Signature/Date',
    signerId: '2319',
    signerName: '测试委托人',
    signatureDate: '2026-09-09',
    signaturePath,
    mediaPrefix: 'commissioner-signature',
    description: '测试委托方电子签名'
  });

  assert.ok(zip.file('word/media/commissioner-signature-2319.png'));
  const documentXml = zip.file('word/document.xml').asText();
  assert.match(documentXml, /Authorized Signature\/Date[\s\S]*?<w:drawing>/);
  assert.match(documentXml, /2026-09-09/);
});
