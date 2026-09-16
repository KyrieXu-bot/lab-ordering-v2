const test = require('node:test');
const assert = require('node:assert/strict');
const { createDirectOrderRequest, parseJsonObject } = require('./commission');

test('LIMS 预填可以读取 JSON 对象格式的退回地址', () => {
  const expected = { returnAddressOption: 'other', returnAddress: '苏州市测试地址' };
  assert.deepEqual(parseJsonObject(JSON.stringify(expected)), expected);
  assert.deepEqual(parseJsonObject(expected), expected);
  assert.equal(parseJsonObject('[1,2]'), null);
  assert.equal(parseJsonObject('invalid json'), null);
});

test('开单员自行开单同步生成马婷名下的普通已开单申请快照', async () => {
  const calls = [];
  const connection = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes('SELECT user_id FROM users')) return [[{ user_id: 'JC0089' }]];
      if (sql.includes('INSERT INTO order_requests')) return [{ insertId: 88 }];
      if (sql.includes('UPDATE order_requests SET root_request_id')) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
  const item = { sampleName: '样品A', test_item: '硬度' };
  const payload = {
    customerId: 1,
    paymentId: 2,
    commissionerId: 3,
    testItems: [item],
    orderInfo: {},
    directRequestPayload: {
      commissionData: { testItems: [item], orderInfo: {} },
      templateData: {},
      formSnapshot: { formData: { testItems: [item] }, businessTestItems: [item] }
    }
  };

  const requestId = await createDirectOrderRequest(connection, payload, 'JC26090001', 'JC0089');

  assert.equal(requestId, 88);
  const insert = calls.find((call) => call.sql.includes('INSERT INTO order_requests'));
  assert.match(insert.sql, /'approved', 'normal'/);
  assert.deepEqual(insert.params.slice(0, 5), ['JC0089', 'JC0089', 1, 2, 3]);
  const submitted = JSON.parse(insert.params[5]);
  assert.equal(submitted.formSnapshot.formData.orderNum, 'JC26090001');
  assert.equal(submitted.formSnapshot.businessTestItems[0].test_item, '硬度');
  assert.equal(submitted.workflow.directCreated, true);
  assert.equal(insert.params[7], 'JC26090001');
});
