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

function businessItemsFromSubmittedPayload(submittedPayload) {
  const snapshot = submittedPayload?.formSnapshot || {};
  const snapshotItems = Array.isArray(snapshot.businessTestItems)
    ? snapshot.businessTestItems
    : (Array.isArray(snapshot.formData?.testItems) ? snapshot.formData.testItems : null);

  if (snapshotItems) {
    return snapshotItems.map((item, index) => {
      const rawSampleType = firstDefined(item.sampleType, item.sample_type);
      const sampleTypeLabel = String(rawSampleType) === '5'
        ? firstDefined(item.sampleTypeCustom, item.sample_type_custom, SAMPLE_TYPE_LABELS[5])
        : firstDefined(SAMPLE_TYPE_LABELS[rawSampleType], rawSampleType);
      return {
        idx: index + 1,
        sample_name: firstDefined(item.sampleName, item.sample_name),
        material: firstDefined(item.material),
        sampleTypeLabel,
        original_no: firstDefined(item.original_no),
        test_item: firstDefined(item.test_item),
        test_method: firstDefined(item.test_method),
        quantity: firstDefined(item.quantity),
        note: firstDefined(item.note)
      };
    });
  }

  // 兼容上线前已提交、尚未保存 formSnapshot.businessTestItems 的历史申请。
  const legacyItems = submittedPayload?.templateData?.testItems;
  return Array.isArray(legacyItems)
    ? legacyItems.map((item, index) => ({ ...item, idx: index + 1 }))
    : [];
}

function originalApplicationSignatureDates(submittedPayload, fallbackDate = '') {
  const templateData = submittedPayload?.templateData || {};
  const customerDate = templateData.customer_signature_date || templateData.sales_signature_date || fallbackDate || '';
  const salesDate = templateData.sales_signature_date || templateData.customer_signature_date || fallbackDate || '';
  return { customerDate, salesDate };
}

function buildOrderRequestPdfTemplateData(reviewedPayload, submittedPayload, orderId, additionalSubmittedPayloads = [], originalApplicationDate = '') {
  const currentTemplateData = reviewedPayload?.templateData || submittedPayload?.templateData;
  if (!currentTemplateData) return null;
  const originalDates = originalApplicationSignatureDates(submittedPayload, originalApplicationDate);
  // 普通申请仍以业务最初提交的检测项目为准；修改申请审批通过后，
  // reviewedPayload 中保存的是本次修改后的完整业务快照，PDF 必须改用它。
  const isModification = reviewedPayload?.workflow?.requestType === 'modification';
  const currentBusinessItemsPayload = isModification ? reviewedPayload : submittedPayload;
  const testItems = [
    ...businessItemsFromSubmittedPayload(currentBusinessItemsPayload),
    ...additionalSubmittedPayloads.flatMap((payload) => businessItemsFromSubmittedPayload(payload))
  ].map((item, index) => ({ ...item, idx: index + 1 }));
  return {
    ...currentTemplateData,
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
  // 修改快照是审批时正式检测项目的完整快照，其中已包含此前完成录入的加测项。
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
