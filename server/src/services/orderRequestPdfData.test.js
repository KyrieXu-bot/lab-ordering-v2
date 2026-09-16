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
