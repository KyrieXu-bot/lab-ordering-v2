const test = require('node:test');
const assert = require('node:assert/strict');
const PizZip = require('pizzip');
const { HEADERS, buildRejectionSummaryWorkbook } = require('./rejectionSummaryWorkbook');

test('驳回汇总生成带固定七列表头和筛选区域的 xlsx', () => {
  const buffer = buildRejectionSummaryWorkbook([{
    opened_date: '2026-09-29',
    order_id: 'JC2609001',
    request_type: 'modification',
    applicant_name: '申请人甲',
    salesperson_name: '业务员乙',
    submitted_at: '2026-09-29 14:35:27',
    review_note: '未注明委外供应商'
  }]);
  assert.ok(Buffer.isBuffer(buffer));
  const zip = new PizZip(buffer);
  const sheet = zip.file('xl/worksheets/sheet1.xml').asText();
  HEADERS.forEach((header) => assert.match(sheet, new RegExp(header)));
  assert.match(sheet, /JC2609001/);
  assert.match(sheet, /修改/);
  assert.match(sheet, /提交时间/);
  assert.match(sheet, /2026-09-29 14:35:27/);
  assert.match(sheet, /未注明委外供应商/);
  assert.match(sheet, /autoFilter ref="A1:G2"/);
});

test('驳回汇总会转义 Excel XML 中的特殊字符', () => {
  const zip = new PizZip(buildRejectionSummaryWorkbook([{ review_note: '其他：A&B < C' }]));
  const sheet = zip.file('xl/worksheets/sheet1.xml').asText();
  assert.match(sheet, /A&amp;B &lt; C/);
});
