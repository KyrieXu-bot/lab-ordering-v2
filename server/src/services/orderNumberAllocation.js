function parsePayload(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return null; }
}

function extractReservedOrderId(payload) {
  return String(parsePayload(payload)?.workflow?.reservedOrderId || '').trim();
}

function monthPrefixForChoice(baseDate, choice = 'current') {
  const date = baseDate instanceof Date ? new Date(baseDate) : new Date(String(baseDate || ''));
  if (Number.isNaN(date.getTime())) throw new Error('日期无效，无法生成委托单号');
  const monthOffset = choice === 'previous' ? -1 : choice === 'next' ? 1 : 0;
  const targetDate = new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
  return `JC${String(targetDate.getFullYear()).slice(-2)}${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
}

function targetOrderPrefix(submittedAt, payload) {
  const submittedDate = submittedAt instanceof Date ? new Date(submittedAt) : new Date(String(submittedAt || ''));
  if (Number.isNaN(submittedDate.getTime())) throw new Error('申请提交时间无效，无法生成委托单号');
  const parsedPayload = parsePayload(payload) || {};
  const choice = parsedPayload?.formSnapshot?.orderMonthPreference?.choice === 'next' ? 'next' : 'current';
  return monthPrefixForChoice(submittedDate, choice);
}

function sequenceForOrderId(orderId, prefix) {
  const match = String(orderId || '').match(new RegExp(`^${prefix}(\\d{1,4})$`));
  return match ? Number(match[1]) : null;
}

function nextReviewerCreatedOrderId({ prefix, formalOrderIds = [], approvedReservedOrderIds = [] }) {
  let monthlyMaximum = 0;
  for (const orderId of [...formalOrderIds, ...approvedReservedOrderIds]) {
    const sequence = sequenceForOrderId(orderId, prefix);
    if (sequence != null) monthlyMaximum = Math.max(monthlyMaximum, sequence);
  }
  const nextSequence = monthlyMaximum + 1;
  if (nextSequence > 9999) throw new Error(`${prefix} 月份委托单序号已超过四位数`);
  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
}

function allocateOrderId({ prefix, targetRequestId, orderIds, requestRows }) {
  const assignedOrderIds = new Set();
  for (const row of requestRows) {
    const assigned = String(row.approved_order_id || extractReservedOrderId(row.reviewed_payload) || '').trim();
    if (sequenceForOrderId(assigned, prefix) != null) assignedOrderIds.add(assigned);
  }

  let monthlyMaximum = 0;
  for (const orderId of orderIds) {
    const sequence = sequenceForOrderId(orderId, prefix);
    if (sequence == null) continue;
    monthlyMaximum = Math.max(monthlyMaximum, sequence);
  }
  for (const orderId of assignedOrderIds) {
    const sequence = sequenceForOrderId(orderId, prefix);
    if (sequence != null) monthlyMaximum = Math.max(monthlyMaximum, sequence);
  }

  const targetRow = requestRows.find((row) => String(row.request_id) === String(targetRequestId));
  if (!targetRow || targetRow.status !== 'submitted' || targetRow.approved_order_id || extractReservedOrderId(targetRow.reviewed_payload)) {
    throw new Error('当前申请不在可分配委托单号的待审批队列中');
  }
  if (targetOrderPrefix(targetRow.submitted_at, targetRow.submitted_payload) !== prefix) {
    throw new Error('申请期望月份与委托单号月份不一致');
  }
  const nextSequence = monthlyMaximum + 1;
  if (nextSequence > 9999) throw new Error(`${prefix} 月份委托单序号已超过四位数`);
  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
}

function buildApprovedPayload(submittedPayload, orderId, approvedAt) {
  const payload = parsePayload(submittedPayload);
  if (!payload) throw new Error('申请内容损坏，无法完成审批');
  const nextPayload = JSON.parse(JSON.stringify(payload));
  nextPayload.workflow = {
    ...(nextPayload.workflow || {}),
    reservedOrderId: orderId,
    approvedAt
  };
  nextPayload.commissionData = nextPayload.commissionData || {};
  nextPayload.commissionData.orderInfo = {
    ...(nextPayload.commissionData.orderInfo || {}),
    order_num: orderId
  };
  nextPayload.templateData = { ...(nextPayload.templateData || {}), order_num: orderId };
  nextPayload.formSnapshot = nextPayload.formSnapshot || {};
  nextPayload.formSnapshot.formData = {
    ...(nextPayload.formSnapshot.formData || {}),
    orderNum: orderId,
    testItems: []
  };
  return nextPayload;
}

module.exports = {
  allocateOrderId,
  buildApprovedPayload,
  extractReservedOrderId,
  targetOrderPrefix,
  monthPrefixForChoice,
  nextReviewerCreatedOrderId
};
