const test = require('node:test');
const assert = require('node:assert/strict');
const PizZip = require('pizzip');
const { buildProcessTemplateData, generateProcessTemplateBuffer, resolveFlowUrgency } = require('./processTemplate');

test('流转单同时输出模板使用的加急勾选字段', () => {
  for (const [urgency, expected] of [
    ['normal', ['☑', '☐', '☐']],
    ['urgent_1_5x', ['☐', '☑', '☐']],
    ['urgent_2x', ['☐', '☐', '☑']]
  ]) {
    const data = buildProcessTemplateData({ commissionData: { orderInfo: { order_urgency_type: urgency } } }, 'TEST001');
    assert.deepEqual(
      [data.serviceType1Symbol, data.serviceType2Symbol, data.serviceType3Symbol],
      expected
    );
    assert.equal(Object.values(data).includes(undefined), false);
  }
});

test('流转单采用委托单周期和检测项目中的最高加急级别', () => {
  assert.equal(resolveFlowUrgency({
    commissionData: { orderInfo: { order_urgency_type: 'normal' } }
  }, [{ service_urgency: 'urgent_1_5x' }]), 'urgent_1_5x');
  assert.equal(resolveFlowUrgency({
    formSnapshot: { formData: { orderUrgencyType: 'urgent_1_5x' } }
  }, [{ service_urgency: 'urgent_2x' }]), 'urgent_2x');
});

test('流转单模板渲染后不出现 undefined', async () => {
  const data = buildProcessTemplateData({ commissionData: { orderInfo: { order_urgency_type: 'urgent_2x' } } }, 'TEST001');
  const buffer = await generateProcessTemplateBuffer(data);
  const documentXml = new PizZip(buffer).file('word/document.xml').asText();
  assert.doesNotMatch(documentXml, /undefined/i);
});
