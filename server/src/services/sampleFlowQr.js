const fs = require('fs').promises;
const QRCode = require('qrcode');
const { PDFDocument } = require('pdf-lib');

const DEFAULT_SCAN_URL = 'http://192.168.9.46:3003/sample-flow/scan';
const MM_TO_POINTS = 72 / 25.4;

function buildSampleFlowScanUrl(flowToken) {
  const baseUrl = String(process.env.SAMPLE_FLOW_SCAN_URL || DEFAULT_SCAN_URL).trim();
  if (!baseUrl) throw new Error('未配置样品流转二维码扫码地址');
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}token=${encodeURIComponent(flowToken)}`;
}

async function addSampleFlowQrToPdf(pdfPath, flowToken) {
  const scanUrl = buildSampleFlowScanUrl(flowToken);
  const qrBuffer = await QRCode.toBuffer(scanUrl, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#000000', light: '#FFFFFF' }
  });

  const source = await fs.readFile(pdfPath);
  const pdf = await PDFDocument.load(source);
  const qrImage = await pdf.embedPng(qrBuffer);

  // 约 15 mm：略高于页脚两行文字，同时保留足够的打印扫码清晰度。
  const qrSize = 15 * MM_TO_POINTS;
  const rightMargin = 30;
  const footerTextWidth = 92;
  const gap = 8;
  const bottom = 20;

  for (const page of pdf.getPages()) {
    const { width } = page.getSize();
    page.drawImage(qrImage, {
      x: Math.max(10, width - rightMargin - footerTextWidth - gap - qrSize),
      y: bottom,
      width: qrSize,
      height: qrSize
    });
  }

  await fs.writeFile(pdfPath, await pdf.save());
  return { scanUrl, pageCount: pdf.getPageCount() };
}

module.exports = { addSampleFlowQrToPdf, buildSampleFlowScanUrl };
