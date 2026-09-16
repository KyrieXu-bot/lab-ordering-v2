const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFlowDocumentFilename,
  buildRequirementDownloadFilename,
  reviewerOrderBySql,
  requestArrivalSummary,
  validateBusinessTestItemArrival,
  linkExistingRequirementsToAddedTests
} = require('./orderRequests');

test('流转单按正式单号和流转单后缀命名', () => {
  assert.equal(
    buildFlowDocumentFilename('JC2609001'),
    'JC2609001-流转单.docx'
  );
  assert.equal(
    buildFlowDocumentFilename('JC/2609001'),
    'JC_2609001-流转单.docx'
  );
});

test('需求单下载时按正式单号命名并保留原后缀', () => {
  assert.equal(
    buildRequirementDownloadFilename('JC2609001', '客户测试需求最终版.xlsx'),
    'JC2609001-需求单.xlsx'
  );
  assert.equal(
    buildRequirementDownloadFilename('JC/2609001', '测试需求.DOCX'),
    'JC_2609001-需求单.DOCX'
  );
  assert.equal(buildRequirementDownloadFilename('JC2609001', '无后缀需求单'), 'JC2609001-需求单');
});

test('开单员申请队列将无正式单号申请置前，其余按正式单号升序', () => {
  const sql = reviewerOrderBySql('DISPLAY_ORDER_ID');
  assert.match(sql, /DISPLAY_ORDER_ID IS NULL/);
  assert.match(sql, /DISPLAY_ORDER_ID ASC/);
  assert.doesNotMatch(sql, /DISPLAY_ORDER_ID DESC/);
});

test('开单员申请队列按业务快照第一行展示到达方式和项目行数', () => {
  assert.deepEqual(requestArrivalSummary({
    formSnapshot: {
      businessTestItems: [
        { arrival_mode: '' },
        { arrival_mode: 'on_site' }
      ]
    }
  }), { arrival_mode: 'on_site', test_item_count: 2 });

  assert.deepEqual(requestArrivalSummary(JSON.stringify({
    commissionData: { testItems: [{ arrival_mode: 'delivery' }] }
  })), { arrival_mode: 'delivery', test_item_count: 1 });
});

test('业务申请的每一行都必须填写到达方式和是否到达', () => {
  assert.equal(validateBusinessTestItemArrival([
    { arrival_mode: '', sample_arrival_status: 'arrived' }
  ]), '第1行：到达方式为必填项');

  assert.equal(validateBusinessTestItemArrival([
    { arrival_mode: 'mail', sample_arrival_status: 'arrived' },
    { arrival_mode: 'on_site', sample_arrival_status: '' }
  ]), '第2行：是否到达为必填项');

  assert.equal(validateBusinessTestItemArrival([
    { arrival_mode: 'delivery', sample_arrival_status: 'not_arrived' },
    { arrival_mode: 'on_site', sample_arrival_status: 'arrived' }
  ]), null);
});

test('加测项目继承原委托单在 LIMS 中仍有效的需求单附件', async () => {
  const inserts = [];
  const connection = {
    async query(sql, params) {
      if (sql.includes('FROM order_request_files f')) {
        assert.deepEqual(params, ['ORDER001', 55, 'ORDER001']);
        assert.match(sql, /EXISTS \(/);
        return [[{
          original_filename: '测试需求.docx',
          stored_path: 'order-request-attachments/1/requirement.docx',
          created_by: 'YW001'
        }]];
      }
      if (sql.includes('INSERT INTO project_files')) {
        inserts.push(params);
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  await linkExistingRequirementsToAddedTests(connection, 'ORDER001', [101, 102], 55);
  assert.equal(inserts.length, 2);
  assert.deepEqual(inserts.map((params) => params[3]), [101, 102]);
  assert.ok(inserts.every((params) => params[2] === 'ORDER001'));
});
