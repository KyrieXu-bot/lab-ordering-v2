const test = require('node:test');
const assert = require('node:assert/strict');
const { allocateOrderId, buildApprovedPayload, targetOrderPrefix } = require('./orderNumberAllocation');

function request(requestId, submittedAt, choice = 'current', extra = {}) {
  return {
    request_id: requestId,
    status: 'submitted',
    submitted_at: submittedAt,
    submitted_payload: { formSnapshot: { orderMonthPreference: { choice } } },
    reviewed_payload: null,
    approved_order_id: null,
    ...extra
  };
}

test('无论选择哪条待审批申请，都按当前月最大正式单号加一', () => {
  const rows = [
    request(1, '2026-08-01T09:00:00'),
    request(2, '2026-08-01T10:00:00'),
    request(3, '2026-08-01T11:00:00'),
    request(4, '2026-08-01T12:00:00')
  ];
  const orderIds = Array.from({ length: 22 }, (_, index) => `JC2608${String(index + 1).padStart(4, '0')}`);
  assert.equal(allocateOrderId({ prefix: 'JC2608', targetRequestId: 4, orderIds, requestRows: rows }), 'JC26080023');
});

test('较新申请26已经正式开单后，后续号码按正式最大号继续为27', () => {
  const rows = [
    request(1, '2026-08-01T09:00:00'),
    request(2, '2026-08-01T10:00:00'),
    request(3, '2026-08-01T11:00:00'),
    request(4, '2026-08-01T12:00:00', 'current', {
      status: 'approved',
      approved_order_id: 'JC26080026',
      reviewed_payload: { workflow: { reservedOrderId: 'JC26080026' } }
    })
  ];
  const legacy = Array.from({ length: 22 }, (_, index) => `JC2608${String(index + 1).padStart(4, '0')}`);
  assert.equal(allocateOrderId({ prefix: 'JC2608', targetRequestId: 1, orderIds: [...legacy, 'JC26080026'], requestRows: rows }), 'JC26080027');
});

test('正式最大号2711后从2712继续生成，不按订单条数或中间空缺编号', () => {
  const row = request(11, '2026-08-20T08:00:00');
  assert.equal(allocateOrderId({
    prefix: 'JC2608',
    targetRequestId: 11,
    orderIds: ['JC26080001', 'JC26080008', 'JC26082501', 'JC26082711'],
    requestRows: [row]
  }), 'JC26082712');
});

test('八月提交并选择次月时从九月独立编号', () => {
  const row = request(9, '2026-08-31T18:00:00', 'next');
  assert.equal(targetOrderPrefix(row.submitted_at, row.submitted_payload), 'JC2609');
  assert.equal(allocateOrderId({ prefix: 'JC2609', targetRequestId: 9, orderIds: ['JC26080999'], requestRows: [row] }), 'JC26090001');
});

test('十二月选择次月会正确跨年', () => {
  assert.equal(targetOrderPrefix('2026-12-20T08:00:00', { formSnapshot: { orderMonthPreference: { choice: 'next' } } }), 'JC2701');
});

test('历史三位序号也参与月度最大号计算，新号码仍输出四位', () => {
  const row = request(10, '2025-04-20T08:00:00');
  assert.equal(allocateOrderId({ prefix: 'JC2504', targetRequestId: 10, orderIds: ['JC2504099'], requestRows: [row] }), 'JC25040100');
});

test('审批只预留单号并保留业务快照，正式检测项目保持空白', () => {
  const approved = buildApprovedPayload({
    commissionData: { orderInfo: {}, testItems: [{ test_item: '业务项目' }] },
    templateData: {},
    formSnapshot: {
      formData: { orderNum: '', testItems: [{ test_item: '业务项目' }] },
      businessTestItems: [{ test_item: '业务项目' }]
    }
  }, 'JC26080026', '2026-08-10T08:00:00.000Z');
  assert.equal(approved.workflow.reservedOrderId, 'JC26080026');
  assert.equal(approved.formSnapshot.formData.orderNum, 'JC26080026');
  assert.deepEqual(approved.formSnapshot.formData.testItems, []);
  assert.equal(approved.formSnapshot.businessTestItems[0].test_item, '业务项目');
});
