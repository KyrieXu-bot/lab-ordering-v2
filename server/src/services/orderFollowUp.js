const { extractIntegerQuantity } = require('./testItemQuantity');

function clean(value) {
  return value == null || String(value).trim() === '' ? null : value;
}

const MODIFICATION_ITEM_FIELDS = {
  sampleName: { column: 'sample_name', payload: 'sample_name', value: clean },
  sample_name: { column: 'sample_name', payload: 'sample_name', value: clean },
  material: { column: 'material', payload: 'material', value: clean },
  sampleType: { column: 'sample_type', payload: 'sample_type', value: clean },
  sampleTypeCustom: { column: 'sample_type', payload: 'sample_type', value: clean },
  sample_type: { column: 'sample_type', payload: 'sample_type', value: clean },
  original_no: { column: 'original_no', payload: 'original_no', value: clean },
  test_method: { column: 'standard_code', payload: 'test_method', value: clean },
  quantity: { column: 'quantity', payload: 'quantity', value: extractIntegerQuantity },
  note: { column: 'note', payload: 'note', value: clean },
  arrival_mode: {
    column: 'arrival_mode', payload: 'arrival_mode',
    value: (value) => value === 'mail' ? 'delivery' : clean(value)
  },
  sample_arrival_status: {
    column: 'sample_arrival_status', payload: 'sample_arrival_status',
    value: (value) => ['arrived', 'not_arrived'].includes(value) ? value : null
  }
};

function modificationItemUpdates(item) {
  const submittedFields = Array.isArray(item.modified_fields) ? item.modified_fields : null;
  const selectedFields = submittedFields == null
    ? Object.keys(MODIFICATION_ITEM_FIELDS).filter((field) => {
        const definition = MODIFICATION_ITEM_FIELDS[field];
        const value = item[definition.payload];
        return value !== undefined && value !== null && String(value).trim() !== '';
      })
    : submittedFields;
  const updates = [];
  const usedColumns = new Set();
  selectedFields.forEach((field) => {
    const definition = MODIFICATION_ITEM_FIELDS[field];
    if (!definition || usedColumns.has(definition.column)) return;
    usedColumns.add(definition.column);
    updates.push({
      column: definition.column,
      value: definition.value(item[definition.payload])
    });
  });
  return updates;
}

async function updateSelectedOrInsertByOrderId(conn, table, orderId, updates, insertSql, insertParams) {
  if (!updates.length) return;
  const [result] = await conn.query(
    `UPDATE ${table} SET ${updates.map(([column]) => `${column} = ?`).join(', ')} WHERE order_id = ?`,
    [...updates.map(([, value]) => value), orderId]
  );
  if (Number(result?.affectedRows || 0) === 0) {
    const [[existingRow]] = await conn.query(`SELECT order_id FROM ${table} WHERE order_id = ? LIMIT 1`, [orderId]);
    if (!existingRow) await conn.query(insertSql, insertParams);
  }
}

async function applyOrderModification(conn, orderId, payload) {
  const commission = payload?.commissionData || {};
  const order = commission.orderInfo || {};
  const report = commission.reportInfo || {};
  const handling = commission.sampleHandling || {};
  const requirements = commission.sampleRequirements || {};
  const submittedFormFields = Array.isArray(payload?.workflow?.modifiedFields)
    ? new Set(payload.workflow.modifiedFields)
    : null;
  const sectionChanged = (prefixes) => submittedFormFields == null
    || prefixes.some((prefix) => submittedFormFields.has(prefix)
      || [...submittedFormFields].some((field) => field.startsWith(`${prefix}.`)));

  const [[existing]] = await conn.query('SELECT order_id FROM orders WHERE order_id = ? FOR UPDATE', [orderId]);
  if (!existing) throw Object.assign(new Error('关联的正式委托单不存在'), { status: 409 });

  const orderUpdates = [
    ['customer_id', commission.customerId],
    ['payer_id', clean(commission.paymentId)],
    ['commissioner_id', clean(commission.commissionerId)]
  ];
  if (submittedFormFields == null || submittedFormFields.has('otherRequirements')) orderUpdates.push(['note', clean(order.other_requirements)]);
  if (submittedFormFields == null || submittedFormFields.has('totalPrice')) orderUpdates.push(['total_price', clean(order.total_price)]);
  if (submittedFormFields == null || submittedFormFields.has('deliveryDays')) orderUpdates.push(['delivery_days_after_receipt', clean(order.delivery_days_after_receipt)]);
  if (submittedFormFields == null || submittedFormFields.has('subcontractingNotAccepted')) orderUpdates.push(['subcontracting_not_accepted', order.subcontracting_not_accepted ? 1 : 0]);
  await conn.query(
    `UPDATE orders SET ${orderUpdates.map(([column]) => `${column} = ?`).join(', ')} WHERE order_id = ?`,
    [...orderUpdates.map(([, value]) => value), orderId]
  );
  const reportValues = {
    report_type: JSON.stringify(report.type || []),
    paper_report_shipping_type: clean(report.paper_report_shipping_type),
    report_additional_info: clean(report.report_additional_info),
    header_type: clean(report.header_type),
    header_other: clean(report.header_other),
    format_type: clean(report.format_type),
    report_seals: JSON.stringify(order.report_seals || [])
  };
  const reportUpdates = [];
  const addReportUpdate = (column) => {
    if (!reportUpdates.some(([existingColumn]) => existingColumn === column)) reportUpdates.push([column, reportValues[column]]);
  };
  if (submittedFormFields == null) Object.keys(reportValues).forEach(addReportUpdate);
  else {
    if (submittedFormFields.has('reportType')) {
      ['report_type', 'paper_report_shipping_type', 'report_additional_info', 'header_type', 'header_other', 'format_type'].forEach(addReportUpdate);
    }
    if (submittedFormFields.has('paperReportShippingType')) addReportUpdate('paper_report_shipping_type');
    if (submittedFormFields.has('reportAdditionalInfo')) addReportUpdate('report_additional_info');
    if (submittedFormFields.has('reportHeader')) addReportUpdate('header_type');
    if (submittedFormFields.has('reportHeaderAdditionalInfo')) addReportUpdate('header_other');
    if (submittedFormFields.has('reportForm')) addReportUpdate('format_type');
    if (submittedFormFields.has('reportSeals')) addReportUpdate('report_seals');
  }
  await updateSelectedOrInsertByOrderId(
    conn,
    'reports',
    orderId,
    reportUpdates,
    `INSERT INTO reports
      (order_id, report_type, paper_report_shipping_type, report_additional_info, header_type, header_other, format_type, report_seals)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderId, ...Object.values(reportValues)]
  );
  const handlingParams = [clean(handling.handling_type), handling.return_info ? JSON.stringify(handling.return_info) : null];
  const handlingUpdates = [];
  if (submittedFormFields == null || submittedFormFields.has('sampleSolutionType')) handlingUpdates.push(['handling_type', handlingParams[0]]);
  if (submittedFormFields == null || sectionChanged(['sampleSolutionType', 'sampleReturnInfo', 'sampleShippingAddress'])) handlingUpdates.push(['return_info', handlingParams[1]]);
  await updateSelectedOrInsertByOrderId(
    conn,
    'sample_handling',
    orderId,
    handlingUpdates,
    `INSERT INTO sample_handling (order_id, handling_type, return_info) VALUES (?, ?, ?)`,
    [orderId, ...handlingParams]
  );
  const requirementParams = [
    JSON.stringify(requirements.hazards || []), clean(requirements.hazardOther), clean(requirements.magnetism),
    clean(requirements.conductivity), clean(requirements.breakable), clean(requirements.brittle)
  ];
  const requirementColumns = ['hazards', 'hazard_other', 'magnetism', 'conductivity', 'breakable', 'brittle'];
  const requirementMarkers = [
    'sampleRequirements.hazards', 'sampleRequirements.hazardOther', 'sampleRequirements.magnetism',
    'sampleRequirements.conductivity', 'sampleRequirements.breakable', 'sampleRequirements.brittle'
  ];
  const requirementUpdates = requirementColumns
    .map((column, index) => [column, requirementParams[index], requirementMarkers[index]])
    .filter(([, , marker]) => submittedFormFields == null || submittedFormFields.has(marker))
    .map(([column, value]) => [column, value]);
  await updateSelectedOrInsertByOrderId(
    conn,
    'sample_requirements',
    orderId,
    requirementUpdates,
    `INSERT INTO sample_requirements
      (order_id, hazards, hazard_other, magnetism, conductivity, breakable, brittle)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [orderId, ...requirementParams]
  );

  const items = Array.isArray(commission.testItems) ? commission.testItems : [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const quantity = extractIntegerQuantity(item.quantity);
    if (quantity == null) {
      throw Object.assign(new Error(`第${index + 1}行检测项目的数量必须包含大于 0 的整数`), { status: 400 });
    }
    const testItemId = Number(item.test_item_id);
    if (!Number.isInteger(testItemId) || testItemId <= 0) {
      throw Object.assign(new Error(`第${index + 1}行检测项目缺少正式项目标识，请刷新后重试`), { status: 409 });
    }
    const [[existingItem]] = await conn.query(
      `SELECT test_item_id, category_name, detail_name
       FROM test_items WHERE test_item_id = ? AND order_id = ? FOR UPDATE`,
      [testItemId, orderId]
    );
    if (!existingItem) {
      throw Object.assign(new Error(`第${index + 1}行检测项目不存在或不属于当前委托单`), { status: 409 });
    }
    // 修改申请只写入前端明确标记为改动过的字段。旧版本请求没有标记时，
    // 只兼容写入非空值，避免空字符串把 LIMS 中已有内容覆盖掉。
    // 检测项目名称（category_name/detail_name）始终不在修改申请中更新。
    const updates = modificationItemUpdates(item);
    if (updates.length) {
      await conn.query(
        `UPDATE test_items SET ${updates.map(({ column }) => `${column} = ?`).join(', ')}
         WHERE test_item_id = ? AND order_id = ?`,
        [...updates.map(({ value }) => value), testItemId, orderId]
      );
    }
  }
}

async function appendOrderTestItems(conn, orderId, payload, operatorUserId) {
  const commission = payload?.commissionData || {};
  const items = Array.isArray(commission.testItems) ? commission.testItems : [];
  if (!items.length) throw Object.assign(new Error('加测申请中没有可录入的检测项目'), { status: 400 });
  const [[order]] = await conn.query('SELECT payer_id FROM orders WHERE order_id = ? FOR UPDATE', [orderId]);
  if (!order) throw Object.assign(new Error('关联的正式委托单不存在'), { status: 409 });
  const [[salesperson]] = order.payer_id ? await conn.query(
    `SELECT p.owner_user_id, u.account
     FROM payers p
     LEFT JOIN users u ON u.user_id = p.owner_user_id
     WHERE p.payer_id = ? LIMIT 1`,
    [order.payer_id]
  ) : [[]];

  const insertedIds = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const quantity = extractIntegerQuantity(item.quantity);
    if (quantity == null) {
      throw Object.assign(new Error(`第${index + 1}行加测项目的数量必须包含大于 0 的整数`), { status: 400 });
    }
    const unit = String(item.unit || '').trim();
    if (!unit) throw Object.assign(new Error(`第${index + 1}行加测项目缺少单位`), { status: 400 });
    const fullName = String(item.test_item || '').trim();
    const parts = fullName.split(' - ');
    let categoryName = (parts[0] || '').trim();
    let detailName = (parts.slice(1).join(' - ') || '').trim();
    let price = null;
    if (item.price_id) {
      [[price]] = await conn.query(
        `SELECT price_id, category_name, detail_name, test_code, standard_code, department_id, group_id, is_outsourced, amount, \`unit\`
         FROM price WHERE price_id = ? LIMIT 1`,
        [item.price_id]
      );
      if (price) { categoryName = price.category_name || categoryName; detailName = price.detail_name || detailName; }
    }
    if (!categoryName) throw Object.assign(new Error(`第${index + 1}行加测项目名称不完整`), { status: 400 });
    const departmentId = price?.department_id || clean(item.department_id);
    const groupId = price?.group_id || clean(item.group_id);
    let supervisorAccount = null;
    if (groupId) {
      const [[supervisor]] = await conn.query(
        `SELECT account FROM users WHERE group_id = ? AND group_role = 'supervisor' AND is_active = 1 ORDER BY user_id LIMIT 1`,
        [groupId]
      );
      supervisorAccount = supervisor?.account || null;
    }
    const [result] = await conn.query(
      `INSERT INTO test_items
        (order_id, price_id, category_name, detail_name, test_code, standard_code, department_id, group_id,
         quantity, unit_price, discount_rate, final_unit_price, line_total, is_add_on, is_outsourced, seq_no,
         sample_name, material, sample_type, original_no, sample_preparation, note, business_note, price_note,
         arrival_mode, sample_arrival_status, service_urgency, status, supervisor_id, \`unit\`, unit_mismatch_reviewed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)`,
      [
        orderId, clean(item.price_id), categoryName, detailName, clean(item.test_code || price?.test_code), clean(item.test_method || price?.standard_code),
        departmentId, groupId, quantity, clean(price?.amount ?? item.unit_price), clean(item.discount_rate), price?.is_outsourced ? 1 : 0,
        clean(item.seq_no), clean(item.sample_name), clean(item.material), clean(item.sample_type), clean(item.original_no), clean(item.sample_preparation), clean(item.note), null, clean(item.price_note),
        item.arrival_mode === 'mail' ? 'delivery' : clean(item.arrival_mode), ['arrived','not_arrived'].includes(item.sample_arrival_status) ? item.sample_arrival_status : 'arrived',
        item.service_urgency || 'normal', supervisorAccount, unit, price?.unit && String(price.unit).trim() !== unit ? 1 : 0
      ]
    );
    insertedIds.push(result.insertId);
    if (salesperson?.owner_user_id) {
      await conn.query(
        `UPDATE test_items SET current_assignee = ?, status = 'assigned' WHERE test_item_id = ?`,
        [salesperson.owner_user_id, result.insertId]
      );
    }
    // assignments.assigned_to 外键指向 users.user_id，优先使用付款方明确绑定的 owner_user_id。
    const businessAccount = salesperson?.owner_user_id || salesperson?.account || null;
    const assignedTo = supervisorAccount || businessAccount;
    const assignmentCreator = salesperson?.owner_user_id || operatorUserId;
    if (supervisorAccount && businessAccount) {
      // 普通开单的标准项目会同时保留“业务员”和“组长”两条记录。LIMS 通过
      // note='业务员' 的 assigned_to 识别业务负责人；加测也必须保持同样结构，
      // 仅修改 created_by 并不能阻止 LIMS 回退显示执行加测录入的开单员。
      await conn.query(
        `INSERT INTO assignments (test_item_id, assigned_to, supervisor_id, is_active, note, created_by)
         VALUES (?, ?, ?, 0, '业务员', ?)`,
        [result.insertId, businessAccount, supervisorAccount, assignmentCreator]
      );
      await conn.query(
        `INSERT INTO assignments (test_item_id, assigned_to, supervisor_id, is_active, note, created_by)
         VALUES (?, ?, ?, 1, '组长', ?)`,
        [result.insertId, supervisorAccount, supervisorAccount, assignmentCreator]
      );
    } else if (assignedTo) {
      await conn.query(
        `INSERT INTO assignments (test_item_id, assigned_to, supervisor_id, is_active, note, created_by)
         VALUES (?, ?, ?, 1, '业务员', ?)`,
        [result.insertId, assignedTo, supervisorAccount, assignmentCreator]
      );
    }
  }
  return insertedIds;
}

async function getOrderTestItemsForFlow(conn, orderId) {
  const [items] = await conn.query(
    `SELECT ti.test_item_id, ti.sample_name, ti.material, ti.sample_type, ti.original_no,
            CONCAT_WS(' - ', NULLIF(ti.category_name, ''), NULLIF(ti.detail_name, '')) AS test_item,
            ti.standard_code AS test_method, ti.quantity, ti.department_id, ti.note,
            ti.test_code, ti.seq_no, ti.service_urgency, ti.is_add_on
     FROM test_items ti
     WHERE ti.order_id = ?
     ORDER BY ti.test_item_id`,
    [orderId]
  );
  return items;
}

module.exports = { applyOrderModification, appendOrderTestItems, getOrderTestItemsForFlow, modificationItemUpdates };
