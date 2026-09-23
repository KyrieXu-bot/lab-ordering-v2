const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFlowDocumentFilename,
  buildRequirementDownloadFilename,
  appendOrderDateToPdfFilename,
  removeOrderDateFromPdfFilename,
  reviewerOrderBySql,
  canAccessRequest,
  requestArrivalSummary,
  validateBusinessTestItemArrival,
  applicationPrefillPayload,
  cumulativeApplicationItems,
  cumulativeAdditionalItemStates,
  withoutCancelledItems,
  followUpBlocksNewVersion,
  linkExistingRequirementsToAddedTests
} = require('./orderRequests');

test('业务预填优先使用 submitted_payload 而不是开单审核快照', () => {
  assert.deepEqual(applicationPrefillPayload({
    submitted_payload: JSON.stringify({ source: 'sales-application', formSnapshot: { formData: { reportSeals: ['cnas'] } } }),
    reviewed_payload: JSON.stringify({ source: 'lims-entry', formSnapshot: { formData: { reportSeals: [] } } })
  }), {
    source: 'sales-application',
    formSnapshot: { formData: { reportSeals: ['cnas'] } }
  });
});

test('业务预填合并最新修改和已生效加测项目并移除流程锁定', () => {
  const payload = (items) => JSON.stringify({ formSnapshot: { businessTestItems: items } });
  const result = cumulativeApplicationItems([
    { request_id: 3, request_type: 'modification', status: 'approved', submitted_payload: payload([
      { sampleName: '原样', test_item: '原项目', test_method: 'A', quantity: 1 },
      { sampleName: '加测样', test_item: '加测项目', test_method: 'B', quantity: 2, _locked: true, _modificationNameLocked: true }
    ]) },
    { request_id: 2, request_type: 'additional_test', status: 'approved', applied_at: '2026-09-01', submitted_payload: payload([
      { sampleName: '加测样', test_item: '加测项目', test_method: 'B', quantity: 2 }
    ]) },
    { request_id: 1, request_type: 'normal', status: 'approved', submitted_payload: payload([
      { sampleName: '原样', test_item: '原项目', test_method: 'A', quantity: 1 }
    ]) }
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[1]._locked, undefined);
  assert.equal(result[1]._modificationNameLocked, undefined);
});

test('委托单版本链阻止待审批、已驳回待修改和已审批待录入的二次申请并行', () => {
  assert.equal(followUpBlocksNewVersion({ request_type: 'additional_test', status: 'submitted' }), true);
  assert.equal(followUpBlocksNewVersion({ request_type: 'modification', status: 'returned' }), true);
  assert.equal(followUpBlocksNewVersion({ request_type: 'additional_test', status: 'approved', applied_at: null }), true);
  assert.equal(followUpBlocksNewVersion({ request_type: 'additional_test', status: 'approved', applied_at: '2026-09-23' }), false);
  assert.equal(followUpBlocksNewVersion({ request_type: 'modification', status: 'approved' }), false);
  assert.equal(followUpBlocksNewVersion({ request_type: 'normal', status: 'submitted' }), false);
});

test('历次加测按顺序累计项目取消和恢复状态', () => {
  const payload = (items) => JSON.stringify({ formSnapshot: { businessTestItems: items } });
  const rows = [
    {
      request_id: 2, request_type: 'additional_test', status: 'approved', applied_at: '2026-09-22',
      submitted_payload: payload([{ test_item_id: 101, sampleName: '样品A', test_item: '项目A', cancelled_in_additional_test: true, cancelled_at: '2026-09-22T08:00:00Z' }])
    },
    {
      request_id: 3, request_type: 'additional_test', status: 'approved', applied_at: '2026-09-23',
      submitted_payload: payload([{ test_item_id: 101, sampleName: '样品A', test_item: '项目A', restored_in_additional_test: true, restored_at: '2026-09-23T08:00:00Z' }])
    }
  ];

  assert.deepEqual(cumulativeAdditionalItemStates(rows).map((item) => ({
    id: item.test_item_id,
    cancelled: item.cancelled_in_additional_test,
    restored: item.restored_in_additional_test
  })), [{ id: 101, cancelled: false, restored: true }]);
});

test('Word 导出按最终取消状态移除项目，并保留后来恢复的项目', () => {
  const formalItems = [
    { test_item_id: 101, test_item: '取消项目' },
    { test_item_id: 102, test_item: '恢复项目' },
    { test_item_id: 103, test_item: '正常项目' }
  ];
  const states = [
    { test_item_id: 101, cancelled_in_additional_test: true },
    { test_item_id: 102, cancelled_in_additional_test: false, restored_in_additional_test: true }
  ];

  assert.deepEqual(
    withoutCancelledItems(formalItems, states).map((item) => item.test_item),
    ['恢复项目', '正常项目']
  );
});

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

test('开单员申请队列将特急和加急待审批申请置顶，再按正式单号排序', () => {
  const sql = reviewerOrderBySql('DISPLAY_ORDER_ID', 'URGENCY_VALUE');
  assert.match(sql, /urgent_2x/);
  assert.match(sql, /urgent_1_5x/);
  assert.ok(sql.indexOf('urgent_2x') < sql.indexOf('urgent_1_5x'));
  assert.match(sql, /DISPLAY_ORDER_ID IS NULL/);
  assert.match(sql, /DISPLAY_ORDER_ID ASC/);
  assert.doesNotMatch(sql, /DISPLAY_ORDER_ID DESC/);
});

test('PDF 下载文件名在加测后缀前补充八位开单日期', () => {
  assert.equal(
    appendOrderDateToPdfFilename('JC26090001-委托方A-联系人A.pdf', '2026-09-01'),
    'JC26090001-委托方A-联系人A-20260901.pdf'
  );
  assert.equal(
    appendOrderDateToPdfFilename('JC26090001-委托方A-联系人A-加测.pdf', '20260901'),
    'JC26090001-委托方A-联系人A-20260901-加测.pdf'
  );
  assert.equal(
    appendOrderDateToPdfFilename('JC26090001-委托方A-联系人A-20260901.pdf', '20260901'),
    'JC26090001-委托方A-联系人A-20260901.pdf'
  );
});

test('开单员下载 PDF 时移除业务文件名中的八位开单日期', () => {
  assert.equal(
    removeOrderDateFromPdfFilename('JC26090001-委托方A-联系人A-20260901.pdf'),
    'JC26090001-委托方A-联系人A.pdf'
  );
  assert.equal(
    removeOrderDateFromPdfFilename('JC26090001-委托方A-联系人A-20260901-加测.pdf'),
    'JC26090001-委托方A-联系人A-加测.pdf'
  );
  assert.equal(
    removeOrderDateFromPdfFilename('JC26090001-委托方A-联系人A.pdf'),
    'JC26090001-委托方A-联系人A.pdf'
  );
});

test('草稿只允许创建它的业务员访问，开单员不能查看', async () => {
  const draft = { request_id: 88, applicant_user_id: 'YW0001', status: 'draft' };
  assert.equal(await canAccessRequest(draft, { user_id: 'YW0001', role: 'sales' }), true);
  assert.equal(await canAccessRequest(draft, { user_id: 'JC0089', role: 'reviewer' }), false);
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
