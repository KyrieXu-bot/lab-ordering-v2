const path = require('path');
const fs = require('fs').promises;
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

function includes(values, value) {
  return Array.isArray(values) && values.includes(value);
}

function buildProcessTemplateData(packet = {}, orderNum, testItems = [], now = new Date()) {
  const commission = packet.commissionData || {};
  const order = commission.orderInfo || {};
  const report = commission.reportInfo || {};
  const handling = commission.sampleHandling || {};
  const requirements = commission.sampleRequirements || {};
  const customer = packet.formSnapshot?.selectedCustomer || {};
  const items = Array.isArray(testItems) ? testItems : [];
  const hasDept = (id) => items.some((item) => String(item.department_id) === String(id));
  const buckets = { machiningItems: [], mechanicsItems: [], microItems: [], physchemItems: [], chemistryItems: [] };

  items.forEach((item, index) => {
    const [namePart, ...conditionParts] = String(item.test_item || '').split(' - ').map((value) => value.trim());
    const row = {
      idx: index + 1,
      sample_code: `${orderNum} - ${String(index + 1).padStart(3, '0')}`,
      test_item: namePart || '',
      project_code: item.test_code ? (conditionParts.length ? `${item.test_code}-${conditionParts.join(' - ')}` : item.test_code) : '',
      method: item.test_method || '',
      quantity: item.quantity || '',
      note: item.note || '',
      original_no: item.original_no || '',
      sample_name: item.sample_name || ''
    };
    if (String(item.test_code || '').startsWith('LX')) buckets.machiningItems.push(row);
    else if (String(item.department_id) === '3') buckets.mechanicsItems.push(row);
    else if (String(item.department_id) === '1') buckets.microItems.push(row);
    else if (String(item.department_id) === '2') buckets.physchemItems.push(row);
    else if (String(item.department_id) === '6') buckets.chemistryItems.push(row);
  });

  const reportTypes = Array.isArray(report.type) ? report.type : [];
  const reportSeals = Array.isArray(order.report_seals) ? order.report_seals : [];
  const hazards = Array.isArray(requirements.hazards) ? requirements.hazards : [];
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const urgency = order.order_urgency_type || 'normal';
  return {
    order_num: orderNum,
    customer_name: customer.customer_name || '',
    customer_contactName: customer.contact_name || '',
    machiningCenterSymbol: buckets.machiningItems.length ? '☑' : '☐',
    mechanicsSymbol: buckets.mechanicsItems.length ? '☑' : '☐',
    microSymbol: hasDept(1) ? '☑' : '☐',
    physchemSymbol: hasDept(2) ? '☑' : '☐',
    chemistrySymbol: hasDept(6) ? '☑' : '☐',
    sampleReceivedDate: date,
    showMechanicsTable: hasDept(3), showMicroTable: hasDept(1), showPhyschemTable: hasDept(2), showChemistryTable: hasDept(6),
    reportContent1Symbol: includes(reportTypes, 1) ? '☑' : '☐',
    reportContent2Symbol: includes(reportTypes, 2) ? '☑' : '☐',
    reportContent3Symbol: includes(reportTypes, 3) ? '☑' : '☐',
    reportContent6Symbol: includes(reportTypes, 6) ? '☑' : '☐',
    reportSeals1Symbol: includes(reportSeals, 'normal') ? '☑' : '☐',
    reportSeals2Symbol: includes(reportSeals, 'cnas') ? '☑' : '☐',
    reportSeals3Symbol: includes(reportSeals, 'cma') ? '☑' : '☐',
    reportForm1Symbol: String(report.format_type || '') === '1' ? '☑' : '☐',
    reportForm2Symbol: String(report.format_type || '') === '2' ? '☑' : '☐',
    headerType1Symbol: String(report.header_type || '') === '1' ? '☑' : '☐',
    headerType2Symbol: String(report.header_type || '') === '2' ? '☑' : '☐',
    header_additional_info: report.header_other || '',
    orderUrgencyNormalSymbol: urgency === 'normal' ? '☑' : '☐',
    orderUrgency15Symbol: urgency === 'urgent_1_5x' ? '☑' : '☐',
    orderUrgency2Symbol: urgency === 'urgent_2x' ? '☑' : '☐',
    delivery_days_after_receipt: order.delivery_days_after_receipt || '',
    returnNoSymbol: String(handling.handling_type || '') === '1' ? '☑' : '☐',
    returnPickupSymbol: String(handling.handling_type || '') === '2' ? '☑' : '☐',
    returnMailSymbol: String(handling.handling_type || '') === '3' ? '☑' : '☐',
    other_requirements: order.other_requirements || '',
    hazardSafetySymbol: includes(hazards, 'Safety') ? '☑ 无危险性' : null,
    hazardFlammabilitySymbol: includes(hazards, 'Flammability') ? '☑ 易燃易爆' : null,
    hazardIrritationSymbol: includes(hazards, 'Irritation') ? '☑ 刺激性' : null,
    hazardVolatilitySymbol: includes(hazards, 'Volatility') ? '☑ 易挥发' : null,
    hazardFragileSymbol: includes(hazards, 'Fragile') ? '☑ 易碎' : null,
    hazardOtherSymbol: includes(hazards, 'Other') ? `☑ 其他: ${requirements.hazardOther || requirements.hazard_other || ''}` : null,
    magnetismNonMagneticSymbol: requirements.magnetism === 'Non-magnetic' ? '☑ 无磁' : null,
    magnetismWeakMagneticSymbol: requirements.magnetism === 'Weak-magnetic' ? '☑ 弱磁' : null,
    magnetismStrongMagneticSymbol: requirements.magnetism === 'Strong-magnetic' ? '☑ 强磁' : null,
    magnetismUnknownSymbol: requirements.magnetism === 'Unknown' ? '☑ 未知' : null,
    conductivityConductorSymbol: requirements.conductivity === 'Conductor' ? '☑ 导体' : null,
    conductivitySemiconductorSymbol: requirements.conductivity === 'Semiconductor' ? '☑ 半导体' : null,
    conductivityInsulatorSymbol: requirements.conductivity === 'Insulator' ? '☑ 绝缘体' : null,
    conductivityUnknownSymbol: requirements.conductivity === 'Unknown' ? '☑ 未知' : null,
    breakableYesSymbol: requirements.breakable === 'yes' ? '☑ 是' : null,
    brittleYesSymbol: requirements.brittle === 'yes' ? '☑ 是' : null,
    brittleNoSymbol: requirements.brittle === 'no' ? '☑ 否' : null,
    projectLeader: '',
    ...buckets
  };
}

async function generateProcessTemplateBuffer(flowData) {
  const templatePath = path.resolve(__dirname, '..', '..', 'templates', 'process_template.docx');
  const templateBuffer = await fs.readFile(templatePath);
  if (!templateBuffer.length) throw new Error('流转单模板文件为空');
  const doc = new Docxtemplater(new PizZip(templateBuffer));
  doc.setData(flowData);
  doc.render();
  return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = { buildProcessTemplateData, generateProcessTemplateBuffer };
