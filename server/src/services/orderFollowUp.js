const { extractIntegerQuantity } = require('./testItemQuantity');

function clean(value) {
  return value == null || String(value).trim() === '' ? null : value;
}

async function updateOrInsertByOrderId(conn, updateSql, updateParams, insertSql, insertParams) {
  const [result] = await conn.query(updateSql, updateParams);
  if (Number(result?.affectedRows || 0) === 0) {
    await conn.query(insertSql, insertParams);
  }
}

async function applyOrderModification(conn, orderId, payload) {
  const commission = payload?.commissionData || {};
  const order = commission.orderInfo || {};
  const report = commission.reportInfo || {};
  const handling = commission.sampleHandling || {};
  const requirements = commission.sampleRequirements || {};

  const [[existing]] = await conn.query('SELECT order_id FROM orders WHERE order_id = ? FOR UPDATE', [orderId]);
  if (!existing) throw Object.assign(new Error('关联的正式委托单不存在'), { status: 409 });

  await conn.query(
    `UPDATE orders
     SET customer_id = ?, payer_id = ?, commissioner_id = ?, note = ?, total_price = ?,
         delivery_days_after_receipt = ?, subcontracting_not_accepted = ?
     WHERE order_id = ?`,
    [
      commission.customerId,
      clean(commission.paymentId),
      clean(commission.commissionerId),
      clean(order.other_requirements),
      clean(order.total_price),
      clean(order.delivery_days_after_receipt),
      order.subcontracting_not_accepted ? 1 : 0,
      orderId
    ]
  );
  await conn.query(
    `INSERT INTO reports
      (order_id, report_type, paper_report_shipping_type, report_additional_info, header_type, header_other, format_type, report_seals)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE report_type = VALUES(report_type),
       paper_report_shipping_type = VALUES(paper_report_shipping_type),
       report_additional_info = VALUES(report_additional_info), header_type = VALUES(header_type),
       header_other = VALUES(header_other), format_type = VALUES(format_type), report_seals = VALUES(report_seals)`,
    [orderId, JSON.stringify(report.type || []), clean(report.paper_report_shipping_type), clean(report.report_additional_info), clean(report.header_type), clean(report.header_other), clean(report.format_type), JSON.stringify(order.report_seals || [])]
  );
  const handlingParams = [clean(handling.handling_type), handling.return_info ? JSON.stringify(handling.return_info) : null];
  await updateOrInsertByOrderId(
    conn,
    `UPDATE sample_handling SET handling_type = ?, return_info = ? WHERE order_id = ?`,
    [...handlingParams, orderId],
    `INSERT INTO sample_handling (order_id, handling_type, return_info) VALUES (?, ?, ?)`,
    [orderId, ...handlingParams]
  );
  const requirementParams = [
    JSON.stringify(requirements.hazards || []), clean(requirements.hazardOther), clean(requirements.magnetism),
    clean(requirements.conductivity), clean(requirements.breakable), clean(requirements.brittle)
  ];
  await updateOrInsertByOrderId(
    conn,
    `UPDATE sample_requirements
     SET hazards = ?, hazard_other = ?, magnetism = ?, conductivity = ?, breakable = ?, brittle = ?
     WHERE order_id = ?`,
    [...requirementParams, orderId],
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
    // 检测项目名称（category_name/detail_name）不在修改申请中更新。
    await conn.query(
      `UPDATE test_items
       SET sample_name = ?, material = ?, sample_type = ?, original_no = ?, standard_code = ?,
           quantity = ?, note = ?, business_note = ?, arrival_mode = ?, sample_arrival_status = ?
       WHERE test_item_id = ? AND order_id = ?`,
      [
        clean(item.sample_name), clean(item.material), clean(item.sample_type), clean(item.original_no), clean(item.test_method),
        quantity, clean(item.note), clean(item.flow_note), item.arrival_mode === 'mail' ? 'delivery' : clean(item.arrival_mode),
        ['arrived', 'not_arrived'].includes(item.sample_arrival_status) ? item.sample_arrival_status : 'not_arrived',
        testItemId, orderId
      ]
    );
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
        clean(item.seq_no), clean(item.sample_name), clean(item.material), clean(item.sample_type), clean(item.original_no), clean(item.sample_preparation), clean(item.note), clean(item.flow_note), clean(item.price_note),
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
    const assignedTo = supervisorAccount || salesperson?.account || null;
    if (assignedTo) {
      await conn.query(
        `INSERT INTO assignments (test_item_id, assigned_to, supervisor_id, is_active, note, created_by)
         VALUES (?, ?, ?, 1, '加测申请', ?)`,
        [result.insertId, assignedTo, supervisorAccount, operatorUserId]
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
            ti.test_code, ti.seq_no, ti.service_urgency, ti.business_note AS flow_note, ti.is_add_on
     FROM test_items ti
     WHERE ti.order_id = ?
     ORDER BY ti.test_item_id`,
    [orderId]
  );
  return items;
}

module.exports = { applyOrderModification, appendOrderTestItems, getOrderTestItemsForFlow };
