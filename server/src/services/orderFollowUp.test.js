const test = require('node:test');
const assert = require('node:assert/strict');
const { applyOrderModification, appendOrderTestItems, getOrderTestItemsForFlow, modificationItemUpdates } = require('./orderFollowUp');

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
      orderInfo: { other_requirements: '修改备注', flow_note: '整单先做拉伸', report_seals: ['normal'] },
      reportInfo: { type: [4] }, sampleHandling: {}, sampleRequirements: { hazards: ['Safety'] },
      testItems: [{
        test_item_id: 88, test_item: '不应写入', sample_name: '新样品', test_method: 'GB/T 1',
        quantity: '2个小时', modified_fields: ['sampleName', 'test_method', 'quantity']
      }]
    }
  });
  const itemUpdate = calls.find(call => /UPDATE\s+test_items/i.test(call.sql));
  assert.ok(itemUpdate);
  assert.doesNotMatch(itemUpdate.sql, /category_name|detail_name/);
  assert.equal(itemUpdate.params[2], 2);
  assert.deepEqual(itemUpdate.params.slice(-2), [88, 'JC26080001']);
  const orderUpdate = calls.find(call => /UPDATE\s+orders/i.test(call.sql));
  assert.ok(orderUpdate);
  assert.doesNotMatch(orderUpdate.sql, /requires_flow|flow_note/);
  assert.equal(orderUpdate.params.includes('整单先做拉伸'), false);
});

test('修改申请只改数量时不会覆盖备注和其他未修改字段', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT order_id FROM orders')) return [[{ order_id: 'JC26080001' }], []];
      if (sql.includes('FROM test_items WHERE test_item_id')) {
        return [[{ test_item_id: 88, category_name: '力学', detail_name: '拉伸' }], []];
      }
      return [{ affectedRows: 1 }, []];
    }
  };

  await applyOrderModification(conn, 'JC26080001', {
    workflow: { modifiedFields: [] },
    commissionData: {
      customerId: 1,
      orderInfo: {}, reportInfo: {}, sampleHandling: {}, sampleRequirements: {},
      testItems: [{
        test_item_id: 88,
        quantity: 9,
        note: '',
        flow_note: '',
        sample_name: '',
        material: '',
        original_no: '',
        test_method: '',
        modified_fields: ['quantity']
      }]
    }
  });

  const itemUpdate = calls.find(call => /UPDATE\s+test_items/i.test(call.sql));
  assert.ok(itemUpdate);
  assert.match(itemUpdate.sql, /SET quantity = \?/);
  assert.doesNotMatch(itemUpdate.sql, /note|business_note|sample_name|material|original_no|standard_code/);
  assert.deepEqual(itemUpdate.params, [9, 88, 'JC26080001']);
  const orderUpdate = calls.find(call => /UPDATE\s+orders/i.test(call.sql));
  assert.ok(orderUpdate);
  assert.doesNotMatch(orderUpdate.sql, /note|requires_flow|flow_note|total_price|delivery_days_after_receipt|subcontracting_not_accepted/);
  assert.equal(calls.some(call => /INSERT INTO\s+reports/i.test(call.sql)), false);
  assert.equal(calls.some(call => /UPDATE\s+sample_(handling|requirements)/i.test(call.sql)), false);
});

test('旧版修改请求中的空字符串不会清空正式项目字段', () => {
  const updates = modificationItemUpdates({
    quantity: 3,
    note: '',
    flow_note: '',
    sample_name: '',
    material: '氧化锆'
  });
  assert.deepEqual(updates, [
    { column: 'material', value: '氧化锆' },
    { column: 'quantity', value: 3 }
  ]);
});

test('明确修改备注为空时仍允许业务主动清空备注', () => {
  assert.deepEqual(modificationItemUpdates({ note: '', modified_fields: ['note'] }), [
    { column: 'note', value: null }
  ]);
});

test('修改申请的流转选择只留在申请快照，不写入正式单数据库', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT order_id FROM orders')) return [[{ order_id: 'JC26080001' }], []];
      return [{ affectedRows: 1 }, []];
    }
  };

  await applyOrderModification(conn, 'JC26080001', {
    workflow: { modifiedFields: ['flowRequired', 'flowNote'] },
    commissionData: {
      customerId: 1,
      orderInfo: { requires_flow: false, flow_note: '' },
      reportInfo: {}, sampleHandling: {}, sampleRequirements: {}, testItems: []
    }
  });

  const orderUpdate = calls.find(call => /UPDATE\s+orders/i.test(call.sql));
  assert.doesNotMatch(orderUpdate.sql, /requires_flow|flow_note/);
  assert.deepEqual(orderUpdate.params, [1, null, null, 'JC26080001']);
  assert.equal(calls.some(call => /UPDATE\s+test_items/i.test(call.sql)), false);
});

test('修改单个样品要求时不会覆盖同区块的其他字段', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT order_id FROM orders')) return [[{ order_id: 'JC26080001' }], []];
      return [{ affectedRows: 1 }, []];
    }
  };

  await applyOrderModification(conn, 'JC26080001', {
    workflow: { modifiedFields: ['sampleRequirements.magnetism'] },
    commissionData: {
      customerId: 1,
      orderInfo: {}, reportInfo: {}, sampleHandling: {},
      sampleRequirements: { hazards: [], hazardOther: '', magnetism: 'No' },
      testItems: []
    }
  });

  const update = calls.find(call => /UPDATE\s+sample_requirements/i.test(call.sql));
  assert.ok(update);
  assert.match(update.sql, /SET magnetism = \?/);
  assert.doesNotMatch(update.sql, /hazards|hazard_other|conductivity|breakable|brittle/);
  assert.deepEqual(update.params, ['No', 'JC26080001']);
});

test('修改申请优先更新样品处置和样品要求，仅在原记录不存在时插入', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT order_id FROM orders')) return [[{ order_id: 'JC26080001' }], []];
      if (/UPDATE\s+sample_(handling|requirements)/i.test(sql)) return [{ affectedRows: 0 }, []];
      if (/SELECT order_id FROM sample_(handling|requirements)/i.test(sql)) return [[], []];
      return [{ affectedRows: 1 }, []];
    }
  };

  await applyOrderModification(conn, 'JC26080001', {
    commissionData: {
      customerId: 1,
      orderInfo: {},
      reportInfo: {},
      sampleHandling: { handling_type: '3', return_info: { returnAddressOption: 'other', returnAddress: '新地址' } },
      sampleRequirements: { hazards: ['Fragile'], magnetism: 'Unknown' },
      testItems: []
    }
  });

  assert.equal(calls.filter(call => /UPDATE\s+sample_handling/i.test(call.sql)).length, 1);
  assert.equal(calls.filter(call => /INSERT INTO\s+sample_handling/i.test(call.sql)).length, 1);
  assert.equal(calls.filter(call => /UPDATE\s+sample_requirements/i.test(call.sql)).length, 1);
  assert.equal(calls.filter(call => /INSERT INTO\s+sample_requirements/i.test(call.sql)).length, 1);
  assert.equal(calls.some(call => /ON DUPLICATE KEY UPDATE/i.test(call.sql) && /sample_(handling|requirements)/i.test(call.sql)), false);
});

test('加测录入只追加 is_add_on=1 的新检测项目且不再写项目级流转备注', async () => {
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
    commissionData: { testItems: [{ test_item: '力学 - 拉伸', unit: '次', quantity: '3次', sample_name: '样品A', flow_note: '先制样' }] }
  }, 'JC0089');
  assert.deepEqual(ids, [501]);
  const insert = calls.find(call => call.sql.includes('INSERT INTO test_items'));
  assert.ok(insert);
  assert.match(insert.sql, /is_add_on/);
  assert.match(insert.sql, /business_note/);
  assert.match(insert.sql, /NULL, NULL, 1,/);
  assert.equal(insert.params[0], 'JC26080001');
  assert.equal(insert.params[8], 3);
  assert.equal(insert.params[19], null);
});

test('加测项目把原委托单服务方写入当前负责人和指派来源', async () => {
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

  const assignmentInsert = calls.find(call => call.sql.includes('INSERT INTO assignments'));
  assert.ok(assignmentInsert);
  assert.match(assignmentInsert.sql, /1, '业务员'/);
  assert.equal(assignmentInsert.params[1], 'YW0088');
  assert.equal(assignmentInsert.params[3], 'YW0088');
  assert.notEqual(assignmentInsert.params[3], 'KD0001');
});

test('标准加测项目同时写入业务员和组长记录，避免 LIMS 把开单员当业务负责人', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT payer_id FROM orders')) return [[{ payer_id: 21 }], []];
      if (sql.includes('FROM payers p')) return [[{ owner_user_id: 'YW0088', account: 'YW0088' }], []];
      if (sql.includes('FROM price WHERE')) return [[{
        price_id: 12, category_name: '力学', detail_name: '冲击', test_code: 'T-12',
        standard_code: 'GB/T 1', department_id: 3, group_id: 7, is_outsourced: 0,
        amount: 100, unit: '次'
      }], []];
      if (sql.includes("group_role = 'supervisor'")) return [[{ account: 'ZZ0001' }], []];
      if (sql.includes('INSERT INTO test_items')) return [{ insertId: 602 }, []];
      return [[], []];
    }
  };

  await appendOrderTestItems(conn, 'JC26080001', {
    commissionData: { testItems: [{ price_id: 12, test_item: '力学 - 冲击', unit: '次', quantity: 1 }] }
  }, 'KD0001');

  const assignmentInserts = calls.filter(call => call.sql.includes('INSERT INTO assignments'));
  assert.equal(assignmentInserts.length, 2);
  assert.match(assignmentInserts[0].sql, /0, '业务员'/);
  assert.deepEqual(assignmentInserts[0].params, [602, 'YW0088', 'ZZ0001', 'YW0088']);
  assert.match(assignmentInserts[1].sql, /1, '组长'/);
  assert.deepEqual(assignmentInserts[1].params, [602, 'ZZ0001', 'ZZ0001', 'YW0088']);
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
