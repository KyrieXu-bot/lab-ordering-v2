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

function calculateQrPlacement(pageWidth, pageHeight, options = {}) {
  // 对应 2026 版模板页眉：二维码位于“任务编号 Task number”区域左侧。
  // 纵向首页、横向附录首页和横向续页使用不同页眉，因此分别保留右侧空间。
  const qrSize = 15 * MM_TO_POINTS;
  const topMargin = 7 * MM_TO_POINTS;
  const isLandscape = pageWidth > pageHeight;
  const reservedWidthMm = !isLandscape ? 56 : (options.isFirstLandscapePage ? 71 : 86);
  const rightSideReservedWidth = reservedWidthMm * MM_TO_POINTS;

  return {
    x: Math.max(10, pageWidth - rightSideReservedWidth - qrSize),
    y: Math.max(10, pageHeight - topMargin - qrSize),
    size: qrSize
  };
}

function sampleFlowTokenPersistencePlan(baseRequestId, currentRequestId, baseToken) {
  const isBaseRequest = String(baseRequestId) === String(currentRequestId);
  return {
    writeCurrentToken: isBaseRequest,
    writeBaseToken: !isBaseRequest && !String(baseToken || '').trim()
  };
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

  let landscapePageCount = 0;
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const isLandscape = width > height;
    const placement = calculateQrPlacement(width, height, {
      isFirstLandscapePage: isLandscape && landscapePageCount === 0
    });
    if (isLandscape) landscapePageCount += 1;
    page.drawImage(qrImage, {
      x: placement.x,
      y: placement.y,
      width: placement.size,
      height: placement.size
    });
  }

  await fs.writeFile(pdfPath, await pdf.save());
  return { scanUrl, pageCount: pdf.getPageCount() };
}

module.exports = { addSampleFlowQrToPdf, buildSampleFlowScanUrl, calculateQrPlacement, sampleFlowTokenPersistencePlan };
