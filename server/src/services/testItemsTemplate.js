const path = require('path');
const fs = require('fs').promises;
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const templatePath = path.resolve(__dirname, '..', '..', 'templates', 'test_template.docx');
const sampleTypeLabels = { 1: '板材', 2: '棒材', 3: '粉末', 4: '液体', 5: '其他' };

function buildTestItemsTemplateData(testItems = []) {
  return {
    testItems: (Array.isArray(testItems) ? testItems : []).map((item, index) => {
      const sampleType = item.sampleType ?? item.sample_type ?? '';
      return {
        idx: index + 1,
        sample_name: item.sampleName ?? item.sample_name ?? '',
        material: item.material ?? '',
        sampleTypeLabel: String(sampleType) === '5'
          ? (item.sampleTypeCustom ?? item.sample_type_custom ?? '其他')
          : (sampleTypeLabels[sampleType] || sampleType),
        original_no: item.original_no ?? item.originalNo ?? '',
        test_item: item.test_item ?? item.testItem ?? '',
        test_method: item.test_method ?? item.testMethod ?? '',
        quantity: item.quantity ?? '',
        note: item.note ?? item.remarks ?? ''
      };
    })
  };
}

async function generateTestItemsTemplateBuffer(testItems) {
  const templateBuffer = await fs.readFile(templatePath);
  if (!templateBuffer.length) throw new Error('业务申请检测项目模板文件为空');
  const doc = new Docxtemplater(new PizZip(templateBuffer), {
    paragraphLoop: true,
    linebreaks: true
  });
  doc.render(buildTestItemsTemplateData(testItems));
  return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = { buildTestItemsTemplateData, generateTestItemsTemplateBuffer, templatePath };
