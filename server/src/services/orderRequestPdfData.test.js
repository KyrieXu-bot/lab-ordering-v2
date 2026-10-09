const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildOrderRequestPdfTemplateData,
  additionalTestsAfterModification
} = require('./orderRequestPdfData');

test('PDF 检测要求附录只采用业务提交 JSON，不采用审核正式录入项目', () => {
  const submittedPayload = {
    commissionData: { commissionerId: 2319 },
    templateData: { customer_name: '业务客户', sales_signature_date: '2026-09-09', testItems: [{ test_item: '旧兼容项目' }] },
    formSnapshot: {
      businessTestItems: [
        {
          sampleName: '业务样品',
          material: '业务材质',
          sampleType: '3',
          original_no: 'YW-001',
          test_item: '业务检测项目第一行\n业务检测项目第二行',
          test_method: '业务检测标准',
          quantity: '8',
          note: '业务备注第一行\n业务备注第二行'
        }
      ]
    }
  };
  const reviewedPayload = {
    templateData: {
      customer_name: '审核后的客户信息',
      testItems: [{ sample_name: '马婷录入样品', test_item: '正式项目' }]
    }
  };

  const result = buildOrderRequestPdfTemplateData(reviewedPayload, submittedPayload, 'JC26080001');

  assert.equal(result.order_num, 'JC26080001');
  assert.equal(result.commissioner_id, 2319);
  assert.equal(result.customer_signature_date, '2026-09-09');
  assert.equal(result.customer_name, '审核后的客户信息');
  assert.deepEqual(result.testItems, [{
    idx: 1,
    sample_name: '业务样品',
    material: '业务材质',
    sampleTypeLabel: '粉末',
    original_no: 'YW-001',
    test_item: '业务检测项目第一行\n业务检测项目第二行',
    test_method: '业务检测标准',
    quantity: '8',
    note: '业务备注第一行\n业务备注第二行'
  }]);
});

test('加测版 PDF 在原业务快照后追加所有已录入的加测项目并连续编号', () => {
  const original = {
    templateData: { customer_name: '苏州大学' },
    formSnapshot: { businessTestItems: [{ sampleName: '原样品', test_item: '原项目', quantity: 1 }] }
  };
  const addOn = {
    formSnapshot: { businessTestItems: [{ sampleName: '加测样品', test_item: '加测项目', quantity: 2 }] }
  };

  const result = buildOrderRequestPdfTemplateData(original, original, 'JC26080001', [addOn]);

  assert.deepEqual(result.testItems.map((item) => [item.idx, item.sample_name, item.test_item]), [
    [1, '原样品', '原项目'],
    [2, '加测样品', '加测项目']
  ]);
});

test('加测申请中标记取消的原项目不进入客户 PDF', () => {
  const original = {
    templateData: { customer_name: '苏州大学' },
    formSnapshot: { businessTestItems: [{ sampleName: '原样品', test_item: '原项目', quantity: 1 }] }
  };
  const addOn = {
    formSnapshot: {
      businessTestItems: [
        { sampleName: '原样品', test_item: '原项目', quantity: 1, cancelled_in_additional_test: true, cancelled_at: '2026-09-22T08:00:00Z' },
        { sampleName: '加测样品', test_item: '加测项目', quantity: 2 }
      ]
    }
  };

  const result = buildOrderRequestPdfTemplateData(original, original, 'JC26080001', [addOn]);

  assert.deepEqual(result.testItems.map((item) => item.test_item), ['加测项目']);
});

test('加测取消按项目逐行移除，不会误删内容相同的另一行', () => {
  const original = {
    templateData: { customer_name: '苏州大学' },
    formSnapshot: {
      businessTestItems: [
        { sampleName: '相同样品', test_item: '相同项目', quantity: 1 },
        { sampleName: '相同样品', test_item: '相同项目', quantity: 1 }
      ]
    }
  };
  const addOn = {
    formSnapshot: {
      businessTestItems: [
        { sampleName: '相同样品', test_item: '相同项目', quantity: 1, cancelled_in_additional_test: true }
      ]
    }
  };

  const result = buildOrderRequestPdfTemplateData(original, original, 'JC26080001', [addOn]);

  assert.equal(result.testItems.length, 1);
  assert.equal(result.testItems[0].test_item, '相同项目');
});

test('业务行误带相同 LIMS ID 时仍按业务内容取消两条指定项目', () => {
  const original = {
    templateData: { customer_name: '测试客户' },
    formSnapshot: { businessTestItems: [
      { test_item_id: 21966, sampleName: '样品A', test_item: 'SEM', test_method: '标准A', quantity: 2 },
      { test_item_id: 21966, sampleName: '样品A', test_item: '拉曼', test_method: '标准B', quantity: 2 },
      { test_item_id: 21966, sampleName: '样品A', test_item: 'CP', test_method: '标准C', quantity: 2 }
    ] }
  };
  const addOn = { formSnapshot: { businessTestItems: [
    { test_item_id: 21966, sampleName: '样品A', test_item: 'SEM', test_method: '标准A', quantity: 2, cancelled_in_additional_test: true },
    { test_item_id: 21966, sampleName: '样品A', test_item: 'CP', test_method: '标准C', quantity: 2, cancelled_in_additional_test: true },
    { sampleName: '新增样品', test_item: 'FIB', test_method: '标准D', quantity: 1 }
  ] } };

  const result = buildOrderRequestPdfTemplateData(original, original, 'JC26100005', [addOn]);
  assert.deepEqual(result.testItems.map((item) => item.test_item), ['拉曼', 'FIB']);
});

test('加测申请补充的其他要求进入重新生成的客户 PDF', () => {
  const original = {
    templateData: { customer_name: '苏州大学', other_requirements: '原要求' },
    formSnapshot: {
      formData: { otherRequirements: '原要求' },
      businessTestItems: [{ sampleName: '原样品', test_item: '原项目', quantity: 1 }]
    }
  };
  const addOn = {
    commissionData: { orderInfo: { other_requirements: '原要求\n加测样品需避光保存' } },
    formSnapshot: {
      formData: { otherRequirements: '原要求\n加测样品需避光保存' },
      businessTestItems: [{ sampleName: '加测样品', test_item: '加测项目', quantity: 1 }]
    }
  };

  const result = buildOrderRequestPdfTemplateData(original, original, 'JC26080001', [addOn]);

  assert.equal(result.other_requirements, '原要求\n加测样品需避光保存');
});

test('后续加测恢复此前取消的项目后，项目重新进入客户 PDF', () => {
  const original = {
    templateData: { customer_name: '苏州大学' },
    formSnapshot: { businessTestItems: [{ test_item_id: 101, sampleName: '原样品', test_item: '原项目', quantity: 1 }] }
  };
  const cancellation = {
    formSnapshot: { businessTestItems: [{ test_item_id: 101, sampleName: '原样品', test_item: '原项目', quantity: 1, cancelled_in_additional_test: true }] }
  };
  const restoration = {
    formSnapshot: { businessTestItems: [{ test_item_id: 101, sampleName: '原样品', test_item: '原项目', quantity: 1, restored_in_additional_test: true }] }
  };

  const result = buildOrderRequestPdfTemplateData(original, original, 'JC26080001', [cancellation, restoration]);

  assert.deepEqual(result.testItems.map((item) => item.test_item), ['原项目']);
});

test('修改审批通过后的 PDF 使用修改快照中的检测项目和样品原号', () => {
  const original = {
    templateData: { customer_name: '原客户' },
    formSnapshot: {
      businessTestItems: [{ sampleName: '原样品', original_no: 'OLD-001', test_item: '原项目' }]
    }
  };
  const modification = {
    workflow: { requestType: 'modification' },
    templateData: { customer_name: '修改后客户' },
    formSnapshot: {
      businessTestItems: [{ sampleName: '修改后样品', original_no: 'NEW-001', test_item: '修改后项目' }]
    }
  };

  const result = buildOrderRequestPdfTemplateData(modification, original, 'JC26080001');

  assert.equal(result.customer_name, '修改后客户');
  assert.deepEqual(result.testItems.map((item) => [item.sample_name, item.original_no, item.test_item]), [
    ['修改后样品', 'NEW-001', '修改后项目']
  ]);
});

test('修改申请把流转顺序从否改为是后，PDF 使用修改快照的新选择', () => {
  const original = {
    workflow: { requestType: 'normal' },
    templateData: {
      customer_name: '原客户',
      requires_flow: 0,
      flowRequiredYesSymbol: '☐',
      flowRequiredNoSymbol: '☑',
      flow_note: ''
    },
    formSnapshot: { businessTestItems: [{ sampleName: '原样品', test_item: '原项目' }] }
  };
  const modification = {
    workflow: { requestType: 'modification' },
    templateData: {
      customer_name: '原客户',
      requires_flow: 1,
      flowRequiredYesSymbol: '☑',
      flowRequiredNoSymbol: '☐',
      flow_note: '项目2完成后再做项目1'
    },
    formSnapshot: { businessTestItems: [{ sampleName: '原样品', test_item: '原项目' }] }
  };

  const result = buildOrderRequestPdfTemplateData(modification, original, 'JC26091047');

  assert.equal(result.requires_flow, 1);
  assert.equal(result.flowRequiredYesSymbol, '☑');
  assert.equal(result.flowRequiredNoSymbol, '☐');
  assert.equal(result.flow_note, '项目2完成后再做项目1');
});

test('修改版 PDF 只追加修改审批后完成录入的加测项目', () => {
  const additions = [
    { request_id: 1, applied_at: '2026-09-09T09:00:00Z' },
    { request_id: 2, applied_at: '2026-09-11T09:00:00Z' }
  ];

  assert.deepEqual(
    additionalTestsAfterModification(additions, '2026-09-10T09:00:00Z').map((item) => item.request_id),
    [2]
  );
});

test('修改或加测重新生成 PDF 时始终保留最初申请的签名日期', () => {
  const original = {
    templateData: {
      customer_name: '原始客户',
      customer_signature_date: '2026-08-20',
      sales_signature_date: '2026-08-20'
    },
    formSnapshot: { businessTestItems: [{ sampleName: '样品', test_item: '项目' }] }
  };
  const modification = {
    templateData: {
      customer_name: '修改后客户',
      customer_signature_date: '2026-09-10',
      sales_signature_date: '2026-09-10'
    }
  };

  const result = buildOrderRequestPdfTemplateData(modification, original, 'JC26080001');

  assert.equal(result.customer_signature_date, '2026-08-20');
  assert.equal(result.sales_signature_date, '2026-08-20');
});

test('历史申请没有模板日期时使用最初提交日期作为 PDF 日期', () => {
  const original = {
    templateData: { customer_name: '历史客户' },
    formSnapshot: { businessTestItems: [{ sampleName: '样品', test_item: '项目' }] }
  };

  const result = buildOrderRequestPdfTemplateData(original, original, 'JC26080001', [], '2026-08-19');

  assert.equal(result.customer_signature_date, '2026-08-19');
  assert.equal(result.sales_signature_date, '2026-08-19');
});


test('修改 PDF 始终使用业务五行 JSON，忽略独立正式合并项目', () => {
  const businessItems=Array.from({length:5},(_,i)=>({sampleName:'业务样品'+i,test_item:'业务项目'+i,quantity:i+10}));
  const modification={workflow:{requestType:'modification'},templateData:{other_requirements:'修改后要求'},
    formSnapshot:{businessTestItems:businessItems},
    commissionData:{testItems:[{test_item_id:88,test_item:'LIMS合并项目',quantity:99}]}};
  const result=buildOrderRequestPdfTemplateData(modification,{templateData:{},formSnapshot:{businessTestItems:[{test_item:'旧项目'}]}},'O1');
  assert.equal(result.testItems.length,5);
  assert.deepEqual(result.testItems.map(item=>item.test_item),businessItems.map(item=>item.test_item));
  assert.equal(result.testItems[0].quantity,10);
  assert.equal(result.other_requirements,'修改后要求');
});
