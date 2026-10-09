const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFlowDocumentFilename,
  buildRequirementDownloadFilename,
  removeOrderDateFromPdfFilename,
  reviewerOrderBySql,
  canAccessRequest,
  requestArrivalSummary,
  requestMonthPreference,
  validateBusinessTestItemArrival,
  applicationPrefillPayload,
  additionalSubmittedPayloadsForPdf,
  cumulativeApplicationItems,
  cumulativeApplicationItemsWithStates,
  cumulativeAdditionalItemStates,
  withoutCancelledItems,
  followUpBlocksNewVersion,
  withoutFormalItems,
  withoutLeakedFormalAdditionalItems,
  withBusinessModificationItems,
  setModificationBaselineTestItems,
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

test('加测 PDF 数据只读取业务提交快照，不读取开单员正式录入快照', () => {
  const rows = [{
    submitted_payload: JSON.stringify({ formSnapshot: { businessTestItems: [{ test_item: '业务加测项目' }] } }),
    reviewed_payload: JSON.stringify({ formSnapshot: { businessTestItems: [{ test_item: 'LIMS正式项目' }] } })
  }];
  assert.equal(
    additionalSubmittedPayloadsForPdf(rows)[0].formSnapshot.businessTestItems[0].test_item,
    '业务加测项目'
  );
});

test('修改申请保留业务版本基线，不再按业务行号绑定 LIMS 项目', async () => {
  const businessBaseline = [{ sampleName: '业务样品', test_item: '业务项目', test_method: '业务标准' }];
  const payload = {
    workflow: {},
    commissionData: { testItems: [{ sample_name: '业务样品', test_item: '业务项目', test_method: '业务标准' }] },
    formSnapshot: { modificationBaselineTestItems: businessBaseline }
  };
  const queryable = {
    async query() {
      return [[{ test_item_id: 91, sample_name: 'LIMS样品', test_item: 'LIMS项目', test_method: 'LIMS标准' }], []];
    }
  };

  await setModificationBaselineTestItems(queryable, payload, 'JC26090001');

  assert.deepEqual(payload.formSnapshot.modificationBaselineTestItems, businessBaseline);
  assert.equal(payload.commissionData.testItems[0].test_item, '业务项目');
  assert.equal(payload.commissionData.testItems[0].test_item_id, undefined);
  assert.equal(payload.workflow.formalTestItemBindings, undefined);
});

test('旧修改申请只把明确修改字段覆盖到业务基线，丢弃整行混入的 LIMS 值', () => {
  const cleaned = withBusinessModificationItems({
    commissionData: {
      testItems: [{ modified_fields: ['test_method'] }]
    },
    formSnapshot: {
      businessTestItems: [{
        sampleName: 'LIMS样品名',
        test_item: 'LIMS项目名',
        test_method: '业务本次修改的新标准',
        quantity: 99,
        _modifiedFields: ['test_method']
      }]
    }
  }, [{
    sampleName: '业务原样品名',
    test_item: '业务原项目名',
    test_method: '业务原标准',
    quantity: 2
  }]);

  assert.equal(cleaned.formSnapshot.businessTestItems[0].sampleName, '业务原样品名');
  assert.equal(cleaned.formSnapshot.businessTestItems[0].test_item, '业务原项目名');
  assert.equal(cleaned.formSnapshot.businessTestItems[0].quantity, 2);
  assert.equal(cleaned.formSnapshot.businessTestItems[0].test_method, '业务本次修改的新标准');
});

test('连续修改逐版本继承业务字段，不把上一条历史污染快照继续传递', () => {
  const packet = (items) => JSON.stringify({
    commissionData: { testItems: items.map((item) => ({ modified_fields: item._modifiedFields || [] })) },
    formSnapshot: { businessTestItems: items }
  });
  const rows = [
    {
      request_id: 613, request_type: 'normal', status: 'approved', applied_at: '2026-09-21',
      submitted_payload: packet([{ test_item: 'SEM MSS02:700元/h', test_method: 'SEM JY/T 0584-2020', original_no: '1-4#', quantity: 4 }])
    },
    {
      request_id: 757, request_type: 'modification', status: 'approved', applied_at: '2026-09-23',
      submitted_payload: packet([{ test_item: 'LIMS项目名', test_method: 'LIMS标准', original_no: '1-4#', quantity: 1, _modifiedFields: ['quantity'] }])
    },
    {
      request_id: 787, request_type: 'modification', status: 'approved', applied_at: '2026-09-24',
      submitted_payload: packet([{ test_item: 'LIMS项目名', test_method: 'LIMS标准', original_no: '1#', quantity: 1, _modifiedFields: ['original_no'] }])
    }
  ];

  const [item] = cumulativeApplicationItemsWithStates(rows);
  assert.equal(item.test_item, 'SEM MSS02:700元/h');
  assert.equal(item.test_method, 'SEM JY/T 0584-2020');
  assert.equal(item.quantity, 1);
  assert.equal(item.original_no, '1#');
});

test('历史修改只提交一行时保留其余业务基线行，不渲染成空行或删除', () => {
  const cleaned = withBusinessModificationItems({
    commissionData: { testItems: [{ modified_fields: ['quantity', 'sampleName', 'original_no'] }] },
    formSnapshot: {
      businessTestItems: [{
        sampleName: '合并后的样品清单', original_no: '合并后的原号', test_item: 'LIMS项目',
        quantity: 14, _modifiedFields: ['quantity', 'sampleName', 'original_no']
      }]
    }
  }, [
    { sampleName: '业务样品1', original_no: '原号1', test_item: '业务项目1', quantity: 1 },
    { sampleName: '业务样品2', original_no: '原号2', test_item: '业务项目2', quantity: 2 }
  ]);

  assert.deepEqual(cleaned.formSnapshot.businessTestItems.map((item) => ({
    sampleName: item.sampleName,
    original_no: item.original_no,
    test_item: item.test_item,
    quantity: item.quantity
  })), [
    { sampleName: '合并后的样品清单', original_no: '合并后的原号', test_item: '业务项目1', quantity: 14 },
    { sampleName: '业务样品2', original_no: '原号2', test_item: '业务项目2', quantity: 2 }
  ]);
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

test('业务加测基线只累计业务快照，并忽略无法匹配的 LIMS 正式项目取消行', () => {
  const payload = (items) => JSON.stringify({ formSnapshot: { businessTestItems: items } });
  const rows = [
    { request_id: 1, request_type: 'normal', status: 'approved', submitted_payload: payload([
      { sampleName: '业务样品', test_item: '业务项目1', quantity: 1 },
      { sampleName: '业务样品', test_item: '业务项目2', quantity: 1 }
    ]) },
    { request_id: 2, request_type: 'additional_test', status: 'approved', applied_at: '2026-09-23', submitted_payload: payload([
      { test_item_id: 401, sampleName: '正式样品', test_item: 'LIMS正式项目', quantity: 1, cancelled_in_additional_test: true, _locked: true },
      { sampleName: '业务样品', test_item: '业务新增项目', quantity: 1 }
    ]) }
  ];

  assert.deepEqual(
    cumulativeApplicationItemsWithStates(rows).map((item) => item.test_item),
    ['业务项目1', '业务项目2', '业务新增项目']
  );
});

test('开单完成后保存的开单系统快照剔除 LIMS 正式项目', () => {
  const businessItem = { sampleName: '业务样品', test_item: '业务项目', quantity: 1 };
  const formalItem = { test_item_id: 501, sampleName: '正式样品', test_item: 'LIMS正式项目', quantity: 2 };
  const submitted = { formSnapshot: { businessTestItems: [businessItem] } };
  const reviewed = {
    workflow: { reservedOrderId: 'JC26090001' },
    commissionData: { testItems: [formalItem] },
    templateData: { testItems: [formalItem] },
    formSnapshot: { formData: { orderNum: 'JC26090001', testItems: [formalItem] }, businessTestItems: [formalItem] }
  };

  const sanitized = withoutFormalItems(reviewed, submitted);
  assert.equal(sanitized.workflow.reservedOrderId, 'JC26090001');
  assert.deepEqual(sanitized.commissionData.testItems, [businessItem]);
  assert.deepEqual(sanitized.templateData.testItems, [businessItem]);
  assert.deepEqual(sanitized.formSnapshot.formData.testItems, [businessItem]);
  assert.deepEqual(sanitized.formSnapshot.businessTestItems, [businessItem]);
});

test('历史加测快照返回前过滤混入的 LIMS 正式项目', () => {
  const businessOriginal = { sampleName: '业务样品', test_item: '业务项目', quantity: 1 };
  const leakedFormal = { test_item_id: 601, sampleName: '正式样品', test_item: 'LIMS正式项目', quantity: 1, _locked: true, cancelled_in_additional_test: true };
  const businessAddition = { sampleName: '新增样品', test_item: '业务新增项目', quantity: 1 };
  const cleaned = withoutLeakedFormalAdditionalItems({
    commissionData: { testItems: [businessAddition] },
    formSnapshot: { formData: { testItems: [leakedFormal, businessAddition] }, businessTestItems: [leakedFormal, businessAddition] }
  }, [businessOriginal]);

  assert.deepEqual(cleaned.formSnapshot.businessTestItems.map((item) => item.test_item), ['业务新增项目']);
  assert.deepEqual(cleaned.commissionData.testItems.map((item) => item.test_item), ['业务新增项目']);
});

test('历史加测快照保留能够匹配业务基线的正常取消记录', () => {
  const businessOriginal = { sampleName: '业务样品', test_item: '业务项目', test_method: '标准A', quantity: 1 };
  const cancellation = { ...businessOriginal, _locked: true, cancelled_in_additional_test: true };
  const cleaned = withoutLeakedFormalAdditionalItems({
    formSnapshot: { businessTestItems: [cancellation] }
  }, [businessOriginal]);

  assert.equal(cleaned.formSnapshot.businessTestItems.length, 1);
  assert.equal(cleaned.formSnapshot.businessTestItems[0].test_item, '业务项目');
  assert.equal(cleaned.formSnapshot.businessTestItems[0].cancelled_in_additional_test, true);
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

test('业务项目共用同一 LIMS ID 时取消状态按业务内容落到正确两行', () => {
  const payload = (items) => JSON.stringify({ formSnapshot: { businessTestItems: items } });
  const shared = { test_item_id: 21966, sampleName: '样品A', quantity: 2 };
  const result = cumulativeApplicationItemsWithStates([
    { request_id: 1, request_type: 'normal', status: 'approved', submitted_payload: payload([
      { ...shared, test_item: 'SEM', test_method: '标准A' },
      { ...shared, test_item: '拉曼', test_method: '标准B' },
      { ...shared, test_item: 'CP', test_method: '标准C' }
    ]) },
    { request_id: 2, request_type: 'additional_test', status: 'approved', applied_at: '2026-09-28', submitted_payload: payload([
      { ...shared, test_item: 'SEM', test_method: '标准A', cancelled_in_additional_test: true },
      { ...shared, test_item: 'CP', test_method: '标准C', cancelled_in_additional_test: true },
      { sampleName: '新增样品', test_item: 'FIB', test_method: '标准D', quantity: 1 }
    ]) }
  ]);

  assert.deepEqual(result.map((item) => [item.test_item, Boolean(item.cancelled_in_additional_test)]), [
    ['SEM', true], ['拉曼', false], ['CP', true], ['FIB', false]
  ]);
});

test('Word 导出按最终取消状态移除项目，并保留后来恢复的项目', () => {
  const formalItems = [
    { test_item_id: 101, test_item: '取消项目', status: 'cancelled' },
    { test_item_id: 102, test_item: '恢复项目', status: 'running' },
    { test_item_id: 103, test_item: '正常项目', status: 'assigned' }
  ];

  assert.deepEqual(
    withoutCancelledItems(formalItems).map((item) => item.test_item),
    ['恢复项目', '正常项目']
  );
});

test('Word 导出始终移除 LIMS 已取消项目，即使业务快照名称无法匹配', () => {
  const formalItems = [
    { test_item_id: 22546, test_item: '正式 SEM+EDS', status: 'cancelled' },
    { test_item_id: 22547, test_item: '正式拉曼', status: 'running' },
    { test_item_id: 22548, test_item: '正式 CP', status: 'cancelled' }
  ];
  assert.deepEqual(
    withoutCancelledItems(formalItems).map((item) => item.test_item),
    ['正式拉曼']
  );
});

test('Word 导出不使用业务快照取消标记覆盖 LIMS 状态', () => {
  const formalItems = [
    { test_item_id: 101, test_item: 'LIMS 有效项目', status: 'running' }
  ];
  const businessStates = [
    { test_item_id: 101, test_item: 'LIMS 有效项目', cancelled_in_additional_test: true }
  ];

  assert.deepEqual(
    withoutCancelledItems(formalItems, businessStates).map((item) => item.test_item),
    ['LIMS 有效项目']
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

test('委托单 PDF 下载文件名统一移除八位开单日期', () => {
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

test('申请月份只对普通申请显示当月或次月', () => {
  const payload = (choice) => ({ formSnapshot: { orderMonthPreference: { choice } } });
  assert.equal(requestMonthPreference('normal', payload('current')), 'current');
  assert.equal(requestMonthPreference('normal', JSON.stringify(payload('next'))), 'next');
  assert.equal(requestMonthPreference('normal', {}), 'current');
  assert.equal(requestMonthPreference('modification', payload('next')), '-');
  assert.equal(requestMonthPreference('additional_test', payload('next')), '-');
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
