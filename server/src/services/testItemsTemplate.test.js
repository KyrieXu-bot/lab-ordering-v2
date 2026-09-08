const test = require('node:test');
const assert = require('node:assert/strict');
const PizZip = require('pizzip');
const { buildTestItemsTemplateData, generateTestItemsTemplateBuffer } = require('./testItemsTemplate');

test('业务检测项目字段兼容前端驼峰和数据库字段', () => {
  const data = buildTestItemsTemplateData([{
    sampleName: '样品A', material: '304', sampleType: 5, sampleTypeCustom: '异形件',
    original_no: 'A-1', test_item: '硬度', test_method: 'GB/T 1', quantity: 2, note: '备注'
  }]);
  assert.deepEqual(data.testItems[0], {
    idx: 1, sample_name: '样品A', material: '304', sampleTypeLabel: '异形件', original_no: 'A-1',
    test_item: '硬度', test_method: 'GB/T 1', quantity: 2, note: '备注'
  });
});

test('业务检测项目 Word 模板可正常渲染', async () => {
  const buffer = await generateTestItemsTemplateBuffer([{
    sample_name: '样品A', material: '304', sample_type: '1', original_no: 'A-001',
    test_item: '硬度', test_method: 'GB/T 1', quantity: '2', note: '优先'
  }]);
  assert.ok(buffer.length > 0);
  const documentXml = new PizZip(buffer).file('word/document.xml').asText();
  assert.match(documentXml, /样品A/);
  assert.match(documentXml, /硬度/);
  assert.doesNotMatch(documentXml, /\{[#/]?testItems\}/);
});
