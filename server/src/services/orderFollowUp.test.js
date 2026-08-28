const test = require('node:test');
const assert = require('node:assert/strict');
const { applyOrderModification, appendOrderTestItems } = require('./orderFollowUp');

test('修改申请只更新委托单资料，不覆盖原检测项目', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT order_id FROM orders')) return [[{ order_id: 'JC26080001' }], []];
      return [{ affectedRows: 1 }, []];
    }
  };
  await applyOrderModification(conn, 'JC26080001', {
    commissionData: {
      customerId: 1, paymentId: 2, commissionerId: 3,
      orderInfo: { other_requirements: '修改备注', report_seals: ['normal'] },
      reportInfo: { type: [4] }, sampleHandling: {}, sampleRequirements: { hazards: ['Safety'] },
      testItems: [{ test_item: '不应写入' }]
    }
  });
  assert.equal(calls.some(call => /UPDATE\s+test_items|DELETE\s+FROM\s+test_items/i.test(call.sql)), false);
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
