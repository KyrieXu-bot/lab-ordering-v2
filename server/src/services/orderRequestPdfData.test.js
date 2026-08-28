const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrderRequestPdfTemplateData } = require('./orderRequestPdfData');

test('PDF 检测要求附录只采用业务提交 JSON，不采用审核正式录入项目', () => {
  const submittedPayload = {
    templateData: { customer_name: '业务客户', testItems: [{ test_item: '旧兼容项目' }] },
    formSnapshot: {
      businessTestItems: [
        {
          sampleName: '业务样品',
          material: '业务材质',
          sampleType: '3',
          original_no: 'YW-001',
          test_item: '业务检测项目及报价',
          test_method: '业务检测标准',
          quantity: '8',
          note: '业务备注'
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
  assert.equal(result.customer_name, '审核后的客户信息');
  assert.deepEqual(result.testItems, [{
    idx: 1,
    sample_name: '业务样品',
    material: '业务材质',
    sampleTypeLabel: '粉末',
    original_no: 'YW-001',
    test_item: '业务检测项目及报价',
    test_method: '业务检测标准',
    quantity: '8',
    note: '业务备注'
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
