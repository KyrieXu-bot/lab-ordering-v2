const path = require('path');
const fs = require('fs').promises;
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { signaturePathForUser } = require('./salesSignature');

const templatePath = path.join(__dirname, '..', '..', 'templates', 'order_template.docx');

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function readPngSize(buffer) {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!Buffer.isBuffer(buffer) || buffer.length < 24 || !buffer.subarray(0, 8).equals(pngHeader)) {
    throw new Error('电子签名文件不是有效的 PNG 图片');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height) throw new Error('电子签名 PNG 尺寸无效');
  return { width, height };
}

function signatureExtent(buffer) {
  const { width, height } = readPngSize(buffer);
  const maxWidthPx = 120;
  const maxHeightPx = 38;
  const scale = Math.min(maxWidthPx / width, maxHeightPx / height, 1);
  return {
    cx: Math.round(width * scale * 9525),
    cy: Math.round(height * scale * 9525)
  };
}

function nextRelationshipId(relsXml) {
  const used = new Set(Array.from(relsXml.matchAll(/Id="rId(\d+)"/g), match => Number(match[1])));
  let next = 1;
  while (used.has(next)) next += 1;
  return `rId${next}`;
}

function nextDrawingId(documentXml) {
  const ids = Array.from(documentXml.matchAll(/<wp:docPr[^>]*\bid="(\d+)"/g), match => Number(match[1]));
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

function textRun(text, options = {}) {
  const underline = options.underline ? '<w:u w:val="single"/>' : '';
  return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="宋体" w:hAnsi="Times New Roman"/><w:sz w:val="18"/><w:szCs w:val="18"/>${underline}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function drawingRun(relationshipId, drawingId, cx, cy, description) {
  return `<w:r><w:rPr><w:position w:val="-3"/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${drawingId}" name="Electronic signature ${drawingId}" descr="${escapeXml(description)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="electronic-signature.png" descr="${escapeXml(description)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

async function injectRepresentativeSignature(zip, templateData) {
  const documentPart = zip.file('word/document.xml');
  if (!documentPart) throw new Error('委托单模板缺少 word/document.xml');
  let documentXml = documentPart.asText();
  const markerIndex = documentXml.indexOf('Representative/Date:');
  if (markerIndex < 0) throw new Error('委托单模板缺少 Representative/Date 签名区域');
  const paragraphStart = documentXml.lastIndexOf('<w:p ', markerIndex);
  const paragraphEnd = documentXml.indexOf('</w:p>', markerIndex);
  if (paragraphStart < 0 || paragraphEnd < 0) throw new Error('无法定位委托单签名段落');

  let paragraphXml = documentXml.slice(paragraphStart, paragraphEnd + 6);
  paragraphXml = paragraphXml.replace(
    /<w:r>(?:(?!<\/w:r>)[\s\S])*?<w:u w:val="single"\/>[\s\S]*?<w:t xml:space="preserve">\s*<\/w:t><\/w:r>/,
    ''
  );

  const userId = String(templateData?.sales_user_id || '').trim();
  const representativeName = String(templateData?.sales_name || userId || '').trim();
  const signatureDate = String(templateData?.sales_signature_date || '').trim();
  const signaturePath = signaturePathForUser(userId);
  let signatureBuffer = null;
  if (signaturePath) {
    try {
      signatureBuffer = await fs.readFile(signaturePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  let signatureContent = '';
  if (signatureBuffer) {
    const relsPartName = 'word/_rels/document.xml.rels';
    const relsPart = zip.file(relsPartName);
    if (!relsPart) throw new Error('委托单模板缺少 document.xml.rels');
    let relsXml = relsPart.asText();
    const relationshipId = nextRelationshipId(relsXml);
    const safeUserId = userId.replace(/[^A-Za-z0-9_-]/g, '_');
    const mediaFilename = `electronic-signature-${safeUserId}.png`;
    relsXml = relsXml.replace(
      '</Relationships>',
      `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaFilename}"/></Relationships>`
    );
    zip.file(relsPartName, relsXml);
    zip.file(`word/media/${mediaFilename}`, signatureBuffer);

    const contentTypesPart = zip.file('[Content_Types].xml');
    let contentTypesXml = contentTypesPart.asText();
    if (!/<Default[^>]+Extension="png"/i.test(contentTypesXml)) {
      contentTypesXml = contentTypesXml.replace(
        '</Types>',
        '<Default Extension="png" ContentType="image/png"/></Types>'
      );
      zip.file('[Content_Types].xml', contentTypesXml);
    }

    const { cx, cy } = signatureExtent(signatureBuffer);
    signatureContent = drawingRun(
      relationshipId,
      nextDrawingId(documentXml),
      cx,
      cy,
      `${representativeName || userId}的电子签名`
    );
  } else {
    signatureContent = textRun(representativeName ? ` ${representativeName} ` : '                    ', { underline: true });
  }

  const dateContent = signatureDate ? textRun(`  ${signatureDate}`, { underline: true }) : '';
  paragraphXml = paragraphXml.replace('</w:p>', `${signatureContent}${dateContent}</w:p>`);
  documentXml = `${documentXml.slice(0, paragraphStart)}${paragraphXml}${documentXml.slice(paragraphEnd + 6)}`;
  zip.file('word/document.xml', documentXml);
}

async function generateOrderTemplateBuffer(templateData) {
  const templateBuffer = await fs.readFile(templatePath);
  if (!templateBuffer.length) throw new Error('委托单模板文件为空');
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip);
  doc.render(templateData);
  await injectRepresentativeSignature(doc.getZip(), templateData);
  return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = { generateOrderTemplateBuffer, injectRepresentativeSignature, readPngSize, templatePath };
