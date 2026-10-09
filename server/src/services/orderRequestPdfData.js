const SAMPLE_TYPE_LABELS = {
  1: '板材',
  2: '棒材',
  3: '粉末',
  4: '液体',
  5: '其他'
};

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null) ?? '';
}

function sourceBusinessItems(submittedPayload) {
  const snapshot = submittedPayload?.formSnapshot || {};
  const snapshotItems = Array.isArray(snapshot.businessTestItems)
    ? snapshot.businessTestItems
    : (Array.isArray(snapshot.formData?.testItems) ? snapshot.formData.testItems : null);

  if (snapshotItems) return snapshotItems;

  // 兼容上线前已提交、尚未保存 formSnapshot.businessTestItems 的历史申请。
  return Array.isArray(submittedPayload?.templateData?.testItems)
    ? submittedPayload.templateData.testItems
    : [];
}

function isCancelledBusinessItem(item = {}) {
  return Boolean(item.cancelled_in_additional_test || item.cancelled);
}

function isRestoredBusinessItem(item = {}) {
  return Boolean(item.restored_in_additional_test || item.restored);
}

function normalizeItemValue(value) {
  return String(value ?? '').trim().replace(/\r\n/g, '\n').toLowerCase();
}

function businessItemFingerprint(item = {}) {
  return [
    firstDefined(item.sampleName, item.sample_name),
    item.material,
    firstDefined(item.sampleType, item.sample_type),
    firstDefined(item.sampleTypeCustom, item.sample_type_custom),
    firstDefined(item.original_no, item.originalNo),
    item.test_item,
    firstDefined(item.test_method, item.testMethod),
    item.quantity
  ].map(normalizeItemValue).join('\u0001');
}

function sameBusinessItem(left = {}, right = {}) {
  const leftFingerprint = businessItemFingerprint(left);
  const rightFingerprint = businessItemFingerprint(right);
  const hasBusinessIdentity = (item) => [
    firstDefined(item.sampleName, item.sample_name), item.material,
    firstDefined(item.original_no, item.originalNo), item.test_item,
    firstDefined(item.test_method, item.testMethod), item.quantity
  ].some((value) => normalizeItemValue(value) !== '');
  if (hasBusinessIdentity(left) && hasBusinessIdentity(right)) return leftFingerprint === rightFingerprint;
  const leftId = firstDefined(left.test_item_id, left.testItemId);
  const rightId = firstDefined(right.test_item_id, right.testItemId);
  return leftId !== '' && rightId !== '' && String(leftId) === String(rightId);
}

function mergeBusinessItems(currentPayload, additionalPayloads = []) {
  const merged = sourceBusinessItems(currentPayload).filter((item) => !isCancelledBusinessItem(item));

  additionalPayloads.forEach((payload) => {
    const items = sourceBusinessItems(payload);
    // 加测快照中的“取消”行代表删除此前已存在的原项目，而不只是隐藏这份快照本身。
    items.filter(isCancelledBusinessItem).forEach((cancelledItem) => {
      const existingIndex = merged.findIndex((item) => sameBusinessItem(item, cancelledItem));
      if (existingIndex >= 0) merged.splice(existingIndex, 1);
    });
    items.filter(isRestoredBusinessItem).forEach((restoredItem) => {
      if (!merged.some((item) => sameBusinessItem(item, restoredItem))) merged.push(restoredItem);
    });
    merged.push(...items.filter((item) => !isCancelledBusinessItem(item) && !isRestoredBusinessItem(item)));
  });

  return merged;
}

function formatBusinessItem(item, index) {
  const rawSampleType = firstDefined(item.sampleType, item.sample_type);
  const sampleTypeLabel = String(rawSampleType) === '5'
    ? firstDefined(item.sampleTypeCustom, item.sample_type_custom, SAMPLE_TYPE_LABELS[5])
    : firstDefined(item.sampleTypeLabel, SAMPLE_TYPE_LABELS[rawSampleType], rawSampleType);
  return {
    idx: index + 1,
    sample_name: firstDefined(item.sampleName, item.sample_name),
    material: firstDefined(item.material),
    sampleTypeLabel,
    original_no: firstDefined(item.original_no, item.originalNo),
    test_item: firstDefined(item.test_item),
    test_method: firstDefined(item.test_method, item.testMethod),
    quantity: firstDefined(item.quantity),
    note: firstDefined(item.note, item.remarks)
  };
}

function businessItemsFromSubmittedPayload(submittedPayload) {
  return sourceBusinessItems(submittedPayload)
    .filter((item) => !isCancelledBusinessItem(item))
    .map(formatBusinessItem);
}

function originalApplicationSignatureDates(submittedPayload, fallbackDate = '') {
  const templateData = submittedPayload?.templateData || {};
  const customerDate = templateData.customer_signature_date || templateData.sales_signature_date || fallbackDate || '';
  const salesDate = templateData.sales_signature_date || templateData.customer_signature_date || fallbackDate || '';
  return { customerDate, salesDate };
}

function explicitOtherRequirements(payload) {
  const form = payload?.formSnapshot?.formData;
  if (Object.prototype.hasOwnProperty.call(form || {}, 'otherRequirements')) {
    return form.otherRequirements ?? '';
  }
  const order = payload?.commissionData?.orderInfo;
  if (Object.prototype.hasOwnProperty.call(order || {}, 'other_requirements')) {
    return order.other_requirements ?? '';
  }
  return undefined;
}

function buildOrderRequestPdfTemplateData(reviewedPayload, submittedPayload, orderId, additionalSubmittedPayloads = [], originalApplicationDate = '') {
  const currentTemplateData = reviewedPayload?.templateData || submittedPayload?.templateData;
  if (!currentTemplateData) return null;
  const originalDates = originalApplicationSignatureDates(submittedPayload, originalApplicationDate);
  // 普通申请仍以业务最初提交的检测项目为准；修改申请审批通过后，
  // 第一个参数由路由传入 submitted_payload 中本次修改后的完整业务快照，PDF 必须改用它。
  const isModification = reviewedPayload?.workflow?.requestType === 'modification';
  const currentBusinessItemsPayload = isModification ? reviewedPayload : submittedPayload;
  const testItems = mergeBusinessItems(currentBusinessItemsPayload, additionalSubmittedPayloads)
    .map(formatBusinessItem);
  const latestAdditionalOtherRequirements = [...additionalSubmittedPayloads]
    .reverse()
    .map(explicitOtherRequirements)
    .find((value) => value !== undefined);
  return {
    ...currentTemplateData,
    ...(latestAdditionalOtherRequirements !== undefined
      ? { other_requirements: latestAdditionalOtherRequirements }
      : {}),
    order_num: orderId,
    commissioner_id: currentTemplateData.commissioner_id
      || reviewedPayload?.commissionData?.commissionerId
      || submittedPayload?.commissionData?.commissionerId
      || '',
    customer_signature_date: originalDates.customerDate,
    sales_signature_date: originalDates.salesDate,
    testItems
  };
}

function additionalTestsAfterModification(additionalTests = [], modificationReviewedAt = null) {
  if (!modificationReviewedAt) return additionalTests;
  const cutoff = new Date(modificationReviewedAt).getTime();
  if (!Number.isFinite(cutoff)) return additionalTests;
  // 修改快照是业务检测项目的完整快照，其中已包含此前完成录入的加测项。
  // 这里只再追加修改审批后才完成录入的加测，避免 PDF 重复显示旧加测项目。
  return additionalTests.filter((item) => {
    const appliedAt = new Date(item?.applied_at).getTime();
    return Number.isFinite(appliedAt) && appliedAt > cutoff;
  });
}

module.exports = {
  buildOrderRequestPdfTemplateData,
  businessItemsFromSubmittedPayload,
  originalApplicationSignatureDates,
  additionalTestsAfterModification
};
