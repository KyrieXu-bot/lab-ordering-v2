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

function buildOrderRequestPdfTemplateData(reviewedPayload, submittedPayload, orderId, additionalSubmittedPayloads = []) {
  const currentTemplateData = reviewedPayload?.templateData || submittedPayload?.templateData;
  if (!currentTemplateData) return null;
  const testItems = [
    ...businessItemsFromSubmittedPayload(submittedPayload),
    ...additionalSubmittedPayloads.flatMap((payload) => businessItemsFromSubmittedPayload(payload))
  ].map((item, index) => ({ ...item, idx: index + 1 }));
  return {
    ...currentTemplateData,
    order_num: orderId,
    testItems
  };
}

module.exports = { buildOrderRequestPdfTemplateData, businessItemsFromSubmittedPayload };
