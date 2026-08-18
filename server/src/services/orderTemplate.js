const path = require('path');
const fs = require('fs').promises;
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const templatePath = path.join(__dirname, '..', '..', 'templates', 'order_template.docx');

async function generateOrderTemplateBuffer(templateData) {
  const templateBuffer = await fs.readFile(templatePath);
  if (!templateBuffer.length) throw new Error('委托单模板文件为空');
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip);
  doc.render(templateData);
  return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = { generateOrderTemplateBuffer, templatePath };
