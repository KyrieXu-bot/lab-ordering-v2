const test = require('node:test');
const assert = require('node:assert/strict');
const { applyOrderModification, appendOrderTestItems, getOrderTestItemsForFlow, modificationItemUpdates, validateFormalModificationReview } = require('./orderFollowUp');

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

test('旧版业务行号绑定不能再写回 LIMS', async () => {
  const conn = { async query(sql) {
    if (sql.includes('SELECT order_id FROM orders')) return [[{order_id:'O1'}]];
    return [{affectedRows:1}];
  }};
  await assert.rejects(applyOrderModification(conn, 'O1', {
    workflow: {modifiedFields: [], formalTestItemBindings:[88]},
    commissionData: {testItems:[{quantity:6, modified_fields:['quantity']}]}
  }), /缺少正式项目标识/);
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
  assert.match(insert.sql, /NULL, NULL, \?,/);
  assert.equal((insert.sql.match(/\?/g) || []).length, insert.params.length);
  assert.equal(insert.params[11], 1);
  assert.equal(insert.params[0], 'JC26080001');
  assert.equal(insert.params[8], 3);
  assert.equal(insert.params[19], null);
});

test('纯取消型加测允许不新增 LIMS 检测项目', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('SELECT payer_id FROM orders')) return [[{ payer_id: null }], []];
      return [[], []];
    }
  };

  const ids = await appendOrderTestItems(conn, 'JC26080001', {
    commissionData: { testItems: [] },
    formSnapshot: {
      businessTestItems: [{ test_item_id: 101, cancelled_in_additional_test: true }]
    }
  }, 'JC0089');

  assert.deepEqual(ids, []);
  assert.equal(calls.some((call) => call.sql.includes('INSERT INTO test_items')), false);
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
  assert.match(calls[0].sql, /ti\.status/);
  assert.doesNotMatch(calls[0].sql, /is_add_on\s*=\s*1/);
});

const formalBaseline = [{test_item_id:88, sample_name:'正式样品', test_item:'合并项目', quantity:2, note:'LIMS备注', arrival_mode:'delivery', sample_arrival_status:'arrived'}];
const formalConnection = { async query(sql) { assert.match(sql, /FOR UPDATE/); return [structuredClone(formalBaseline)]; } };

test('审批缺少独立正式录入时拒绝通过，不使用业务快照兜底', async () => {
  await assert.rejects(validateFormalModificationReview(formalConnection,'O1',undefined), /进入修改审批表单/);
});
test('业务五项与正式一项独立：仅按正式 ID 修改且保留未编辑字段', async () => {
  const items=await validateFormalModificationReview(formalConnection,'O1',{
    baseline:formalBaseline, items:[{test_item_id:88,quantity:9}]
  });
  assert.equal(items.length,1);
  assert.deepEqual(items[0].modified_fields,['quantity']);
  assert.equal(items[0].note,'LIMS备注');
  assert.equal(items[0].test_item,'合并项目');
});
test('LIMS 内容在审批期间改变时拒绝覆盖', async () => {
  await assert.rejects(validateFormalModificationReview(formalConnection,'O1',{
    baseline:[{...formalBaseline[0],quantity:1}],items:formalBaseline
  }), /已变化/);
});
test('正式项目 ID 冒用和重复时拒绝，删除项目会生成删除清单', async () => {
  for (const items of [[{...formalBaseline[0],test_item_id:99}], [...formalBaseline,...formalBaseline]]) {
    await assert.rejects(validateFormalModificationReview(formalConnection,'O1',{baseline:formalBaseline,items}), /标识无效/);
  }
  const deleted = await validateFormalModificationReview(formalConnection,'O1',{baseline:formalBaseline,items:[]});
  assert.deepEqual(deleted.deleted_ids, [88]);
});

test('修改审批允许复制或添加正式项目，并把它标记为新增记录', async () => {
  const added = await validateFormalModificationReview(formalConnection, 'O1', {
    baseline: formalBaseline,
    items: [...formalBaseline, {
      sample_name: '复制样品', material: '钢', sample_type: '1', price_note: 100,
      test_item: '力学 - 拉伸', test_method: 'GB/T 1', quantity: 1, discount_rate: 0, unit: '次',
      arrival_mode: 'delivery', sample_arrival_status: 'arrived', service_urgency: 'normal', department_id: 1
    }]
  });
  assert.equal(added.length, 2);
  assert.equal(added[1]._formal_new, true);
  assert.equal(added[1].test_item_id, null);
});
test('正式项目未改动时不会用业务快照覆盖，清空备注则明确记录', async () => {
  const unchanged=await validateFormalModificationReview(formalConnection,'O1',{baseline:formalBaseline,items:formalBaseline});
  assert.deepEqual(unchanged[0].modified_fields,[]);
  const cleared=await validateFormalModificationReview(formalConnection,'O1',{baseline:formalBaseline,items:[{...formalBaseline[0],note:''}]});
  assert.deepEqual(modificationItemUpdates(cleared[0]),[{column:'note',value:null}]);
});

test('修改审批支持开单表格中的报价、单位、折扣、流转和加急字段', async () => {
  const baseline = [{
    ...formalBaseline[0], price_note: 100, unit: '次', discount_rate: 10,
    seq_no: 1, service_urgency: 'normal'
  }];
  const conn = { async query(sql) { assert.match(sql, /FOR UPDATE/); return [structuredClone(baseline)]; } };
  const [item] = await validateFormalModificationReview(conn, 'O1', {
    baseline,
    items: [{ ...baseline[0], price_note: '120', unit: '机时', discount_rate: '25', seq_no: 2, service_urgency: 'urgent_1_5x' }]
  });
  assert.deepEqual(item.modified_fields, ['price_note', 'unit', 'discount_rate', 'seq_no', 'service_urgency']);
  assert.deepEqual(modificationItemUpdates(item), [
    { column: 'price_note', value: '120' },
    { column: '`unit`', value: '机时' },
    { column: 'discount_rate', value: '25' },
    { column: 'seq_no', value: 2 },
    { column: 'service_urgency', value: 'urgent_1_5x' }
  ]);
});


test('审批同时自动同步报告勾选，并仅更新人工调整的正式项目', async () => {
  const calls=[];
  const conn={async query(sql,params){
    calls.push({sql,params});
    if(sql.includes('FROM test_items ti')) return [structuredClone(formalBaseline)];
    if(sql.includes('SELECT order_id FROM orders')) return [[{order_id:'O1'}]];
    if(sql.includes('FROM test_items WHERE test_item_id')) return [[formalBaseline[0]]];
    return [{affectedRows:1}];
  }};
  const businessItems=Array.from({length:5},(_,i)=>({test_item:'业务项目'+i,quantity:99}));
  const payload={workflow:{modifiedFields:['reportSeals']},formSnapshot:{businessTestItems:businessItems},
    commissionData:{customerId:1,orderInfo:{report_seals:['normal','cnas']},testItems:businessItems}};
  const formalItems=await validateFormalModificationReview(conn,'O1',{baseline:formalBaseline,items:[{...formalBaseline[0],quantity:7}]});
  await applyOrderModification(conn,'O1',{...payload,commissionData:{...payload.commissionData,testItems:formalItems}});
  const writes=calls.filter(call=>/UPDATE test_items/.test(call.sql));
  assert.equal(writes.length,1);
  assert.deepEqual(writes[0].params,[7,88,'O1']);
  assert.deepEqual(calls.find(call=>/UPDATE reports/.test(call.sql)).params,['["normal","cnas"]','O1']);
  assert.equal(payload.formSnapshot.businessTestItems.length,5);
  assert.equal(payload.formSnapshot.businessTestItems[0].quantity,99);
});
