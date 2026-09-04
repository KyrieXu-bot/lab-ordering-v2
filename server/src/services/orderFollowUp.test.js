const test = require('node:test');
const assert = require('node:assert/strict');
const { applyOrderModification, appendOrderTestItems, getOrderTestItemsForFlow } = require('./orderFollowUp');

test('修改申请更新项目字段，但不更改检测项目名称', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT order_id FROM orders')) return [[{ order_id: 'JC26080001' }], []];
      if (sql.includes('FROM test_items WHERE test_item_id')) return [[{ test_item_id: 88, category_name: '力学', detail_name: '拉伸' }], []];
      return [{ affectedRows: 1 }, []];
    }
  };
  await applyOrderModification(conn, 'JC26080001', {
    commissionData: {
      customerId: 1, paymentId: 2, commissionerId: 3,
      orderInfo: { other_requirements: '修改备注', report_seals: ['normal'] },
      reportInfo: { type: [4] }, sampleHandling: {}, sampleRequirements: { hazards: ['Safety'] },
      testItems: [{ test_item_id: 88, test_item: '不应写入', sample_name: '新样品', test_method: 'GB/T 1', quantity: 2 }]
    }
  });
  const itemUpdate = calls.find(call => /UPDATE\s+test_items/i.test(call.sql));
  assert.ok(itemUpdate);
  assert.doesNotMatch(itemUpdate.sql, /category_name|detail_name/);
  assert.deepEqual(itemUpdate.params.slice(-2), [88, 'JC26080001']);
  assert.equal(calls.some(call => /UPDATE\s+orders/i.test(call.sql)), true);
});

test('加测录入只追加 is_add_on=1 的新检测项目', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT payer_id FROM orders')) return [[{ payer_id: null }], []];
      if (sql.includes('INSERT INTO test_items')) return [{ insertId: 501 }, []];
      return [[], []];
    }
  };
  const ids = await appendOrderTestItems(conn, 'JC26080001', {
    commissionData: { testItems: [{ test_item: '力学 - 拉伸', unit: '次', quantity: 1, sample_name: '样品A' }] }
  }, 'JC0089');
  assert.deepEqual(ids, [501]);
  const insert = calls.find(call => call.sql.includes('INSERT INTO test_items'));
  assert.ok(insert);
  assert.match(insert.sql, /is_add_on/);
  assert.match(insert.sql, /NULL, NULL, 1,/);
  assert.equal(insert.params[0], 'JC26080001');
});

test('加测项目把付款方 owner_user_id 写入 current_assignee', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT payer_id FROM orders')) return [[{ payer_id: 21 }], []];
      if (sql.includes('FROM payers p')) return [[{ owner_user_id: 'YW0088', account: 'sales88' }], []];
      if (sql.includes('INSERT INTO test_items')) return [{ insertId: 601 }, []];
      return [[], []];
    }
  };

  await appendOrderTestItems(conn, 'JC26080001', {
    commissionData: { testItems: [{ test_item: '力学 - 冲击', unit: '次', quantity: 1 }] }
  }, 'KD0001');

  const assigneeUpdate = calls.find(call => call.sql.includes('UPDATE test_items SET current_assignee'));
  assert.ok(assigneeUpdate);
  assert.deepEqual(assigneeUpdate.params, ['YW0088', 601]);
});

test('流转单读取正式单号下全部原项目和加测项目', async () => {
  const calls = [];
  const expected = [
    { test_item_id: 11, test_item: '力学 - 拉伸', is_add_on: 0 },
    { test_item_id: 19, test_item: '力学 - 冲击', is_add_on: 1 }
  ];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [expected, []];
    }
  };

  const items = await getOrderTestItemsForFlow(conn, 'JC26080001');
  assert.deepEqual(items, expected);
  assert.deepEqual(calls[0].params, ['JC26080001']);
  assert.match(calls[0].sql, /WHERE ti\.order_id = \?/);
  assert.doesNotMatch(calls[0].sql, /is_add_on\s*=\s*1/);
});
