const fs = require('fs').promises;
const { PDFDocument, rgb } = require('pdf-lib');

const MM_TO_POINTS = 72 / 25.4;
const HEADER_COPY_HEIGHT = 38 * MM_TO_POINTS;
const HEADER_VISIBLE_HEIGHT = 29 * MM_TO_POINTS;
const SIDE_MARGIN = 14 * MM_TO_POINTS;
const TOP_GAP = 7 * MM_TO_POINTS;
const BOTTOM_MARGIN = 12 * MM_TO_POINTS;

function detectSupportedImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return null;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (isPng) return { extension: '.png', mimeType: 'image/png', pdfType: 'png' };
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return { extension: '.jpg', mimeType: 'image/jpeg', pdfType: 'jpeg' };
  return null;
}

async function appendRequestImagesToPdf(pdfPath, attachments = []) {
  if (!attachments.length) return { appendedPageCount: 0 };

  const source = await fs.readFile(pdfPath);
  const pdf = await PDFDocument.load(source);
  const sourcePages = pdf.getPages();
  if (!sourcePages.length) throw new Error('生成的 PDF 没有可用页面');

  const firstPage = sourcePages[0];
  const { width: pageWidth, height: pageHeight } = firstPage.getSize();
  const headerCopyHeight = Math.min(HEADER_COPY_HEIGHT, pageHeight * 0.24);
  const headerVisibleHeight = Math.min(HEADER_VISIBLE_HEIGHT, headerCopyHeight);
  const embeddedHeader = await pdf.embedPage(firstPage, {
    left: 0,
    bottom: pageHeight - headerCopyHeight,
    right: pageWidth,
    top: pageHeight
  });

  for (const attachment of attachments) {
    const imageBuffer = attachment.buffer || await fs.readFile(attachment.absolutePath);
    const detected = detectSupportedImageType(imageBuffer);
    if (!detected) throw new Error(`附件图片“${attachment.originalFilename || '未命名'}”不是受支持的 PNG/JPG 图片`);
    const image = detected.pdfType === 'png'
      ? await pdf.embedPng(imageBuffer)
      : await pdf.embedJpg(imageBuffer);
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawPage(embeddedHeader, {
      x: 0,
      y: pageHeight - headerCopyHeight,
      width: pageWidth,
      height: headerCopyHeight
    });
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerCopyHeight,
      width: pageWidth,
      height: headerCopyHeight - headerVisibleHeight,
      color: rgb(1, 1, 1)
    });

    const availableWidth = pageWidth - SIDE_MARGIN * 2;
    const availableHeight = pageHeight - headerVisibleHeight - TOP_GAP - BOTTOM_MARGIN;
    const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    page.drawImage(image, {
      x: (pageWidth - drawWidth) / 2,
      y: BOTTOM_MARGIN + (availableHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight
    });
  }

  await fs.writeFile(pdfPath, await pdf.save());
  return { appendedPageCount: attachments.length };
}

module.exports = { appendRequestImagesToPdf, detectSupportedImageType };
