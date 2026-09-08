import React, { useState, useEffect, useRef } from 'react';
import {
  getCommission,
  createCommission,
  generateDirectOrderPdf,
  getSalesperson,
  getCustomers,
  getPayers,
  prefillPayment,
  getPrices,
  getSalespersonContact,
  getSalespersonByPayer,
  getSalespersonSignature,
  getCommissionerSignature,
  uploadCommissionerSignature,
  deleteCommissionerSignature,
  searchOrders,
  checkOrder,
  getOrderRequest,
  createOrderRequest,
  createOrderFollowUp,
  updateOrderRequest,
  getOrderRequestFiles,
  uploadOrderRequestFile,
  downloadOrderRequestFile,
  deleteOrderRequestFile,
  openOrderRequest,
  generateOrderRequestPdf,
  downloadOrderRequestTestItemsWord
} from '../api/api';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../auth';
import OrderRequestPreviewModal from '../components/OrderRequestPreviewModal';
import '../css/Form.css'

function buildOrderUrgencySymbols(value = 'normal') {
  const urgency = ['normal', 'urgent_1_5x', 'urgent_2x'].includes(value) ? value : 'normal';
  return {
    orderUrgencyNormalSymbol: urgency === 'normal' ? '☑' : '☐',
    orderUrgencyUrgentSymbol: urgency === 'urgent_1_5x' ? '☑' : '☐',
    orderUrgencySpecialUrgentSymbol: urgency === 'urgent_2x' ? '☑' : '☐',
    // 兼容旧模板变量；新模板请优先使用上面的 orderUrgency*Symbol。
    serviceType1Symbol: urgency === 'normal' ? '☑' : '☐',
    serviceType2Symbol: urgency === 'urgent_1_5x' ? '☑' : '☐',
    serviceType3Symbol: urgency === 'urgent_2x' ? '☑' : '☐'
  };
}

function buildRequestTemplateData(commissionData, context) {
  const { selectedCustomer, selectedPayer, salesUserId, salesName, salesEmail, salesPhone, salesSignatureDate } = context;
  const sampleTypeMap = { 1: '板材', 2: '棒材', 3: '粉末', 4: '液体', 5: '其他' };
  const reportTypes = commissionData.reportInfo.type || [];
  const seals = commissionData.orderInfo.report_seals || [];
  return {
    ...buildOrderUrgencySymbols(commissionData.orderInfo.order_urgency_type),
    reportSeals1Symbol: seals.includes('normal') ? '☑' : '☐',
    reportSeals2Symbol: seals.includes('cnas') ? '☑' : '☐',
    reportSeals3Symbol: seals.includes('cma') ? '☑' : '☐',
    delivery_days_after_receipt: commissionData.orderInfo.delivery_days_after_receipt || '',
    sample_shipping_address: commissionData.orderInfo.sample_shipping_address || '',
    total_price: commissionData.orderInfo.total_price || '',
    order_num: '',
    other_requirements: commissionData.orderInfo.other_requirements || '',
    subcontractingNotAcceptedSymbol: commissionData.orderInfo.subcontracting_not_accepted ? '☑' : '☐',
    invoiceType1Symbol: '☑', invoiceType2Symbol: '☐',
    reportContent1Symbol: reportTypes.includes(1) ? '☑' : '☐',
    reportContent2Symbol: reportTypes.includes(2) ? '☑' : '☐',
    reportContent3Symbol: reportTypes.includes(3) ? '☑' : '☐',
    reportContent4Symbol: reportTypes.includes(4) ? '☑' : '☐',
    reportContent5Symbol: reportTypes.includes(5) ? '☑' : '☐',
    reportContent6Symbol: reportTypes.includes(6) ? '☑' : '☐',
    paperReportType1Symbol: commissionData.reportInfo.paper_report_shipping_type === '1' ? '☑' : '☐',
    paperReportType2Symbol: commissionData.reportInfo.paper_report_shipping_type === '2' ? '☑' : '☐',
    paperReportType3Symbol: commissionData.reportInfo.paper_report_shipping_type === '3' ? '☑' : '☐',
    headerType1Symbol: commissionData.reportInfo.header_type === '1' ? '☑' : '☐',
    headerType2Symbol: commissionData.reportInfo.header_type === '2' ? '☑' : '☐',
    reportForm1Symbol: commissionData.reportInfo.format_type === '1' ? '☑' : '☐',
    reportForm2Symbol: commissionData.reportInfo.format_type === '2' ? '☑' : '☐',
    report_additional_info: commissionData.reportInfo.report_additional_info || '',
    header_additional_info: commissionData.reportInfo.header_other || '',
    sampleHandlingType1Symbol: commissionData.sampleHandling.handling_type === '1' ? '☑' : '☐',
    sampleHandlingType2Symbol: commissionData.sampleHandling.handling_type === '2' ? '☑' : '☐',
    sampleHandlingType3Symbol: commissionData.sampleHandling.handling_type === '3' ? '☑' : '☐',
    sampleHandlingType4Symbol: commissionData.sampleHandling.handling_type === '4' ? '☑' : '☐',
    returnOptionSameSymbol: commissionData.sampleHandling.return_info?.returnAddressOption === 'same' ? '☑' : '☐',
    returnOptionOtherSymbol: commissionData.sampleHandling.return_info?.returnAddressOption === 'other' ? '☑' : '☐',
    return_address: commissionData.sampleHandling.return_info?.returnAddress || '',
    hazardSafetySymbol: commissionData.sampleRequirements.hazards.includes('Safety') ? '☑' : '☐',
    hazardFlammabilitySymbol: commissionData.sampleRequirements.hazards.includes('Flammability') ? '☑' : '☐',
    hazardIrritationSymbol: commissionData.sampleRequirements.hazards.includes('Irritation') ? '☑' : '☐',
    hazardVolatilitySymbol: commissionData.sampleRequirements.hazards.includes('Volatility') ? '☑' : '☐',
    hazardFragileSymbol: commissionData.sampleRequirements.hazards.includes('Fragile') ? '☑' : '☐',
    hazardOtherSymbol: commissionData.sampleRequirements.hazards.includes('Other') ? '☑' : '☐',
    hazard_other: commissionData.sampleRequirements.hazardOther || '',
    magnetismNonMagneticSymbol: commissionData.sampleRequirements.magnetism === 'Non-magnetic' ? '☑' : '☐',
    magnetismWeakMagneticSymbol: commissionData.sampleRequirements.magnetism === 'Weak-magnetic' ? '☑' : '☐',
    magnetismStrongMagneticSymbol: commissionData.sampleRequirements.magnetism === 'Strong-magnetic' ? '☑' : '☐',
    magnetismUnknownSymbol: commissionData.sampleRequirements.magnetism === 'Unknown' ? '☑' : '☐',
    conductivityConductorSymbol: commissionData.sampleRequirements.conductivity === 'Conductor' ? '☑' : '☐',
    conductivitySemiconductorSymbol: commissionData.sampleRequirements.conductivity === 'Semiconductor' ? '☑' : '☐',
    conductivityInsulatorSymbol: commissionData.sampleRequirements.conductivity === 'Insulator' ? '☑' : '☐',
    conductivityUnknownSymbol: commissionData.sampleRequirements.conductivity === 'Unknown' ? '☑' : '☐',
    breakableYesSymbol: commissionData.sampleRequirements.breakable === 'yes' ? '☑' : '☐',
    breakableNoSymbol: commissionData.sampleRequirements.breakable === 'no' ? '☑' : '☐',
    brittleYesSymbol: commissionData.sampleRequirements.brittle === 'yes' ? '☑' : '☐',
    brittleNoSymbol: commissionData.sampleRequirements.brittle === 'no' ? '☑' : '☐',
    sales_user_id: salesUserId,
    sales_signature_date: salesSignatureDate || '',
    sales_name: salesName, sales_email: salesEmail, sales_phone: salesPhone,
    testItems: commissionData.testItems.map((item, index) => ({
      ...item, idx: index + 1, material: String(item.material || '').trim(),
      sampleTypeLabel: sampleTypeMap[item.sample_type] || item.sample_type || '',
      samplePrepYesSymbol: '☐', samplePrepNoSymbol: '☐'
    })),
    customer_name: selectedCustomer?.customer_name || '',
    customer_address: selectedCustomer?.customer_address || '',
    customer_contactName: selectedCustomer?.contact_name || '',
    customer_contactEmail: selectedCustomer?.contact_email || '',
    customer_contactPhone: selectedCustomer?.contact_phone_num || '',
    payer_name: selectedPayer?.payer_name || '',
    payer_address: selectedPayer?.payer_address || '',
    payer_contactName: selectedPayer?.payer_contact_name || '',
    payer_contactEmail: selectedPayer?.payer_contact_email || '',
    payer_contactPhone: selectedPayer?.payer_contact_phone_num || '',
    payer_bankName: selectedPayer?.bank_name || '',
    payer_taxNumber: selectedPayer?.tax_number || '',
    payer_bankAccount: selectedPayer?.bank_account || ''
  };
}

function buildProcessTemplateData(commissionData, orderNum, selectedCustomer) {
  const hasDept = id => commissionData.testItems.some(item => String(item.department_id) === String(id));
  const now = new Date();
  const receiptDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const machiningItems = [];
  const mechanicsItems = [];
  const microItems = [];
  const physchemItems = [];
  const chemistryItems = [];
  commissionData.testItems.forEach((item, index) => {
    const [namePart, conditionPart] = (item.test_item || '').split(' - ').map(value => value.trim());
    const row = {
      idx: index + 1,
      sample_code: `${orderNum} - ${String(index + 1).padStart(3, '0')}`,
      test_item: namePart || '',
      project_code: item.test_code ? (conditionPart ? `${item.test_code}-${conditionPart}` : item.test_code) : '',
      method: item.test_method,
      quantity: item.quantity,
      note: item.note || '',
      original_no: item.original_no,
      sample_name: item.sample_name
    };
    if (item.test_code && item.test_code.startsWith('LX')) machiningItems.push(row);
    else if (String(item.department_id) === '3') mechanicsItems.push(row);
    else if (String(item.department_id) === '1') microItems.push(row);
    else if (String(item.department_id) === '2') physchemItems.push(row);
    else if (String(item.department_id) === '6') chemistryItems.push(row);
  });
  const reportTypes = commissionData.reportInfo.type || [];
  const reportSeals = commissionData.orderInfo.report_seals || [];
  const requirements = commissionData.sampleRequirements;
  return {
    order_num: orderNum,
    customer_name: selectedCustomer?.customer_name || '',
    customer_contactName: selectedCustomer?.contact_name || '',
    machiningCenterSymbol: machiningItems.length ? '☑' : '☐',
    mechanicsSymbol: mechanicsItems.length ? '☑' : '☐',
    microSymbol: hasDept(1) ? '☑' : '☐',
    physchemSymbol: hasDept(2) ? '☑' : '☐',
    chemistrySymbol: hasDept(6) ? '☑' : '☐',
    sampleReceivedDate: receiptDate,
    showMechanicsTable: hasDept(3),
    showMicroTable: hasDept(1),
    showPhyschemTable: hasDept(2),
    showChemistryTable: hasDept(6),
    reportContent1Symbol: reportTypes.includes(1) ? '☑' : '☐',
    reportContent2Symbol: reportTypes.includes(2) ? '☑' : '☐',
    reportContent3Symbol: reportTypes.includes(3) ? '☑' : '☐',
    reportContent6Symbol: reportTypes.includes(6) ? '☑' : '☐',
    reportSeals1Symbol: reportSeals.includes('normal') ? '☑' : '☐',
    reportSeals2Symbol: reportSeals.includes('cnas') ? '☑' : '☐',
    reportSeals3Symbol: reportSeals.includes('cma') ? '☑' : '☐',
    reportForm1Symbol: commissionData.reportInfo.format_type === '1' ? '☑' : '☐',
    reportForm2Symbol: commissionData.reportInfo.format_type === '2' ? '☑' : '☐',
    headerType1Symbol: commissionData.reportInfo.header_type === '1' ? '☑' : '☐',
    headerType2Symbol: commissionData.reportInfo.header_type === '2' ? '☑' : '☐',
    header_additional_info: commissionData.reportInfo.header_other || '',
    ...buildOrderUrgencySymbols(commissionData.orderInfo.order_urgency_type),
    delivery_days_after_receipt: commissionData.orderInfo.delivery_days_after_receipt,
    returnNoSymbol: commissionData.sampleHandling.handling_type === '1' ? '☑' : '☐',
    returnPickupSymbol: commissionData.sampleHandling.handling_type === '2' ? '☑' : '☐',
    returnMailSymbol: commissionData.sampleHandling.handling_type === '3' ? '☑' : '☐',
    other_requirements: commissionData.orderInfo.other_requirements || '',
    hazardSafetySymbol: requirements.hazards.includes('Safety') ? '☑ 无危险性' : null,
    hazardFlammabilitySymbol: requirements.hazards.includes('Flammability') ? '☑ 易燃易爆' : null,
    hazardIrritationSymbol: requirements.hazards.includes('Irritation') ? '☑ 刺激性' : null,
    hazardVolatilitySymbol: requirements.hazards.includes('Volatility') ? '☑ 易挥发' : null,
    hazardFragileSymbol: requirements.hazards.includes('Fragile') ? '☑ 易碎' : null,
    hazardOtherSymbol: requirements.hazards.includes('Other') ? `☑ 其他: ${requirements.hazardOther}` : null,
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
    machiningItems, mechanicsItems, microItems, physchemItems, chemistryItems
  };
}

function formatSignatureDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function blobToDataUrl(data) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'image/png' });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('电子签名图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

function buildOrderMonthPreference(choice, baseDate = new Date()) {
  const normalizedChoice = ['previous', 'current', 'next'].includes(choice) ? choice : 'current';
  const monthOffset = normalizedChoice === 'previous' ? -1 : normalizedChoice === 'next' ? 1 : 0;
  const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  return {
    choice: normalizedChoice,
    year,
    month,
    monthKey: `${year}-${String(month).padStart(2, '0')}`
  };
}

function formatAttachmentSize(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function apiErrorMessage(error, fallback) {
  const responseData = error?.response?.data;
  if (typeof Blob !== 'undefined' && responseData instanceof Blob) {
    try {
      const body = JSON.parse(await responseData.text());
      return body?.message || fallback;
    } catch (_) {
      return fallback;
    }
  }
  return responseData?.message || fallback;
}

function FormPage({ workflowMode = 'direct', requestId = null }) {
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPrefillModal, setShowPrefillModal] = useState(false);
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [directCreatedOrder, setDirectCreatedOrder] = useState(null);
  const [testItemsWordDownloading, setTestItemsWordDownloading] = useState(false);
  const [pdfAutomationBusy, setPdfAutomationBusy] = useState(false);
  const [salespersons, setSalespersons] = useState([]);
  const [salesUserId, setSalesUserId] = useState('');
  const [salesName, setSalesName] = useState('');
  const [salesEmail, setSalesEmail] = useState('');
  const [salesPhone, setSalesPhone] = useState('');
  const [salesSignatureUrl, setSalesSignatureUrl] = useState('');
  const [salesSignatureStatus, setSalesSignatureStatus] = useState('idle');
  const [salesSignatureDate, setSalesSignatureDate] = useState('');
  const [commissionerSignatureUrl, setCommissionerSignatureUrl] = useState('');
  const [commissionerSignatureStatus, setCommissionerSignatureStatus] = useState('idle');
  const [commissionerSignatureUploading, setCommissionerSignatureUploading] = useState(false);
  const [commissionerSignatureRefresh, setCommissionerSignatureRefresh] = useState(0);
  const commissionerSignatureInputRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [payers, setPayers] = useState([]);
  const [prefillPayers, setPrefillPayers] = useState([]);
  const [searchCustomerNameTerm, setSearchCustomerNameTerm] = useState('');
  const [searchContactNameTerm, setSearchContactNameTerm] = useState('');
  const [searchContactPhoneTerm, setSearchContactPhoneTerm] = useState('');
  const [searchTestItem, setSearchTestItem] = useState('');
  const [searchTestCondition, setSearchTestCondition] = useState('');
  const [searchTestCode, setSearchTestCode] = useState('');
  const [editingTestItemIndex, setEditingTestItemIndex] = useState(null);
  const [dragFromIndex, setDragFromIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [searchPayerNameTerm, setSearchPayerNameTerm] = useState('');
  const [searchPayerContactNameTerm, setSearchPayerContactNameTerm] = useState('');
  const [searchPayerContactPhoneTerm, setSearchPayerContactPhoneTerm] = useState('');

  // 转单相关状态
  const [isTransferMode, setIsTransferMode] = useState(false);
  const [prefillOrderNum, setPrefillOrderNum] = useState('');
  const [orderMonthPreference, setOrderMonthPreference] = useState(() =>
    ['direct', 'request', 'edit'].includes(workflowMode) ? buildOrderMonthPreference('current') : null
  );
  const [previousOrderId, setPreviousOrderId] = useState('');
  const [previousOrderSearchTerm, setPreviousOrderSearchTerm] = useState('');
  const [previousOrderSearchResults, setPreviousOrderSearchResults] = useState([]);
  const [selectedPreviousOrder, setSelectedPreviousOrder] = useState(null);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedPayer, setSelectedPayer] = useState(null);
  const [priceList, setPriceList] = useState([]);
  const [selectedTestIndex, setSelectedTestIndex] = useState(null);
  const [requestLoading, setRequestLoading] = useState(Boolean(requestId));
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [approvedRequest, setApprovedRequest] = useState(null);
  const [requestMeta, setRequestMeta] = useState(null);
  const isModificationMode = workflowMode === 'change' || (workflowMode === 'edit' && requestMeta?.requestType === 'modification');
  const isAdditionalTestMode = workflowMode === 'additionalTest' || (workflowMode === 'edit' && requestMeta?.requestType === 'additional_test');
  const isReviewingAdditionalTest = workflowMode === 'review' && requestMeta?.requestType === 'additional_test';
  const isAdditionalTestWorkflow = isAdditionalTestMode || isReviewingAdditionalTest;
  const areAttachmentsReadOnly = workflowMode === 'additionalTest' || requestMeta?.requestType === 'additional_test';
  const isSalesRequestMode = ['request', 'edit', 'change', 'additionalTest'].includes(workflowMode);
  const [businessTestItemsSnapshot, setBusinessTestItemsSnapshot] = useState([]);
  const [requestAttachments, setRequestAttachments] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachmentActionId, setAttachmentActionId] = useState(null);
  const [showRequestPreview, setShowRequestPreview] = useState(false);

  // 静态部门数据（与后端 departments 对应）
  const departments = [
    { department_id: 1, department_name: '显微组织表征实验室' },
    { department_id: 2, department_name: '物化性能测试实验室' },
    { department_id: 3, department_name: '力学性能测试实验室' },
    { department_id: 5, department_name: '委外' },
    { department_id: 6, department_name: '化学分析实验室' },
    { department_id: 7, department_name: '技术支持' }
  ];
  const navigate = useNavigate();

  const arrivalMethodOptions = [
    { key: 'on_site', label: '现场到达' },
    { key: 'mail',   label: '寄样' },
  ];

  const serviceUrgencyOptions = [
    { value: 'normal', label: '正常' },
    { value: 'urgent_1_5x', label: '加急1.5倍' },
    { value: 'urgent_2x', label: '特急2倍' },
  ];
  const orderUrgencyOptions = [
    { value: 'normal', label: '正常', english: 'Standard', fee: '' },
    { value: 'urgent_1_5x', label: '加急', english: 'Urgent', fee: '加收50%检测费用' },
    { value: 'urgent_2x', label: '特急', english: 'Special Urgent', fee: '加收100%检测费用' }
  ];
  const unitOptions = ['样品数', '机时', '点位', '次', '图', '天', '元素', '曲线'];

  // 初始化表单数据
  const [formData, setFormData] = useState({
    reportType: [],
    reportHeader: '',
    reportHeaderAdditionalInfo: '',
    reportForm: '',
    customerInfo: {
      customerName: '',
      customerAddress: '',
      contactName: '',
      contactPhoneNum: '',
      contactEmail: ''
    },
    sampleReturnInfo: {
      returnAddressOption: '',
      returnAddress: ''
    },
    orderUrgencyType: 'normal',
    deliveryDays: '',
    reportSeals: [],
    sampleShippingAddress: '',
    reportAdditionalInfo: '',
    paperReportShippingType: '',
    totalPrice: '',
    salesPerson: '',
    showPaperReport: false,
    payerInfo: {
      payerName: '',
      payerAddress: '',
      payerPhoneNum: '',
      bankName: '',
      taxNumber: '',
      bankAccount: '',
      payerContactName: '',
      payerContactPhoneNum: '',
      payerContactEmail: ''
    },
    sampleRequirements: {
      hazards: [],
      hazardOther: '',
      magnetism: '',
      conductivity: '',
      breakable: '',
      brittle: ''
    },
    otherRequirements: '',
    subcontractingNotAccepted: false,
    testItems: [],
    orderNum: '',
  });

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    getOrderRequest(requestId)
      .then(async ({ data }) => {
        if (!active) return;
        const loadedModification = workflowMode === 'change' || data.request_type === 'modification';
        const loadedAdditionalTest = workflowMode === 'additionalTest' || data.request_type === 'additional_test';
        if (workflowMode === 'edit' && !['submitted', 'returned'].includes(data.status)) {
          alert('该申请已被处理，当前只能查看详情');
          navigate(`/requests/${requestId}`, { replace: true });
          return;
        }
        if (['change', 'additionalTest'].includes(workflowMode) && (data.status !== 'approved' || !data.order_opened)) {
          alert('只有已经审批并完成正式开单的委托单才能发起二次申请');
          navigate('/', { replace: true });
          return;
        }
        if (workflowMode === 'review' && (data.status !== 'approved' || data.order_opened)) {
          alert(data.order_opened ? '该申请已经完成开单' : '申请尚未审批通过，不能开单');
          navigate(`/requests/${requestId}`, { replace: true });
          return;
        }
        const packet = data.reviewed_payload || data.submitted_payload || {};
        const snapshot = packet.formSnapshot || {};
        const reviewingAdditionalTest = workflowMode === 'review' && data.request_type === 'additional_test';
        const loadingModificationItems = workflowMode === 'change' || loadedModification;
        let existingOfficialItems = [];
        if ((reviewingAdditionalTest || loadingModificationItems) && data.display_order_id) {
          const { data: existingCommission } = await getCommission(data.display_order_id);
          existingOfficialItems = (existingCommission.testItems || []).map((item) => {
            const { sampleType, sampleTypeCustom, seq_no } = normalizePrefillTestItemFields(item);
            return {
              ...item,
              sampleName: item.sample_name != null ? item.sample_name : (item.sampleName || ''),
              sampleType,
              ...(sampleType === '5' && sampleTypeCustom ? { sampleTypeCustom } : {}),
              unit: item.unit || '',
              arrival_mode: item.arrival_mode === 'delivery' ? 'mail' : (item.arrival_mode || ''),
              sample_arrival_status: item.sample_arrival_status || 'arrived',
              discount_rate: item.discount_rate ?? '',
              service_urgency: item.service_urgency || 'normal',
              seq_no,
              _locked: reviewingAdditionalTest,
              _modificationNameLocked: loadingModificationItems,
              _existingOfficial: true
            };
          });
        }
        const storedBusinessItems = Array.isArray(snapshot.businessTestItems)
          ? snapshot.businessTestItems
          : (!data.reviewed_payload && Array.isArray(snapshot.formData?.testItems) ? snapshot.formData.testItems : []);
        const reviewerPrefillItems = storedBusinessItems.map((item) => ({
          sampleName: item.sampleName ?? item.sample_name ?? '',
          material: item.material ?? '',
          sampleType: '',
          sampleTypeCustom: '',
          original_no: item.original_no ?? item.originalNo ?? '',
          price_note: '',
          unit: '',
          discount_rate: '',
          test_item: '',
          test_method: item.test_method ?? item.testMethod ?? '',
          arrival_mode: item.arrival_mode === 'delivery' ? 'mail' : (item.arrival_mode || ''),
          sample_arrival_status: item.sample_arrival_status || '',
          seq_no: '',
          service_urgency: '',
          sample_preparation: '',
          quantity: item.quantity ?? '',
          department_id: '',
          note: item.note ?? item.remarks ?? '',
          flow_note: '',
          price_id: null,
          test_code: '',
          test_condition: '',
          unit_price: null,
          group_id: null,
          _businessPrefill: true
        }));
        setBusinessTestItemsSnapshot(storedBusinessItems);
        if (snapshot.formData) {
          const separateBusinessItems = workflowMode === 'review' || workflowMode === 'view';
          let officialItems = data.reviewed_payload && Array.isArray(snapshot.formData.testItems)
            ? snapshot.formData.testItems
            : [];
          if (workflowMode === 'review') {
            officialItems = reviewingAdditionalTest
              ? [...existingOfficialItems, ...reviewerPrefillItems]
              : reviewerPrefillItems;
          }
          const modificationSourceItems = loadingModificationItems && existingOfficialItems.length
            ? existingOfficialItems
            : storedBusinessItems;
          const followUpItems = modificationSourceItems.map(item => ({
            ...item,
            _locked: workflowMode === 'additionalTest' || loadedAdditionalTest,
            _modificationNameLocked: loadingModificationItems
          }));
          setFormData({
            ...snapshot.formData,
            orderNum: data.display_order_id || snapshot.formData.orderNum || '',
            orderUrgencyType: snapshot.formData.orderUrgencyType
              || packet.commissionData?.orderInfo?.order_urgency_type
              || 'normal',
            testItems: (workflowMode === 'change' || workflowMode === 'additionalTest' || (workflowMode === 'edit' && (loadedModification || loadedAdditionalTest)))
              ? followUpItems
              : (separateBusinessItems ? officialItems : (snapshot.formData.testItems || []))
          });
        }
        setSelectedCustomer(snapshot.selectedCustomer || null);
        setSelectedPayer(snapshot.selectedPayer || null);
        setIsTransferMode(Boolean(snapshot.isTransferMode));
        setOrderMonthPreference(snapshot.orderMonthPreference || null);
        setPreviousOrderId(snapshot.previousOrderId || '');
        setPreviousOrderSearchTerm(snapshot.previousOrderSearchTerm || snapshot.previousOrderId || '');
        setSelectedPreviousOrder(snapshot.selectedPreviousOrder || null);
        setSalesUserId(snapshot.salesUserId || packet.templateData?.sales_user_id || '');
        setSalesSignatureDate(packet.templateData?.sales_signature_date || '');
        setSalesName(snapshot.salesName || '');
        setSalesEmail(snapshot.salesEmail || '');
        setSalesPhone(snapshot.salesPhone || '');
        setRequestMeta({
          requestNo: data.request_no,
          status: data.status,
          applicantName: data.applicant_name,
          approvedOrderId: data.display_order_id || data.approved_order_id,
          orderOpened: data.order_opened,
          reviewNote: data.review_note,
          version: data.version,
          requestType: data.request_type || 'normal',
          parentRequestId: data.parent_request_id || null,
          rootRequestId: data.root_request_id || null,
          relatedRequestIds: Array.isArray(data.related_request_ids) ? data.related_request_ids : []
        });
      })
      .catch(error => alert(error.response?.data?.message || '申请内容加载失败'))
      .finally(() => active && setRequestLoading(false));
    return () => { active = false };
  }, [navigate, requestId, workflowMode]);

  useEffect(() => {
    const payerId = selectedPayer?.payment_id || selectedPayer?.payer_id;
    if (!payerId) return;
    let active = true;
    // 每次付款方切换都先清除旧联系人和旧图片。即使新旧付款方绑定同一工号，
    // 也会在异步请求返回后重新触发签名读取，支持刚上传/替换的签名立即生效。
    setSalesUserId('');
    setSalesName('');
    setSalesEmail('');
    setSalesPhone('');
    setSalesSignatureDate('');
    getSalespersonByPayer(payerId)
      .then(({ data }) => {
        if (!active) return;
        setSalesUserId(data.user_id || '');
        setFormData(prev => ({ ...prev, salesPerson: data.account || '' }));
        setSalesName(data.name || '');
        setSalesEmail(data.email || '');
        setSalesPhone(data.phone || '');
        if (['request', 'edit', 'direct'].includes(workflowMode)) {
          setSalesSignatureDate(formatSignatureDate());
        }
      })
      .catch(error => {
        if (!active) return;
        console.error('获取付款方绑定的服务方联系人失败:', error);
        setSalesUserId('');
        setFormData(prev => ({ ...prev, salesPerson: '' }));
        setSalesName('');
        setSalesEmail('');
        setSalesPhone('');
        setSalesSignatureDate('');
      });
    return () => { active = false };
  }, [selectedPayer?.payment_id, selectedPayer?.payer_id, workflowMode]);

  useEffect(() => {
    let active = true;
    setSalesSignatureUrl('');
    if (!salesUserId) {
      setSalesSignatureStatus('idle');
      return () => { active = false };
    }
    setSalesSignatureStatus('loading');
    getSalespersonSignature(salesUserId)
      .then(async ({ data }) => {
        const dataUrl = await blobToDataUrl(data);
        if (!active) return;
        setSalesSignatureUrl(dataUrl);
      })
      .catch(error => {
        if (!active) return;
        if (error.response?.status !== 404) console.error('电子签名加载失败:', error);
        setSalesSignatureUrl('');
        setSalesSignatureStatus(error.response?.status === 404 ? 'missing' : 'error');
      });
    return () => {
      active = false;
    };
  }, [salesUserId]);

  useEffect(() => {
    let active = true;
    const commissionerId = selectedCustomer?.commissioner_id;
    setCommissionerSignatureUrl('');
    if (!commissionerId) {
      setCommissionerSignatureStatus('idle');
      return () => { active = false };
    }
    setCommissionerSignatureStatus('loading');
    getCommissionerSignature(commissionerId)
      .then(async ({ data }) => {
        const dataUrl = await blobToDataUrl(data);
        if (!active) return;
        setCommissionerSignatureUrl(dataUrl);
        setCommissionerSignatureStatus('ready');
      })
      .catch(error => {
        if (!active) return;
        if (error.response?.status !== 404) console.error('委托方电子签名加载失败:', error);
        setCommissionerSignatureUrl('');
        setCommissionerSignatureStatus(error.response?.status === 404 ? 'missing' : 'error');
      });
    return () => { active = false };
  }, [selectedCustomer?.commissioner_id, commissionerSignatureRefresh]);

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    const attachmentRequestIds = areAttachmentsReadOnly
      ? [...new Set([
          requestMeta?.rootRequestId,
          requestMeta?.parentRequestId,
          requestId,
          ...(requestMeta?.relatedRequestIds || [])
        ].filter(Boolean))]
      : [requestId];
    Promise.all(attachmentRequestIds.map(async (attachmentRequestId) => {
      try {
        const { data } = await getOrderRequestFiles(attachmentRequestId);
        return (Array.isArray(data) ? data : []).map((attachment) => ({
          ...attachment,
          ownerRequestId: attachmentRequestId
        }));
      } catch (error) {
        console.error('申请附件加载失败:', error);
        return [];
      }
    }))
      .then((groups) => active && setRequestAttachments(groups.flat()))
      .catch((error) => {
        if (active) console.error('申请附件加载失败:', error);
      });
    return () => { active = false };
  }, [requestId, areAttachmentsReadOnly, requestMeta?.rootRequestId, requestMeta?.parentRequestId, requestMeta?.relatedRequestIds]);

  const moveTestItem = (from, to) => {
    if (from === to || from == null || to == null) return;
    setFormData(prev => {
      if (prev.testItems[from]?._locked || prev.testItems[to]?._locked) return prev;
      const next = [...prev.testItems];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, testItems: next };
    });
  };
  const onHandleDragStart = (e, index) => {
    if (formData.testItems[index]?._locked) { e.preventDefault(); return; }
    setDragFromIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };
  const onRowDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index); };
  const onRowDrop = (e, index) => { e.preventDefault(); const from = dragFromIndex ?? Number(e.dataTransfer.getData('text/plain')); moveTestItem(from, index); setDragFromIndex(null); setDragOverIndex(null); };
  const onRowDragLeave = () => setDragOverIndex(null);
  const createTestItemFromPrice = (p) => ({
    price_id: p.price_id,
    test_code: p.test_code,
    test_item: `${p.test_item_name} - ${p.test_condition}`,
    test_condition: p.test_condition,
    // 不写入 test_method，避免选择项目时覆盖业务申请预填的检测标准。
    unit: p.unit || '',
    unit_price: p.amount != null && String(p.amount).trim() !== '' ? p.amount : null,
    department_id: p.department_id,
    group_id: p.group_id,
    discount_rate: '',
    service_urgency: 'normal'
  });

  const formatTestItemDisplay = (ti = {}) => {
    const name = ti.test_item || '';
    const price = ti.unit_price != null && String(ti.unit_price).trim() !== ''
      ? ` (单价${ti.unit_price})`
      : '';
    return name + price;
  };

  const parseTestItemInput = (val = '') => {
    const s = String(val).trim();
    const m = s.match(/^(.*?)(?:\s*\(单价\s*([0-9]+(?:\.[0-9]+)?)\s*元\))?$/);
    if (!m) return { name: s, price: null };
    const name = (m[1] || '').trim();
    const price = m[2] != null ? m[2].trim() : null;
    return { name, price };
  };

  const handleTestItemInputChange = (index, value) => {
    if (formData.testItems[index]?._locked) return;
    const { name, price } = parseTestItemInput(value);

    setFormData(prev => ({
      ...prev,
      testItems: prev.testItems.map((it, i) => {
        if (i !== index) return it;
        const next = { ...it, test_item: name };
        if (price == null) next.unit_price = '';
        else next.unit_price = price;
        return next;
      })
    }));
  };

  const reportOptions = {
    '测试图片或数据汇总(无需测试报告) Test pictures or data summaries(No test report)': 1,
    '中文报告 Chinese report': 2,
    '英文报告 English report': 3,
    '仅电子版报告': 4,
    '电子版+纸质版报告': 5,
    '中英文对照报告Chinese-English bilingual report': 6
  }
  const reportHeaderOptions = { '同委托方名称和地址 Same as applicant': 1, '其他 (地址/收件人/电话) Others (Address/Recipient/Tel)': 2 }
  const reportFormOptions = { '一份委托单对应一个报告 One application Form To a Report': 1, '每一个项目对应一份报告 Each Item Corresponds To a Report': 2 }

  const typeMappings = { sampleType: { '板材': 1, '棒材': 2, '粉末': 3, '液体': 4, '其他': 5 } }

  /** 预填：将接口的 sample_type / seq_no 规范成与表单控件一致的类型（下拉 value 为字符串 1–5） */
  const normalizePrefillTestItemFields = (it) => {
    const rawType = it.sample_type != null ? it.sample_type : it.sampleType
    const s = rawType == null ? '' : String(rawType).trim()
    const labelToCode = { 板材: '1', 棒材: '2', 粉末: '3', 液体: '4', 其他: '5' }
    let sampleType = ''
    let sampleTypeCustom = ''
    if (s === '') {
      sampleType = ''
    } else if (/^[1-5]$/.test(s)) {
      sampleType = s
    } else if (labelToCode[s]) {
      sampleType = labelToCode[s]
    } else {
      sampleType = '5'
      sampleTypeCustom = s
    }
    const rawSeq = it.seq_no != null ? it.seq_no : ''
    let seq_no = ''
    if (rawSeq !== '' && rawSeq != null) {
      const n = Number(rawSeq)
      if (Number.isFinite(n) && n >= 1 && n <= 4) seq_no = n
      else seq_no = ''
    }
    return { sampleType, sampleTypeCustom, seq_no }
  }
  const hazardOptions = [
    { key: 'Safety', label: '无危险性 Safety' },
    { key: 'Flammability', label: '易燃易爆 Flammability' },
    { key: 'Irritation', label: '刺激性 Irritation' },
    { key: 'Volatility', label: '易挥发 Volatility' },
    { key: 'Fragile', label: '易碎 Fragile' },
    { key: 'Other', label: '其他 Other' }
  ];
  const magnetismOptions = [
    { key: 'Non-magnetic', label: '无磁 Non-magnetic' },
    { key: 'Weak-magnetic', label: '弱磁 Weak-magnetic' },
    { key: 'Strong-magnetic', label: '强磁 Strong-magnetic' },
    { key: 'Unknown', label: '未知 Unknown' }
  ];
  const conductivityOptions = [
    { key: 'Conductor', label: '导体 Conductor' },
    { key: 'Semiconductor', label: '半导体 Semiconductor' },
    { key: 'Insulator', label: '绝缘体 Insulator' },
    { key: 'Unknown', label: '未知 Unknown' }
  ];

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        getCustomers(searchCustomerNameTerm, searchContactNameTerm, searchContactPhoneTerm)
          .then(response => setCustomers(response.data))
          .catch(error => console.error('拉取委托方信息失败:', error));
      } catch (error) { console.error('拉取委托方信息失败:', error); }
    };
    fetchCustomers();

    const fetchPayers = async () => {
      try {
        getPayers(searchPayerNameTerm, searchPayerContactNameTerm, searchPayerContactPhoneTerm)
          .then(response => setPayers(response.data))
          .catch(error => console.error('拉取付款方信息失败:', error));
      } catch (error) { console.error('拉取付款方信息失败:', error); }
    };
    fetchPayers();

    const fetchSalespersons = async () => {
      try {
        getSalesperson()
          .then(response => setSalespersons(response.data))
          .catch(error => console.error('拉取销售人员失败:', error));
      } catch (error) { console.error('Error fetching salespersons:', error); }
    };
    fetchSalespersons();

    const fetchPrices = async () => {
      try {
        getPrices(searchTestItem, searchTestCondition, searchTestCode)
          .then(response => setPriceList(response.data))
          .catch(error => console.error('拉取价目表失败:', error));
      } catch (error) { console.error('Error fetching price:', error); }
    };
    fetchPrices();
  }, [searchCustomerNameTerm, searchContactNameTerm, searchContactPhoneTerm, searchPayerNameTerm, searchPayerContactNameTerm, searchPayerContactPhoneTerm, searchTestItem, searchTestCondition, searchTestCode]);

  // 搜索旧单号的防抖定时器
  const [searchTimer, setSearchTimer] = useState(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [searchTimer]);

  // 搜索旧单号
  const handleSearchPreviousOrder = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      setPreviousOrderSearchResults([]);
      return;
    }
    
    try {
      const response = await searchOrders(searchTerm);
      setPreviousOrderSearchResults(response.data || []);
    } catch (error) {
      console.error('搜索订单失败:', error);
      setPreviousOrderSearchResults([]);
    }
  };

  // 选择旧单号并自动预填
  const handleSelectPreviousOrder = async (order) => {
    // 先验证该订单是否可以转单
    try {
      const checkResponse = await checkOrder(order.order_id);
      if (!checkResponse.data.exists) {
        alert(`订单 ${order.order_id} 不存在！`);
        return;
      }
      if (!checkResponse.data.canTransfer) {
        alert(`订单 ${order.order_id} 已经转单过，不能再次转单！`);
        return;
      }
    } catch (error) {
      console.error('验证订单失败:', error);
      alert('验证订单失败，请重试！');
      return;
    }
    
    setSelectedPreviousOrder(order);
    setPreviousOrderId(order.order_id);
    setPreviousOrderSearchTerm(order.order_id);
    setPreviousOrderSearchResults([]);
    
    // 自动预填该订单的所有信息
    try {
      const { data } = await getCommission(order.order_id);
      console.log("转单预填数据", data);
      
      setSelectedCustomer(data.customer);
      setSelectedPayer(data.payer);
      
      // 处理服务方信息
      if (data.serviceInfo) {
        const acct = data.serviceInfo.account;
        setFormData(f => ({ ...f, salesPerson: acct }));
        setSalesUserId(data.serviceInfo.user_id || '');
        setSalesEmail(data.serviceInfo.email);
        setSalesPhone(data.serviceInfo.phone);
        setSalesName(data.serviceInfo.name);
      } else if (data.testItems[0]?.assignment_accounts?.length > 0) {
        const acct = data.testItems[0].assignment_accounts.find(acct => acct && acct.includes('YW'));
        if (acct) {
          setFormData(f => ({ ...f, salesPerson: acct }));
          setSalesUserId(salespersons.find(s => s.account === acct)?.user_id || '');
          const resp = await getSalespersonContact(acct);
          setSalesEmail(resp.data.user_email);
          setSalesPhone(resp.data.user_phone_num);
          setSalesName((salespersons.find(s => s.account === acct)?.name || ''));
        }
      }
      
      const seals = data.orderInfo?.report_seals || [];
      setFormData(prev => ({
        ...prev,
        reportType: Array.isArray(data.reportInfo?.type) ? data.reportInfo.type : [],
        paperReportShippingType: data.reportInfo?.paper_report_shipping_type || '',
        reportAdditionalInfo: data.reportInfo?.report_additional_info || '',
        reportHeader: String(data.reportInfo?.header_type || ''),
        reportHeaderAdditionalInfo: data.reportInfo?.header_other || '',
        reportForm: String(data.reportInfo?.format_type || ''),
        deliveryDays: data.orderInfo?.delivery_days_after_receipt != null ? String(data.orderInfo.delivery_days_after_receipt) : '',
        sampleSolutionType: String(data.sampleHandling?.handling_type || ''),
        sampleReturnInfo: data.sampleHandling?.return_info || { returnAddressOption: '', returnAddress: '' },
        sampleShippingAddress: (data.sampleHandling?.return_info?.returnAddressOption === 'other' && data.sampleHandling?.return_info?.returnAddress) ? data.sampleHandling.return_info.returnAddress : '',
        sampleRequirements: data.sampleRequirements || { hazards: [], hazardOther:'', magnetism:'', conductivity:'', breakable:'', brittle:'' },
        testItems: (data.testItems || []).map(it => {
          const { sampleType, sampleTypeCustom, seq_no } = normalizePrefillTestItemFields(it)
          return {
            ...it,
            sampleName: it.sample_name != null ? it.sample_name : (it.sampleName || ''),
            sampleType,
            ...(sampleType === '5' && sampleTypeCustom ? { sampleTypeCustom } : {}),
            arrival_mode: it.arrival_mode || '',
            sample_arrival_status: it.sample_arrival_status || 'arrived',
            discount_rate: it.discount_rate || '',
            service_urgency: it.service_urgency || 'normal',
            seq_no
          }
        }),
        totalPrice: data.orderInfo?.total_price != null ? String(data.orderInfo.total_price) : '',
        otherRequirements: data.orderInfo?.other_requirements || '',
        subcontractingNotAccepted: data.orderInfo?.subcontracting_not_accepted || false,
        reportSeals: seals
      }));
      
      // 如果有绑定的付款方，显示预填提示
      if (data.customer?.commissioner_id) {
        try {
          const prefillResp = await prefillPayment(data.customer.commissioner_id);
          if (prefillResp.data.length > 0) {
            setPrefillPayers(prefillResp.data);
            // 如果只有一个付款方，自动选择
            if (prefillResp.data.length === 1) {
              setSelectedPayer(prefillResp.data[0]);
            } else {
              setShowPrefillModal(true);
            }
          }
        } catch (error) {
          console.error('拉取付款方信息失败:', error);
        }
      }
      
      alert('已自动预填旧单号信息！');
    } catch (err) {
      console.error('预填失败', err);
      alert('预填数据失败，请检查旧单号是否正确');
    }
  };


  const handlePrefill = async () => {
    if (isTransferMode) {
      alert('当前为转单模式，请先关闭转单功能再使用预填功能！');
      return;
    }

    const sourceOrderNum = prefillOrderNum.trim();
    if (!sourceOrderNum) { alert('请先输入需要预填的历史委托单号'); return; }
    
    // 检查委托单号是否包含特殊字符
    const specialChars = /[\s_.,\/?\-=]/;
    if (specialChars.test(sourceOrderNum)) {
      alert('委托单号不能包含空格、下划线、点号、逗号、斜杠、问号、连字符或等号等特殊字符！\nTask number cannot contain special characters like spaces, underscores, dots, commas, slashes, question marks, hyphens or equals signs!');
      return;
    }
    
    try {
      const { data } = await getCommission(sourceOrderNum);
      console.log("data", data);
      setSelectedCustomer(data.customer);
      setSelectedPayer(data.payer);
      
      // 处理服务方信息
      if (data.serviceInfo) {
        // 使用后端返回的serviceInfo
        const acct = data.serviceInfo.account;
        setFormData(f => ({ ...f, salesPerson: acct }));
        setSalesUserId(data.serviceInfo.user_id || '');
        setSalesEmail(data.serviceInfo.email);
        setSalesPhone(data.serviceInfo.phone);
        setSalesName(data.serviceInfo.name);
      } else if (data.testItems[0]?.assignment_accounts?.length > 0) {
        // 兜底：如果后端没有返回serviceInfo，使用原有逻辑
        const acct = data.testItems[0].assignment_accounts.find(acct => acct && acct.includes('YW'));
        if (acct) {
          console.log("acct", acct);
          setFormData(f => ({ ...f, salesPerson: acct }));
          setSalesUserId(salespersons.find(s => s.account === acct)?.user_id || '');
          const resp = await getSalespersonContact(acct);
          console.log("resp", resp.data);
          setSalesEmail(resp.data.user_email); setSalesPhone(resp.data.user_phone_num);
          setSalesName((salespersons.find(s => s.account === acct)?.name || ''));
        }
      }
      const seals = data.orderInfo?.report_seals || [];
      setFormData(prev => ({
        ...prev,
        reportType: Array.isArray(data.reportInfo?.type) ? data.reportInfo.type : [],
        paperReportShippingType: data.reportInfo?.paper_report_shipping_type || '',
        reportAdditionalInfo: data.reportInfo?.report_additional_info || '',
        reportHeader: String(data.reportInfo?.header_type || ''),
        reportHeaderAdditionalInfo: data.reportInfo?.header_other || '',
        reportForm: String(data.reportInfo?.format_type || ''),
        deliveryDays: data.orderInfo?.delivery_days_after_receipt != null ? String(data.orderInfo.delivery_days_after_receipt) : '',
        sampleSolutionType: String(data.sampleHandling?.handling_type || ''),
        sampleReturnInfo: data.sampleHandling?.return_info || { returnAddressOption: '', returnAddress: '' },
        sampleShippingAddress: (data.sampleHandling?.return_info?.returnAddressOption === 'other' && data.sampleHandling?.return_info?.returnAddress) ? data.sampleHandling.return_info.returnAddress : '',
        sampleRequirements: data.sampleRequirements || { hazards: [], hazardOther:'', magnetism:'', conductivity:'', breakable:'', brittle:'' },
        testItems: (data.testItems || []).map(it => {
          const { sampleType, sampleTypeCustom, seq_no } = normalizePrefillTestItemFields(it)
          return {
            ...it,
            sampleName: it.sample_name != null ? it.sample_name : (it.sampleName || ''),
            sampleType,
            ...(sampleType === '5' && sampleTypeCustom ? { sampleTypeCustom } : {}),
            unit: it.unit || '',
            arrival_mode: it.arrival_mode || '',
            sample_arrival_status: it.sample_arrival_status || 'arrived',
            discount_rate: it.discount_rate || '',
            service_urgency: it.service_urgency || 'normal',
            seq_no
          }
        })
      }));
      alert('预填成功！');
    } catch (err) { console.error('预填失败', err); alert('预填数据失败，请检查委托单号是否正确'); }
  };

  const handleDepartmentChange = (index, newDepartmentId) => {
    if (formData.testItems[index]?._locked) return;
    const updatedTestItems = formData.testItems.map((item, idx) => idx === index ? { ...item, department_id: newDepartmentId } : item);
    setFormData(prev => ({ ...prev, testItems: updatedTestItems }));
  };

  const addTestItem = () => {
    if (isModificationMode) return;
    setFormData(prev => ({ ...prev, testItems: [...prev.testItems, {
      sampleName: '', material: '', sampleType: '', sampleTypeCustom: '', original_no: '',
      test_item: '', test_method: '', quantity: '', unit: '', note: '', flow_note: '', department_id: '', sample_preparation: '', discount_rate: '', service_urgency: 'normal',
      arrival_mode: '', sample_arrival_status: '', seq_no: ''
    }]}));
  };

  const handleTestItemChange = (index, field, value) => {
    if (formData.testItems[index]?._locked || (isModificationMode && field === 'test_item')) return;
    setFormData(prev => ({
      ...prev,
      testItems: prev.testItems.map((item, i) => {
        if (i !== index) return item;
        const currentValue = item[field];
        // 对于单选框字段，如果点击的是已选中的值，则取消选中
        const isRadioField = ['arrival_mode', 'sample_arrival_status'].includes(field);
        const newValue = isRadioField && currentValue === value ? '' : value;
        const updated = { ...item, [field]: newValue, ...(field === 'test_item' ? { price_id: null } : {}) };
        if (field === 'sampleType') {
          if (String(newValue) === '5') updated.sampleTypeCustom = '';
          else delete updated.sampleTypeCustom;
        }
        return updated;
      })
    }));
  };

  const handlePriceSelect = (item) => {
    if (selectedTestIndex == null || formData.testItems[selectedTestIndex]?._locked) return;
    setFormData(prev => {
      const items = prev.testItems.slice();
      const idx = selectedTestIndex;
      const oldRow = items[idx] || {};
      const pf = createTestItemFromPrice(item);
      items[idx] = { ...oldRow, ...pf };
      if (oldRow.service_urgency) {
        items[idx].service_urgency = oldRow.service_urgency;
      }
      return { ...prev, testItems: items };
    });
    setShowPriceModal(false);
  };

  const applyPriceToRow = (index, priceItem) => {
    if (formData.testItems[index]?._locked) return;
    setFormData(prev => {
      const items = prev.testItems.slice();
      const oldRow = items[index] || {};
      const pf = createTestItemFromPrice(priceItem);
      items[index] = { ...oldRow, ...pf };
      if (oldRow.service_urgency) {
        items[index].service_urgency = oldRow.service_urgency;
      }
      return { ...prev, testItems: items };
    });
  };

  const handleTestItemCodeEnter = async (e, index) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const raw = (formData.testItems[index]?.test_item || '').trim();
    if (!raw) return;
    // 先在本地列表中匹配（去除空格并不区分大小写）
    const upper = raw.toUpperCase();
    const matchesLocal = priceList.filter(p => ((p.test_code || '').trim().toUpperCase() === upper));
    if (matchesLocal.length === 1) { applyPriceToRow(index, matchesLocal[0]); return; }
    if (matchesLocal.length > 1) { setSelectedTestIndex(index); setSearchTestCode(raw); setShowPriceModal(true); return; }
    // 若本地未命中，按 code 精确向后端检索，避免初始300条限制导致漏匹配
    try {
      const resp = await getPrices('', '', raw);
      const rows = Array.isArray(resp.data) ? resp.data : [];
      const exact = rows.filter(p => ((p.test_code || '').trim().toUpperCase() === upper));
      if (exact.length === 1) { applyPriceToRow(index, exact[0]); return; }
      if (rows.length > 1) { setSelectedTestIndex(index); setSearchTestCode(raw); setShowPriceModal(true); return; }
      if (rows.length === 1) { applyPriceToRow(index, rows[0]); return; }
      alert(`未找到项目代码：${raw}`);
    } catch (err) {
      console.error('按代码检索价目失败', err);
      alert(`未找到项目代码：${raw}`);
    }
  };

  const handleOtherRequirementsChange = (e) => { setFormData(prev => ({ ...prev, otherRequirements: e.target.value })); };
  const handleSubcontractingChange = (e) => { setFormData(prev => ({ ...prev, subcontractingNotAccepted: e.target.checked })); };
  const handleInputChange = (e) => { 
    const { name, value } = e.target; 
    
    // 如果是委托单号输入，进行特殊字符检查
    if (name === 'orderNum') {
      const specialChars = /[\s_.,\/?\-=]/;
      if (specialChars.test(value)) {
        alert('委托单号不能包含空格、下划线、点号、逗号、斜杠、问号、连字符或等号等特殊字符！\nTask number cannot contain special characters like spaces, underscores, dots, commas, slashes, question marks, hyphens or equals signs!');
        return; // 阻止输入
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value })); 
  };
  const handleNestedChange = (parent, name, value) => { 
    setFormData(prev => {
      const currentValue = prev[parent][name];
      // 如果点击的是已选中的单选框，则取消选中
      const newValue = currentValue === value ? '' : value;
      return { ...prev, [parent]: { ...prev[parent], [name]: newValue } };
    });
  };

  const handleHazardChange = (key, checked) => {
    setFormData(prev => {
      const list = prev.sampleRequirements.hazards;
      return { ...prev, sampleRequirements: { ...prev.sampleRequirements, hazards: checked ? [...list, key] : list.filter(item => item !== key) } };
    });
  };

  const handleBack = () => { navigate('/'); };

  const handleReportTypeChange = (value, checked) => {
    const reportOptions = {
      '测试图片或数据汇总(无需测试报告) Test pictures or data summaries(No test report)': 1,
      '中文报告 Chinese report': 2,
      '英文报告 English report': 3,
      '仅电子版报告': 4,
      '电子版+纸质版报告': 5,
      '中英文对照报告Chinese-English bilingual report': 6
    }
    const code = reportOptions[value];
    setFormData(prev => {
      let updated = [...prev.reportType];
      if (code === 1) {
        updated = checked ? [1] : updated.filter(item => item !== 1);
      } else if ([4, 5].includes(code)) {
        updated = checked
          ? [...updated.filter(item => ![1, 4, 5].includes(item)), code]
          : updated.filter(item => item !== code);
      } else {
        updated = updated.filter(item => ![1, 2, 3, 6].includes(item));
        if (checked) updated.push(code);
      }
      updated = [...new Set(updated)];
      return {
        ...prev,
        reportType: updated,
        showPaperReport: updated.includes(5),
        paperReportShippingType: updated.includes(5) ? prev.paperReportShippingType : '',
        reportAdditionalInfo: updated.includes(5) ? prev.reportAdditionalInfo : ''
      };
    });
  };

  const handleReportSealsChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({ ...prev, reportSeals: checked ? [...prev.reportSeals, value] : prev.reportSeals.filter(v => v !== value) }));
  };
  const handleRadioChange = (event) => { 
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 新增：处理单选框点击，支持取消选中
  const handleRadioClick = (name, value) => {
    setFormData(prev => {
      if (prev[name] === value) {
        return { ...prev, [name]: '' };
      } else {
        return { ...prev, [name]: value };
      }
    });
  };
  const handleReportHeaderChange = (e) => { setFormData(prev => ({ ...prev, reportHeader: e.target.value })); };
  const handleReportFormChange = (e) => { setFormData(prev => ({ ...prev, reportForm: e.target.value })); };
  const removeTestItem = (index) => {
    if (isModificationMode || formData.testItems[index]?._locked) return;
    setFormData(prev => ({ ...prev, testItems: prev.testItems.filter((_, i) => i !== index) }));
  };

  const handleSalespersonChange = (e) => {
    const account = e.target.value;
    setFormData(prev => ({ ...prev, salesPerson: account }));
    if (!account) { setSalesEmail(''); setSalesPhone(''); setSalesName(''); return; }
    const sel = salespersons.find(p => p.account === account);
    setSalesName(sel ? sel.name : '');
    getSalespersonContact(account)
      .then(response => {
        const email = response.data.user_email?.trim() || '';
        const phone = response.data.user_phone_num?.trim() || '';
        setSalesEmail(email); setSalesPhone(phone);
      })
      .catch(err => { console.error('获取业务员联系信息失败', err); setSalesEmail(''); setSalesPhone(''); });
  };

  const duplicateTestItem = (index) => {
    if (isModificationMode || formData.testItems[index]?._locked) return;
    setFormData(prev => { const items = [...prev.testItems]; const copy = { ...items[index] }; items.splice(index + 1, 0, copy); return { ...prev, testItems: items }; });
  };

  const downloadFile = (url, filename) => { const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); };

  const handleTestItemsWordDownload = async () => {
    if (!requestId || testItemsWordDownloading) return;
    setTestItemsWordDownloading(true);
    try {
      const response = await downloadOrderRequestTestItemsWord(requestId);
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
      downloadFile(url, `${requestMeta?.requestNo || '业务申请'}-检测项目.docx`);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.response?.data?.message || '业务检测项目 Word 导出失败，请重试');
    } finally {
      setTestItemsWordDownloading(false);
    }
  };

  const handleCommissionerSignatureUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedCustomer?.commissioner_id || commissionerSignatureUploading) return;
    if (file.size > 5 * 1024 * 1024) return alert('委托方签名图片不能超过 5MB');
    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      return alert('请选择 PNG 格式的签名图片');
    }
    setCommissionerSignatureUploading(true);
    try {
      await uploadCommissionerSignature(selectedCustomer.commissioner_id, file);
      setCommissionerSignatureRefresh(value => value + 1);
    } catch (error) {
      alert(error.response?.data?.message || '委托方签名上传失败，请重试');
    } finally {
      setCommissionerSignatureUploading(false);
    }
  };

  const handleCommissionerSignatureDelete = async () => {
    if (!selectedCustomer?.commissioner_id || commissionerSignatureUploading) return;
    if (!window.confirm('确认删除该委托方的电子签名吗？')) return;
    setCommissionerSignatureUploading(true);
    try {
      await deleteCommissionerSignature(selectedCustomer.commissioner_id);
      setCommissionerSignatureUrl('');
      setCommissionerSignatureStatus('missing');
      setCommissionerSignatureRefresh(value => value + 1);
    } catch (error) {
      alert(error.response?.data?.message || '委托方签名删除失败，请重试');
    } finally {
      setCommissionerSignatureUploading(false);
    }
  };

  const handleAttachmentSelect = (event, kind) => {
    const files = Array.from(event.target.files || []);
    const accepted = [];
    const rejected = [];
    files.forEach((file, index) => {
      const isSupportedImage = /^image\/(png|jpeg)$/i.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
      if (kind === 'request_image' && !isSupportedImage) rejected.push(`${file.name}（仅支持PNG/JPG）`);
      else accepted.push({ localId: `${Date.now()}-${index}-${file.name}`, file, kind });
    });
    if (rejected.length) alert(`以下文件未加入：\n${rejected.join('\n')}`);
    if (accepted.length) setPendingAttachments(prev => [...prev, ...accepted]);
    event.target.value = '';
  };

  const uploadPendingAttachments = async (targetRequestId) => {
    const failed = [];
    let latestVersion = requestMeta?.version;
    for (const pending of pendingAttachments) {
      try {
        const { data } = await uploadOrderRequestFile(targetRequestId, pending.file, pending.kind);
        if (data.version != null) latestVersion = data.version;
        setRequestAttachments(prev => [...prev, data]);
        setPendingAttachments(prev => prev.filter(item => item.localId !== pending.localId));
      } catch (error) {
        failed.push(`${pending.file.name}：${error.response?.data?.message || '上传失败'}`);
      }
    }
    if (latestVersion != null) {
      setRequestMeta(prev => prev ? { ...prev, version: latestVersion } : prev);
    }
    if (failed.length) throw new Error(failed.join('\n'));
    return latestVersion;
  };

  const handleAttachmentDownload = async (attachment) => {
    if (!requestId || attachmentActionId) return;
    setAttachmentActionId(`download-${attachment.file_id}`);
    try {
      const response = await downloadOrderRequestFile(attachment.ownerRequestId || requestId, attachment.file_id);
      const url = URL.createObjectURL(new Blob([response.data], { type: attachment.mime_type || 'application/octet-stream' }));
      downloadFile(url, attachment.original_filename);
      URL.revokeObjectURL(url);
    } catch (error) {
      if (error.response?.status === 404) {
        setRequestAttachments(prev => prev.filter(item => item.file_id !== attachment.file_id));
      }
      alert(error.response?.data?.message || '附件下载失败');
    } finally {
      setAttachmentActionId(null);
    }
  };

  const handleAttachmentDelete = async (attachment) => {
    if (!requestId || attachmentActionId) return;
    if (!window.confirm(`确认删除附件“${attachment.original_filename}”吗？`)) return;
    setAttachmentActionId(`delete-${attachment.file_id}`);
    try {
      const { data } = await deleteOrderRequestFile(requestId, attachment.file_id);
      setRequestAttachments(prev => prev.filter(item => item.file_id !== attachment.file_id));
      if (data.version != null) setRequestMeta(prev => prev ? { ...prev, version: data.version } : prev);
    } catch (error) {
      alert(error.response?.data?.message || '附件删除失败');
    } finally {
      setAttachmentActionId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (workflowMode === 'request' && selectedCustomer && commissionerSignatureStatus !== 'ready') {
      if (commissionerSignatureStatus === 'loading' || commissionerSignatureUploading) {
        alert('正在检测或上传委托方签名，请稍后再提交。');
      } else if (commissionerSignatureStatus === 'error') {
        alert('委托方签名检测失败，请刷新页面后重试。');
      } else {
        alert('提交失败！该委托方尚未配置电子签名，请先上传签名。');
      }
      return;
    }
    const confirmText = workflowMode === 'review'
      ? '确认开单并将正式内容录入 LIMS 吗？'
      : isModificationMode
        ? '确认提交修改申请吗？提交后需要开单员二次审批。'
        : isAdditionalTestMode
          ? '确认提交加测申请吗？'
      : workflowMode === 'edit'
        ? '确认保存本次修改吗？保存后申请将继续等待审批。'
        : '请确认填写的信息是否正确，确认无误再提交审批';
    if (!window.confirm(confirmText)) return;
    
    // 转单模式验证
    if (isTransferMode) {
      if (!previousOrderId || previousOrderId.trim() === '') {
        alert('提交失败！转单模式下，旧单号为必填项');
        return;
      }
      // 验证旧单号是否存在且未被转过
      try {
        const response = await checkOrder(previousOrderId.trim());
        if (!response.data.exists) {
          alert(`旧单号 ${previousOrderId} 不存在，请检查后重试！`);
          return;
        }
        if (!response.data.canTransfer) {
          alert(`旧单号 ${previousOrderId} 已经转单过，不能再次转单！`);
          return;
        }
      } catch (error) {
        console.error('验证订单失败:', error);
        alert('验证订单失败，请重试！');
        return;
      }
    }
    
    // 检查委托单号是否包含特殊字符（如果用户输入了委托单号）
    if (formData.orderNum && formData.orderNum.trim()) {
      const specialChars = /[\s_.,\/?\-=]/;
      if (specialChars.test(formData.orderNum)) {
        alert('委托单号不能包含空格、下划线、点号、逗号、斜杠、问号、连字符或等号等特殊字符！\nTask number cannot contain special characters like spaces, underscores, dots, commas, slashes, question marks, hyphens or equals signs!');
        return;
      }
    }
    
    if (!formData.salesPerson) { alert('提交失败！服务方联系人为必填项，请选择业务员'); return; }
    if (!selectedCustomer) { alert('提交失败！请先选择委托方'); return; }
    if (!selectedCustomer.commissioner_id) {
      alert('提交失败！未选择有效的委托方，请选择后重试。');
      return;
    }
    if (!selectedPayer) { alert('提交失败！请先选择付款方'); return; }
    if (formData.reportType.length === 0) { alert('提交失败！报告文档为必填项，请至少选择一项'); return; }
    const languageTypes = formData.reportType.filter(type => [2, 3, 6].includes(type));
    const hasNoReport = formData.reportType.includes(1);
    const hasElectronicOnly = formData.reportType.includes(4);
    const hasPrintedReport = formData.reportType.includes(5);
    if (!hasNoReport && Number(hasElectronicOnly) + Number(hasPrintedReport) !== 1) {
      alert('提交失败！请选择报告交付形式'); return;
    }
    if (!hasNoReport && languageTypes.length !== 1) {
      alert('提交失败！中文报告、英文报告、中英文对照报告必须三选一'); return;
    }
    if (hasPrintedReport && !formData.paperReportShippingType) {
      alert('提交失败！请选择纸质版报告寄送地址'); return;
    }
    if (hasPrintedReport && formData.paperReportShippingType === '3' && !formData.reportAdditionalInfo.trim()) {
      alert('提交失败！请填写其他寄送地址、收件人和电话'); return;
    }
    if (!hasNoReport && !formData.reportHeader) { alert('提交失败！报告抬头为必填项'); return; }
    if (!hasNoReport && !formData.reportForm) { alert('提交失败！报告对应方式为必填项'); return; }
    let businessMethodIndex = 0;
    const submissionTestItems = workflowMode === 'review'
      ? formData.testItems.map((item) => {
          if (item._locked) return item;
          const businessItem = businessTestItemsSnapshot[businessMethodIndex++] || {};
          return {
            ...item,
            test_method: businessItem.test_method ?? businessItem.testMethod ?? ''
          };
        })
      : formData.testItems;
    if (workflowMode === 'review') {
      setFormData(prev => ({ ...prev, testItems: submissionTestItems }));
    }

    if (submissionTestItems.length === 0) { alert('提交失败！请至少添加一行检测项目'); return; }
    if (isAdditionalTestWorkflow && !submissionTestItems.some(item => !item._locked)) {
      alert('提交失败！请至少添加一行新的加测项目'); return;
    }

    for (let i = 0; i < submissionTestItems.length; i++) {
      const ti = submissionTestItems[i];
      if (ti._locked) continue;
      if (isSalesRequestMode) {
        if (!String(ti.sampleName || '').trim()) { alert(`提交失败！第${i + 1}行：样品名称为必填项`); return; }
        if (!String(ti.material || '').trim()) { alert(`提交失败！第${i + 1}行：材质为必填项`); return; }
        if (!String(ti.sampleType || '').trim()) { alert(`提交失败！第${i + 1}行：样品类型为必填项`); return; }
        if (!String(ti.test_item || '').trim()) { alert(`提交失败！第${i + 1}行：检测项目为必填项`); return; }
        if (!String(ti.test_method || '').trim()) { alert(`提交失败！第${i + 1}行：检测标准为必填项`); return; }
        if (!String(ti.quantity || '').trim()) { alert(`提交失败！第${i + 1}行：数量为必填项`); return; }
        continue;
      }
      const businessQuote = ti.price_note != null ? String(ti.price_note).trim() : '';
      const discountRate = ti.discount_rate != null ? String(ti.discount_rate).trim() : '';
      if (!ti.sampleName) { alert(`提交失败！第${i + 1}行：样品名称为必填项`); return; }
      if (!ti.material) { alert(`提交失败！第${i + 1}行：材质为必填项`); return; }
      if (!ti.sampleType) { alert(`提交失败！第${i + 1}行：样品状态为必填项`); return; }
      if (!ti.test_item) { alert(`提交失败！第${i + 1}行：检测项目为必填项`); return; }
      if (!ti.test_method) { alert(`提交失败！第${i + 1}行：检测标准为必填项`); return; }
      if (businessQuote === '') { alert(`提交失败！第${i + 1}行：业务报价为必填项`); return; }
      if (discountRate === '') { alert(`提交失败！第${i + 1}行：折扣为必填项`); return; }
      if (Number(discountRate) < 0 || Number(discountRate) > 100) {
        alert(`提交失败！第${i + 1}行：折扣必须在0-100之间`);
        return;
      }
      if (!ti.quantity) { alert(`提交失败！第${i + 1}行：数量为必填项`); return; }
      if (!ti.unit || String(ti.unit).trim() === '') { alert(`提交失败！第${i + 1}行：单位为必填项`); return; }
      if (!ti.department_id) { alert(`提交失败！第${i + 1}行：部门为必填项`); return; }
      if (!ti.arrival_mode) { alert(`提交失败！第${i + 1}行：到达方式为必填项`); return; }
      if (!ti.sample_arrival_status) { alert(`提交失败！第${i + 1}行：是否到达为必填项`); return; }
      if (!ti.service_urgency) { alert(`提交失败！第${i + 1}行：加急类型为必填项`); return; }
    }

    const req = formData.sampleRequirements;
    if (!req.hazards.length) { alert('提交失败！样品危险特性为必填项，请至少选择一项'); return; }
    if (!req.magnetism) { alert('提交失败！样品磁性为必填项，请选择'); return; }
    if (!req.conductivity) { alert('提交失败！样品导电性为必填项，请选择'); return; }
    if (!req.breakable) { alert('提交失败！是否可破坏为必填项，请选择'); return; }
    if (!req.brittle) { alert('提交失败！是否孤品为必填项，请选择'); return; }

    if (formData.sampleSolutionType === '3') {
      if (!formData.sampleReturnInfo.returnAddressOption) {
        alert('提交失败！退回地址为必填项');
        return;
      }
      if (formData.sampleReturnInfo.returnAddressOption === 'other' && !(formData.sampleShippingAddress || '').trim()) {
        alert('提交失败！退回地址为必填项');
        return;
      }
    }

    const effectiveTestItems = isAdditionalTestWorkflow
      ? submissionTestItems.filter(item => !item._locked)
      : submissionTestItems;
    const commissionData = {
      customerId: selectedCustomer.customer_id,
      paymentId: selectedPayer.payment_id,
      commissionerId: selectedCustomer.commissioner_id,
      transferInfo: isTransferMode ? {
        previousOrderId: previousOrderId.trim(),
        note: null // 可以后续扩展添加备注
      } : null,
      orderInfo: {
        sample_shipping_address: formData.sampleSolutionType === '3' && formData.sampleReturnInfo.returnAddressOption === 'other' ? formData.sampleShippingAddress : null,
        total_price: formData.totalPrice || null,
        order_num: formData.orderNum || null,
        order_month_preference: workflowMode === 'direct' ? orderMonthPreference : null,
        other_requirements: formData.otherRequirements,
        subcontracting_not_accepted: formData.subcontractingNotAccepted,
        report_seals: formData.reportSeals,
        // 委托单级周期类型：只进入申请 JSON 和模板，不写入 orders 数据表。
        order_urgency_type: formData.orderUrgencyType || 'normal',
        delivery_days_after_receipt: formData.deliveryDays !== '' ? Number(formData.deliveryDays) : null
      },
      vatType: '1', // 默认增值税普通发票
      reportInfo: {
        type: formData.reportType,
        paper_report_shipping_type: formData.paperReportShippingType,
        report_additional_info: formData.reportAdditionalInfo || null,
        header_type: formData.reportHeader || null,
        header_other: formData.reportHeader === '2' ? formData.reportHeaderAdditionalInfo : null,
        format_type: formData.reportForm || null
      },
      sampleHandling: { 
        handling_type: formData.sampleSolutionType, 
        return_info: formData.sampleSolutionType === '3' ? {
          ...formData.sampleReturnInfo,
          returnAddress: formData.sampleReturnInfo.returnAddressOption === 'other' ? formData.sampleShippingAddress : (formData.sampleReturnInfo.returnAddress || '')
        } : null 
      },
      sampleRequirements: formData.sampleRequirements,
      testItems: effectiveTestItems.map(item => ({
        test_item_id: item.test_item_id || null,
        sample_name: item.sampleName, material: item.material || '',
        sample_type: item.sampleType === '5' ? item.sampleTypeCustom?.trim() : item.sampleType,
        original_no: item.original_no || '', test_item: item.test_item, test_method: item.test_method,
        sample_preparation: item.sample_preparation,
        flow_note: item.flow_note || '',
        quantity: item.quantity,
        unit: item.unit || '',
        unit_price: item.unit_price != null && String(item.unit_price).trim() !== '' ? item.unit_price : null,
        department_id: item.department_id, note: item.note || '',
        price_id: item.price_id, test_code: item.test_code, test_condition: item.test_condition,
        price_note: item.price_note != null && String(item.price_note).trim() !== '' ? item.price_note : null,
        group_id: item.group_id,
        discount_rate: item.discount_rate != null && String(item.discount_rate).trim() !== '' ? item.discount_rate : null,
        arrival_mode: item.arrival_mode === 'mail' ? 'delivery' : item.arrival_mode,
        sample_arrival_status: isSalesRequestMode
          ? (item.sample_arrival_status || '')
          : (item.sample_arrival_status || 'arrived'),
        service_urgency: item.service_urgency || 'normal',
        seq_no: item.seq_no || null
      })),
      assignmentInfo: {
        account: isSalesRequestMode
          ? (getSession()?.user?.username || formData.salesPerson)
          : formData.salesPerson
      }
    };

    const requestTemplateData = buildRequestTemplateData(commissionData, {
      selectedCustomer, selectedPayer, salesUserId, salesName, salesEmail, salesPhone, salesSignatureDate
    });
    const requestPacket = {
      commissionData,
      templateData: requestTemplateData,
      formSnapshot: {
        formData: isAdditionalTestWorkflow ? { ...formData, testItems: effectiveTestItems } : formData,
        businessTestItems: (isSalesRequestMode || workflowMode === 'direct') ? effectiveTestItems : businessTestItemsSnapshot,
        selectedCustomer,
        selectedPayer,
        isTransferMode,
        orderMonthPreference,
        previousOrderId,
        previousOrderSearchTerm,
        selectedPreviousOrder,
        salesUserId,
        salesName,
        salesEmail,
        salesPhone
      }
    };

    if (workflowMode === 'request') {
      try {
        const response = await createOrderRequest(requestPacket);
        if (pendingAttachments.length) {
          try {
            await uploadPendingAttachments(response.data.request_id);
          } catch (attachmentError) {
            alert(`申请已提交，但部分附件上传失败：\n${attachmentError.message}`);
          }
        }
        setSubmittedRequest(response.data);
      } catch (error) {
        alert(error.response?.data?.message || '申请提交失败，请重试');
      }
      return;
    }

    if (workflowMode === 'change' || workflowMode === 'additionalTest') {
      try {
        const requestType = isModificationMode ? 'modification' : 'additional_test';
        const response = await createOrderFollowUp(requestId, requestType, requestPacket);
        if (pendingAttachments.length) {
          try {
            for (const pending of pendingAttachments) await uploadOrderRequestFile(response.data.request_id, pending.file, pending.kind);
          } catch (attachmentError) {
            alert(`申请已提交，但部分附件上传失败：\n${attachmentError.response?.data?.message || attachmentError.message}`);
          }
        }
        setSubmittedRequest(response.data);
      } catch (error) {
        alert(error.response?.data?.message || `${isModificationMode ? '修改' : '加测'}申请提交失败，请重试`);
      }
      return;
    }

    if (workflowMode === 'edit') {
      try {
        let currentVersion = requestMeta?.version;
        if (pendingAttachments.length) {
          try {
            currentVersion = await uploadPendingAttachments(requestId);
          } catch (attachmentError) {
            alert(`部分附件上传失败：\n${attachmentError.message}\n请保留当前页面后重试。`);
            return;
          }
        }
        const response = await updateOrderRequest(requestId, requestPacket, currentVersion);
        setRequestMeta(prev => prev ? { ...prev, status: 'submitted', reviewNote: null, version: response.data.version } : prev);
        alert('申请修改已保存');
        navigate('/');
      } catch (error) {
        alert(error.response?.data?.message || '申请修改失败，请重试');
      }
      return;
    }

    if (workflowMode === 'review') {
      let openedOrderNum = '';
      setPdfAutomationBusy(true);
      try {
        const response = await openOrderRequest(requestId, requestPacket, requestMeta?.version);
        openedOrderNum = response.data.orderNum;
        await generateOrderRequestPdf(requestId);
        setApprovedRequest({
          requestId,
          orderNum: openedOrderNum,
          generatedMessage: '委托单已新增，PDF 已自动生成并关联到 LIMS。'
        });
      } catch (error) {
        const message = error.response?.data?.message || 'PDF 自动生成失败';
        if (openedOrderNum) {
          setApprovedRequest({ requestId, orderNum: openedOrderNum, generatedMessage: `委托单已新增，但 PDF 自动生成失败：${message}` });
        } else {
          alert(message || '开单失败，请重试');
        }
      } finally {
        setPdfAutomationBusy(false);
      }
      return;
    }

    let createdOrderNum = '';
    setPdfAutomationBusy(true);
    try {
      const response = await createCommission({ ...commissionData, directRequestPayload: requestPacket });
      createdOrderNum = response.data.orderNum;
      const sampleTypeMap = { 1: '板材', 2: '棒材', 3: '粉末', 4: '液体', 5: '其他' };
      const templateData = {
        ...buildOrderUrgencySymbols(commissionData.orderInfo.order_urgency_type),
        reportSeals1Symbol: commissionData.orderInfo.report_seals.includes('normal') ? '☑' : '☐',
        reportSeals2Symbol: commissionData.orderInfo.report_seals.includes('cnas') ? '☑' : '☐',
        reportSeals3Symbol: commissionData.orderInfo.report_seals.includes('cma') ? '☑' : '☐',
        delivery_days_after_receipt: commissionData.orderInfo.delivery_days_after_receipt || '',
        sample_shipping_address: (commissionData.orderInfo.sample_shipping_address || ''),
        total_price: (commissionData.orderInfo.total_price || ''),
        order_num: response.data.orderNum,
        other_requirements: commissionData.orderInfo.other_requirements || '',
        subcontractingNotAcceptedSymbol: commissionData.orderInfo.subcontracting_not_accepted ? '☑' : '☐',
        invoiceType1Symbol: '☑', // 默认增值税普通发票
        invoiceType2Symbol: '☐',
        reportContent1Symbol: commissionData.reportInfo.type.includes(1) ? '☑' : '☐',
        reportContent2Symbol: commissionData.reportInfo.type.includes(2) ? '☑' : '☐',
        reportContent3Symbol: commissionData.reportInfo.type.includes(3) ? '☑' : '☐',
        reportContent4Symbol: commissionData.reportInfo.type.includes(4) ? '☑' : '☐',
        reportContent5Symbol: commissionData.reportInfo.type.includes(5) ? '☑' : '☐',
        reportContent6Symbol: commissionData.reportInfo.type.includes(6) ? '☑' : '☐',
        paperReportType1Symbol: commissionData.reportInfo.paper_report_shipping_type === '1' ? '☑' : '☐',
        paperReportType2Symbol: commissionData.reportInfo.paper_report_shipping_type === '2' ? '☑' : '☐',
        paperReportType3Symbol: commissionData.reportInfo.paper_report_shipping_type === '3' ? '☑' : '☐',
        headerType1Symbol: commissionData.reportInfo.header_type === '1' ? '☑' : '☐',
        headerType2Symbol: commissionData.reportInfo.header_type === '2' ? '☑' : '☐',
        reportForm1Symbol: commissionData.reportInfo.format_type === '1' ? '☑' : '☐',
        reportForm2Symbol: commissionData.reportInfo.format_type === '2' ? '☑' : '☐',
        report_additional_info: (commissionData.reportInfo.report_additional_info || ''),
        header_additional_info: (commissionData.reportInfo.header_other || ''),
        sampleHandlingType1Symbol: commissionData.sampleHandling.handling_type === '1' ? '☑' : '☐',
        sampleHandlingType2Symbol: commissionData.sampleHandling.handling_type === '2' ? '☑' : '☐',
        sampleHandlingType3Symbol: commissionData.sampleHandling.handling_type === '3' ? '☑' : '☐',
        sampleHandlingType4Symbol: commissionData.sampleHandling.handling_type === '4' ? '☑' : '☐',
        returnOptionSameSymbol: commissionData.sampleHandling.return_info?.returnAddressOption === 'same' ? '☑' : '☐',
        returnOptionOtherSymbol: commissionData.sampleHandling.return_info?.returnAddressOption === 'other' ? '☑' : '☐',
        return_address: commissionData.sampleHandling.return_info?.returnAddress || '',
        hazardSafetySymbol: commissionData.sampleRequirements.hazards.includes('Safety') ? '☑' : '☐',
        hazardFlammabilitySymbol: commissionData.sampleRequirements.hazards.includes('Flammability') ? '☑' : '☐',
        hazardIrritationSymbol: commissionData.sampleRequirements.hazards.includes('Irritation') ? '☑' : '☐',
        hazardVolatilitySymbol: commissionData.sampleRequirements.hazards.includes('Volatility') ? '☑' : '☐',
        hazardFragileSymbol: commissionData.sampleRequirements.hazards.includes('Fragile') ? '☑' : '☐',
        hazardOtherSymbol: commissionData.sampleRequirements.hazards.includes('Other') ? '☑' : '☐',
        hazard_other: (commissionData.sampleRequirements.hazardOther || ''),
        magnetismNonMagneticSymbol: commissionData.sampleRequirements.magnetism === 'Non-magnetic' ? '☑' : '☐',
        magnetismWeakMagneticSymbol: commissionData.sampleRequirements.magnetism === 'Weak-magnetic' ? '☑' : '☐',
        magnetismStrongMagneticSymbol: commissionData.sampleRequirements.magnetism === 'Strong-magnetic' ? '☑' : '☐',
        magnetismUnknownSymbol: commissionData.sampleRequirements.magnetism === 'Unknown' ? '☑' : '☐',
        conductivityConductorSymbol: commissionData.sampleRequirements.conductivity === 'Conductor' ? '☑' : '☐',
        conductivitySemiconductorSymbol: commissionData.sampleRequirements.conductivity === 'Semiconductor' ? '☑' : '☐',
        conductivityInsulatorSymbol: commissionData.sampleRequirements.conductivity === 'Insulator' ? '☑' : '☐',
        conductivityUnknownSymbol: commissionData.sampleRequirements.conductivity === 'Unknown' ? '☑' : '☐',
        breakableYesSymbol: commissionData.sampleRequirements.breakable === 'yes' ? '☑' : '☐',
        breakableNoSymbol: commissionData.sampleRequirements.breakable === 'no' ? '☑' : '☐',
        brittleYesSymbol: commissionData.sampleRequirements.brittle === 'yes' ? '☑' : '☐',
        brittleNoSymbol: commissionData.sampleRequirements.brittle === 'no' ? '☑' : '☐',
        sales_user_id: salesUserId,
        sales_signature_date: salesSignatureDate || '',
        sales_name: salesName, sales_email: salesEmail, sales_phone: salesPhone,
        testItems: commissionData.testItems.map((item, i) => ({
          ...item,
          idx: i + 1,
          material: item.material.trim(),
          sampleTypeLabel: sampleTypeMap[item.sample_type] || item.sample_type || '',
          samplePrepYesSymbol: item.sample_preparation === 1 ? '☑' : '☐',
          samplePrepNoSymbol: item.sample_preparation === 0 ? '☑' : '☐',
        })),
        customer_name: (selectedCustomer.customer_name || ''),
        customer_address: (selectedCustomer.customer_address || ''),
        customer_contactName: (selectedCustomer.contact_name || ''),
        customer_contactEmail: (selectedCustomer.contact_email || ''),
        customer_contactPhone: (selectedCustomer.contact_phone_num || ''),
        payer_name: (selectedPayer.payer_name || ''),
        payer_address: (selectedPayer.payer_address || ''),
        payer_contactName: (selectedPayer.payer_contact_name || ''),
        payer_contactEmail: (selectedPayer.payer_contact_email || ''),
        payer_contactPhone: (selectedPayer.payer_contact_phone_num || ''),
        payer_bankName: (selectedPayer.bank_name || ''),
        payer_taxNumber: (selectedPayer.tax_number || ''),
        payer_bankAccount: (selectedPayer.bank_account || '')
      };

      const hasDept = id => commissionData.testItems.some(i => String(i.department_id) === String(id));
      const now = new Date(); const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, '0'); const dd = String(now.getDate()).padStart(2, '0');
      const receiptDate = `${yyyy}-${mm}-${dd}`;

      const machiningItems = []; const mechanicsItems = []; const microItems = []; const physchemItems = []; const chemistryItems = [];
      commissionData.testItems.forEach((item, idx) => {
        const [namePart, condPart] = (item.test_item || '').split(' - ').map(s => s.trim());
        const row = {
          idx: idx + 1,
          sample_code: `${response.data.orderNum} - ${String(idx + 1).padStart(3, '0')}`,
          test_item: namePart || '',
          project_code: item.test_code ? (condPart ? `${item.test_code}-${condPart}` : item.test_code) : '',
          method: item.test_method,
          quantity: item.quantity,
          note: item.note || '',
          original_no: item.original_no,
          sample_name: item.sample_name
        };
        if (item.test_code && item.test_code.startsWith('LX')) machiningItems.push(row);
        else {
          switch (String(item.department_id)) {
            case '3': mechanicsItems.push(row); break;
            case '1': microItems.push(row); break;
            case '2': physchemItems.push(row); break;
            case '6': chemistryItems.push(row); break;
            default: break;
          }
        }
      });

      const flowData = {
        order_num: response.data.orderNum,
        commissioner_name: (selectedCustomer.customer_name || ''),
        contact_name: (selectedCustomer.contact_name || ''),
        customer_name: (selectedCustomer.customer_name || ''),
        customer_contactName: (selectedCustomer.contact_name || ''),
        machiningCenterSymbol: machiningItems.length > 0 ? '☑' : '☐',
        mechanicsSymbol: mechanicsItems.length > 0 ? '☑' : '☐',
        microSymbol: hasDept(1) ? '☑' : '☐',
        physchemSymbol: hasDept(2) ? '☑' : '☐',
        chemistrySymbol: hasDept(6) ? '☑' : '☐',
        sampleReceivedDate: receiptDate,
        showMechanicsTable: hasDept(3),
        showMicroTable: hasDept(1),
        showPhyschemTable: hasDept(2),
        showChemistryTable: hasDept(6),
        reportContent1Symbol: commissionData.reportInfo.type.includes(1) ? '☑' : '☐',
        reportContent2Symbol: commissionData.reportInfo.type.includes(2) ? '☑' : '☐',
        reportContent3Symbol: commissionData.reportInfo.type.includes(3) ? '☑' : '☐',
        reportContent6Symbol: commissionData.reportInfo.type.includes(6) ? '☑' : '☐',
        reportSeals1Symbol: commissionData.orderInfo.report_seals.includes('normal') ? '☑' : '☐',
        reportSeals2Symbol: commissionData.orderInfo.report_seals.includes('cnas') ? '☑' : '☐',
        reportSeals3Symbol: commissionData.orderInfo.report_seals.includes('cma') ? '☑' : '☐',
        reportForm1Symbol: commissionData.reportInfo.format_type === '1' ? '☑' : '☐',
        reportForm2Symbol: commissionData.reportInfo.format_type === '2' ? '☑' : '☐',
        headerType1Symbol: commissionData.reportInfo.header_type === '1' ? '☑' : '☐',
        headerType2Symbol: commissionData.reportInfo.header_type === '2' ? '☑' : '☐',
        header_additional_info: (commissionData.reportInfo.header_other || ''),
        ...buildOrderUrgencySymbols(commissionData.orderInfo.order_urgency_type),
        delivery_days_after_receipt: commissionData.orderInfo.delivery_days_after_receipt,
        returnNoSymbol: commissionData.sampleHandling.handling_type === '1' ? '☑' : '☐',
        returnPickupSymbol: commissionData.sampleHandling.handling_type === '2' ? '☑' : '☐',
        returnMailSymbol: commissionData.sampleHandling.handling_type === '3' ? '☑' : '☐',
        other_requirements: (commissionData.orderInfo.other_requirements || ''),
        hazardSafetySymbol: commissionData.sampleRequirements.hazards.includes('Safety') ? '☑ 无危险性' : null,
        hazardFlammabilitySymbol: commissionData.sampleRequirements.hazards.includes('Flammability') ? '☑ 易燃易爆' : null,
        hazardIrritationSymbol: commissionData.sampleRequirements.hazards.includes('Irritation') ? '☑ 刺激性' : null,
        hazardVolatilitySymbol: commissionData.sampleRequirements.hazards.includes('Volatility') ? '☑ 易挥发' : null,
        hazardFragileSymbol: commissionData.sampleRequirements.hazards.includes('Fragile') ? '☑ 易碎' : null,
        hazardOtherSymbol: commissionData.sampleRequirements.hazards.includes('Other') ? `☑ 其他: ${commissionData.sampleRequirements.hazardOther}` : null,
        magnetismNonMagneticSymbol: commissionData.sampleRequirements.magnetism === 'Non-magnetic' ? '☑ 无磁' : null,
        magnetismWeakMagneticSymbol: commissionData.sampleRequirements.magnetism === 'Weak-magnetic' ? '☑ 弱磁' : null,
        magnetismStrongMagneticSymbol: commissionData.sampleRequirements.magnetism === 'Strong-magnetic' ? '☑ 强磁' : null,
        magnetismUnknownSymbol: commissionData.sampleRequirements.magnetism === 'Unknown' ? '☑ 未知' : null,
        conductivityConductorSymbol: commissionData.sampleRequirements.conductivity === 'Conductor' ? '☑ 导体' : null,
        conductivitySemiconductorSymbol: commissionData.sampleRequirements.conductivity === 'Semiconductor' ? '☑ 半导体' : null,
        conductivityInsulatorSymbol: commissionData.sampleRequirements.conductivity === 'Insulator' ? '☑ 绝缘体' : null,
        conductivityUnknownSymbol: commissionData.sampleRequirements.conductivity === 'Unknown' ? '☑ 未知' : null,
        breakableYesSymbol: commissionData.sampleRequirements.breakable === 'yes' ? '☑ 是' : null,
        brittleYesSymbol: commissionData.sampleRequirements.brittle === 'yes' ? '☑ 是' : null,
        brittleNoSymbol: commissionData.sampleRequirements.brittle === 'no' ? '☑ 否' : null,
        projectLeader: '',
        machiningItems, mechanicsItems, microItems, physchemItems, chemistryItems,
      };

      const orderNum = response.data.orderNum;
      const custName = selectedCustomer.customer_name;
      const contactName = selectedCustomer.contact_name;
      await generateDirectOrderPdf(orderNum, templateData);
      setDirectCreatedOrder({
        orderNum,
        customerName: custName,
        contactName,
        generatedMessage: '委托单已新增，PDF 已自动生成并关联到 LIMS。'
      });
      setShowDownloadModal(true);
    } catch (error) {
      const msg = await apiErrorMessage(error, '服务器出现错误，请重试');
      if (createdOrderNum) {
        setDirectCreatedOrder({ orderNum: createdOrderNum, generatedMessage: `委托单已新增，但 PDF 自动生成失败：${msg}` });
        setShowDownloadModal(true);
      } else {
        alert(msg);
      }
      console.error('Creating commission Error:', error);
    } finally {
      setPdfAutomationBusy(false);
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    // 更换委托方时不能沿用上一付款方的服务方联系人/签名。
    // 联系人将在实际选择付款方后，严格按 payers.owner_user_id 获取。
    setSelectedPayer(null);
    setFormData(prev => ({ ...prev, salesPerson: '' }));
    setSalesUserId('');
    setSalesName('');
    setSalesEmail('');
    setSalesPhone('');
    setSalesSignatureDate('');
    
    try {
      prefillPayment(customer.commissioner_id)
        .then(response => {
          if (response.data.length > 0) { setPrefillPayers(response.data); setShowPrefillModal(true); }
          else { setShowCustomerModal(false); }
        })
        .catch(error => console.error('拉取付款方信息失败:', error));
    } catch (error) { console.error('拉取付款方信息失败:', error); }
  };

  const handlePayerSelect = (payer) => { setSelectedPayer(payer); setShowPayerModal(false); };
  const handlePrefillYes = (payer) => { setSelectedPayer(payer); setShowCustomerModal(false); setShowPrefillModal(false); };
  const handlePrefillNo = () => { setShowCustomerModal(false); setShowPrefillModal(false); };

  if (requestLoading) return <div className="workflow-loading">正在载入申请内容…</div>;
  const isReadOnly = workflowMode === 'view';
  const toolbarTitle = workflowMode === 'review'
    ? '正式开单'
    : workflowMode === 'view'
      ? '查看委托申请'
      : workflowMode === 'edit'
        ? '修改委托申请'
      : isModificationMode
        ? '申请修改已开委托单'
      : isAdditionalTestMode
        ? '申请加测'
      : workflowMode === 'direct'
        ? '自行创建委托单'
        : '新建委托申请';
  const toolbarHint = workflowMode === 'review'
    ? '根据业务申请快照填写正式检测项目，并录入 LIMS'
    : workflowMode === 'view'
      ? '完整表单只读展示，内容不可修改'
      : workflowMode === 'edit'
        ? '修改后保存，申请将继续等待开单员审批'
      : isModificationMode
        ? '检测项目名称保持不变，其他项目信息可修改；修改痕迹会在预览中标记'
      : isAdditionalTestMode
        ? '原委托信息和原检测项目保持只读，仅允许新增加测项目'
      : workflowMode === 'direct'
        ? '直接创建正式委托单，可使用实验室转单功能'
        : '填写完成后将提交给开单员审批';
  const requestStatusLabel = requestMeta
    ? (requestMeta.status === 'approved'
      ? (requestMeta.orderOpened ? '已开单' : '待开单')
      : ({ submitted: '待审批', returned: '已驳回', withdrawn: '已撤回' }[requestMeta.status] || requestMeta.status))
    : '';
  const previousMonthOption = buildOrderMonthPreference('previous');
  const currentMonthOption = buildOrderMonthPreference('current');
  const nextMonthOption = buildOrderMonthPreference('next');
  return (
    <div className={`workflow-form-page${isReadOnly ? ' workflow-readonly-mode' : ''}${workflowMode === 'review' ? ' workflow-review-mode' : ''}${isModificationMode ? ' workflow-change-mode' : ''}${isAdditionalTestWorkflow ? ' workflow-additional-test-mode' : ''}`}>
      <div className="workflow-toolbar">
        <button type="button" onClick={() => navigate('/')}>← 返回列表</button>
        <div>
          <strong>{toolbarTitle}</strong>
          <span>{toolbarHint}</span>
        </div>
      </div>
      {isReadOnly && requestMeta && (
        <div className="workflow-readonly-summary">
          <div><span>申请编号</span><strong>{requestMeta.requestNo}</strong></div>
          <div><span>申请人</span><strong>{requestMeta.applicantName || '—'}</strong></div>
          <div><span>申请状态</span><strong>{requestStatusLabel}</strong></div>
          <div><span>正式委托单号</span><strong>{requestMeta.approvedOrderId || '—'}</strong></div>
          {requestMeta.reviewNote && <div className="readonly-review-note"><span>审核意见</span><strong>{requestMeta.reviewNote}</strong></div>}
        </div>
      )}
      {workflowMode === 'edit' && requestMeta?.status === 'returned' && requestMeta.reviewNote && (
        <div className="workflow-edit-notice">
          <span>退回原因</span>
          <strong>{requestMeta.reviewNote}</strong>
        </div>
      )}
      {(isModificationMode || isAdditionalTestMode) && (
        <div className="workflow-follow-up-notice">
          <span>{isModificationMode ? '修改申请' : '加测申请'}</span>
          <strong>正式委托单号：{requestMeta?.approvedOrderId || formData.orderNum}</strong>
        </div>
      )}
      {workflowMode === 'review' && (
        <div className="review-assigned-order">
          <span>正式委托单号</span>
          <strong>{formData.orderNum || requestMeta?.approvedOrderId || '系统单号载入中'}</strong>
        </div>
      )}
      <div className="header-section">
        <img src="/JITRI-logo3.png" alt="logo"></img>
        <h1>集萃检测开单系统</h1>
        <h2>检测委托合同<br/>Testing Application Contract</h2>
      </div>
      <form onSubmit={handleSubmit} onChangeCapture={(event) => {
        if (isModificationMode && !event.target.disabled) event.target.classList.add('change-field-highlight');
      }}>
        <fieldset className="workflow-form-shell" disabled={isReadOnly}>
        {(['direct', 'request'].includes(workflowMode) || (workflowMode === 'edit' && (requestMeta?.requestType || 'normal') === 'normal')) && (
          <section className="order-prefill-panel" aria-labelledby="order-prefill-title">
            <div className="order-prefill-main">
              <div className="order-prefill-copy">
                <strong id="order-prefill-title">预填委托单</strong>
                <span>输入历史委托单号，可将原单信息带入当前表单；不会作为本次正式委托单号提交。</span>
              </div>
              <div className="order-prefill-action">
                <input
                  type="text"
                  value={prefillOrderNum}
                  onChange={(event) => setPrefillOrderNum(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handlePrefill();
                    }
                  }}
                  placeholder="请输入历史委托单号"
                  aria-label="预填委托单号"
                  disabled={workflowMode === 'direct' && isTransferMode}
                />
                <button
                  type="button"
                  onClick={handlePrefill}
                  disabled={workflowMode === 'direct' && isTransferMode}
                >
                  预填表单
                </button>
              </div>
            </div>
            <div className="order-month-selector" role="group" aria-label="期望委托单月份">
              <strong className="order-month-title">委托单期望月份</strong>
              <div className={`order-month-options${workflowMode === 'direct' ? ' has-previous' : ''}`}>
                {workflowMode === 'direct' && (
                  <button
                    type="button"
                    className={`order-month-option previous${orderMonthPreference?.choice === 'previous' ? ' is-selected' : ''}`}
                    aria-pressed={orderMonthPreference?.choice === 'previous'}
                    onClick={() => setOrderMonthPreference(previousMonthOption)}
                  >
                    <b>上月</b>
                  </button>
                )}
                <button
                  type="button"
                  className={`order-month-option current${orderMonthPreference?.choice === 'current' ? ' is-selected' : ''}`}
                  aria-pressed={orderMonthPreference?.choice === 'current'}
                  onClick={() => setOrderMonthPreference(currentMonthOption)}
                >
                  <b>当月</b>
                </button>
                <button
                  type="button"
                  className={`order-month-option next${orderMonthPreference?.choice === 'next' ? ' is-selected' : ''}`}
                  aria-pressed={orderMonthPreference?.choice === 'next'}
                  onClick={() => setOrderMonthPreference(nextMonthOption)}
                >
                  <b>次月</b>
                </button>
              </div>
            </div>
            {workflowMode === 'direct' && isTransferMode && (
              <small>转单模式请使用下方“旧单号”检索，系统会按转单流程自动带入信息。</small>
            )}
          </section>
        )}
        {workflowMode === 'direct' && (<>
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => {
              if (isTransferMode) {
                // 取消转单模式
                setIsTransferMode(false);
                setPreviousOrderId('');
                setPreviousOrderSearchTerm('');
                setSelectedPreviousOrder(null);
              } else {
                // 开启转单模式
                setIsTransferMode(true);
                setFormData(prev => ({ ...prev, orderNum: '' }));
              }
            }}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: isTransferMode ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: isTransferMode ? '0 2px 4px rgba(220, 53, 69, 0.3)' : '0 2px 4px rgba(40, 167, 69, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = isTransferMode 
                ? '0 3px 6px rgba(220, 53, 69, 0.4)' 
                : '0 3px 6px rgba(40, 167, 69, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = isTransferMode 
                ? '0 2px 4px rgba(220, 53, 69, 0.3)' 
                : '0 2px 4px rgba(40, 167, 69, 0.3)';
            }}
          >
            {isTransferMode ? '✕ 取消转单模式' : '✓ 开启转单模式'}
          </button>
        </div>
        
        {isTransferMode ? (
          <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <label htmlFor="previousOrderId" style={{ display: 'block', marginBottom: '8px' }}>
              旧单号 Previous Order Number<span style={{ color: 'red' }}>*</span>:
            </label>
            <div style={{ position: 'relative', display: 'inline-block', width: '300px' }}>
              <input 
                type="text" 
                id="previousOrderId" 
                value={previousOrderSearchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setPreviousOrderSearchTerm(value);
                  setPreviousOrderId(value);
                  setSelectedPreviousOrder(null);
                  
                  // 清除之前的定时器
                  if (searchTimer) {
                    clearTimeout(searchTimer);
                  }
                  
                  // 延迟搜索，避免频繁请求
                  const timer = setTimeout(() => {
                    handleSearchPreviousOrder(value);
                  }, 300);
                  setSearchTimer(timer);
                }}
                onBlur={() => {
                  // 延迟隐藏，以便点击选择项
                  setTimeout(() => {
                    setPreviousOrderSearchResults([]);
                  }, 200);
                }}
                placeholder="输入旧单号进行搜索"
                style={{ width: '100%' }}
              />
              {previousOrderSearchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {previousOrderSearchResults.map(order => (
                    <div
                      key={order.order_id}
                      onClick={() => handleSelectPreviousOrder(order)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{order.order_id}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        <strong>客户：</strong>{order.customer_name}
                      </div>
                      {order.testItems && order.testItems.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                          <strong>检测项目：</strong>
                          <div style={{ marginLeft: '8px', marginTop: '2px' }}>
                            {order.testItems.slice(0, 3).map((item, idx) => (
                              <div key={idx} style={{ marginBottom: '2px' }}>
                                • {item.display}
                              </div>
                            ))}
                            {order.testItems.length > 3 && (
                              <div style={{ color: '#999', fontStyle: 'italic' }}>
                                ... 还有 {order.testItems.length - 3} 项
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedPreviousOrder && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#e8f5e9', 
                borderRadius: '4px', 
                marginTop: '8px', 
                marginBottom: '8px',
                border: '1px solid #c8e6c9'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#2e7d32' }}>已选择订单：</strong>
                  <span style={{ fontWeight: 'bold', fontSize: '16px', marginLeft: '8px' }}>
                    {selectedPreviousOrder.order_id}
                  </span>
                </div>
                <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                  <strong>客户名称：</strong>{selectedPreviousOrder.customer_name}
                </div>
                {selectedPreviousOrder.testItems && selectedPreviousOrder.testItems.length > 0 && (
                  <div style={{ fontSize: '14px' }}>
                    <strong>检测项目：</strong>
                    <div style={{ 
                      marginLeft: '8px', 
                      marginTop: '4px',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      padding: '8px',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}>
                      {selectedPreviousOrder.testItems.map((item, idx) => (
                        <div key={idx} style={{ 
                          marginBottom: '4px',
                          padding: '4px 0',
                          borderBottom: idx < selectedPreviousOrder.testItems.length - 1 ? '1px solid #eee' : 'none'
                        }}>
                          <span style={{ color: '#2e7d32' }}>•</span> {item.display}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <label htmlFor="newOrderNum" style={{ display: 'block', marginTop: '8px' }}>
              新单号 New Order Number（留空自动生成）:
            </label>
            <input 
              type="text" 
              id="newOrderNum" 
              name="orderNum" 
              value={formData.orderNum} 
              onChange={handleInputChange} 
              placeholder="留空将自动生成新单号"
              style={{ width: '300px' }}
            />
          </div>
        ) : (
          <>
            <label htmlFor="orderNum">新委托单号 New Order Number（留空自动生成）:
              <input type="text" id="orderNum" name="orderNum" value={formData.orderNum} onChange={handleInputChange} placeholder="留空将自动生成新单号" />
            </label>
          </>
        )}
        </>)}
        <h3>委托方信息 Applicant Information&nbsp;<span style={{ color: 'red' }}>*</span></h3>
        <div className="block">
          <button type="button" onClick={() => setShowCustomerModal(true)}>选择委托方</button>
          {selectedCustomer && (
            <div className='selected-customer-info'>
              <p>委托方名称 Customer Name：{selectedCustomer.customer_name}</p>
              <p>联系人 Contact：{selectedCustomer.contact_name}</p>
              <p>地址 Address：{selectedCustomer.customer_address}</p>
              <p>报告接收邮箱 E-mail：{selectedCustomer.contact_email}</p>
              <p>联系电话 Tel：{selectedCustomer.contact_phone_num}</p>
            </div>
          )}
          <p className='titleNote'>注：以上信息将显示在报告中，请仔细填写，填写语言需与报告语言一致。报告签发后修改需支付RMB 100元/份。<br/>The above information will appear in the report...</p>
        </div>

        {/* 服务方信息 - 根据委托方自动带出 */}
        {selectedCustomer && (
          <div>
            <h3>服务方信息 Receiver Information</h3>
            <p>Receiver Name：集萃新材料研发有限公司</p>
            <p><strong>联系人 Contact：{salesName || '未选择'}</strong></p>
            {salesEmail && <p><strong>邮箱 E-mail：{salesEmail}</strong></p>}
            {salesPhone && <p><strong>联系电话 Tel：{salesPhone}</strong></p>}
            <p>地址 Address：江苏省苏州市相城区青龙港路286号1号楼</p>
            <p>加★内容为必填项The field marked with★must be filled.</p>
          </div>
        )}

        <h3>付款方信息 Payer Information&nbsp;<span style={{ color: 'red' }}>*</span></h3>
        <div className="block">
          <button type="button" onClick={() => setShowPayerModal(true)}> 选择付款方 </button>
          {selectedPayer && (
            <div className="selected-payer-info">
              <p>名称 Name：{selectedPayer.payer_name}</p>
              <p>地址 Address：{selectedPayer.payer_address}</p>
              <p>电话 Tel：{selectedPayer.payer_phone_num}</p>
              <p>开户银行 Deposit Bank：{selectedPayer.bank_name}</p>
              <p>税号 Tax No.：{selectedPayer.tax_number}</p>
              <p>银行账号 Bank Account：{selectedPayer.bank_account}</p>
              <p>付款人 Payer：{selectedPayer.payer_contact_name}</p>
              <p>联系电话 Tel：{selectedPayer.payer_contact_phone_num}</p>
            </div>
          )}
        </div>

        <h3>检测信息 Test Information</h3>
        <fieldset><legend>检测要求 Testing Requirements</legend><label>以【检测要求附录】中信息为准 Subject to the Testing Requirements Appendix</label></fieldset>

        <fieldset className="period-type-card">
          <legend>周期类型 Period Type</legend>
          <div className="period-type-content">
            <div className="period-type-options" role="group" aria-label="委托单周期类型">
              {orderUrgencyOptions.map(option => (
                <label
                  key={option.value}
                  className={formData.orderUrgencyType === option.value ? 'is-selected' : ''}
                >
                  <input
                    type="checkbox"
                    checked={formData.orderUrgencyType === option.value}
                    onChange={() => setFormData(prev => ({ ...prev, orderUrgencyType: option.value }))}
                  />
                  <span>{option.label} <small>{option.english}</small></span>
                  {option.fee && <em>（{option.fee}）</em>}
                </label>
              ))}
            </div>
            <div className="period-delivery-time">
              <strong>交付时间 <small>Delivery time</small>：</strong>
              <span>收样后</span>
              <input type="number" name="deliveryDays" min="0" value={formData.deliveryDays} onChange={handleInputChange} />
              <span>个工作日 <small>（working days after sample receipt）</small></span>
            </div>
            <p className="period-type-note">注：周六、周日及节假日不计入工作日 Saturday, Sunday and festival days are not workdays</p>
          </div>
        </fieldset>

        {/* 样品到达信息移动到每个检测项目行内 */}

        <h3>报告要求 Report Requirements</h3>
        <fieldset className="report-requirements-card">
          <legend>报告文档 Report Content&nbsp;<span style={{ color: 'red' }}>*</span></legend>
          <div className="report-row">
            <div className="report-row-label">报告版式<br/><small>Report version</small></div>
            <div className="report-row-content report-version-content">
              <div className="report-version-option">
                <label><input type="checkbox" onChange={(e) => handleReportTypeChange('测试图片或数据汇总(无需测试报告) Test pictures or data summaries(No test report)', e.target.checked)} checked={formData.reportType.includes(1)} />测试图片或数据汇总（无需测试报告） <span>Test pictures or data summaries (No test report)</span></label>
              </div>
              {!formData.reportType.includes(1) && (
                <div className="report-version-option report-delivery-section">
                  <div className="report-subsection-title">交付形式 <small>Delivery format</small></div>
                  <div className="report-inline-options">
                    <label><input type="radio" name="reportDelivery" onChange={() => handleReportTypeChange('仅电子版报告', true)} checked={formData.reportType.includes(4)} />仅电子版报告 <span>E-report only</span></label>
                    <label><input type="radio" name="reportDelivery" onChange={() => handleReportTypeChange('电子版+纸质版报告', true)} checked={formData.reportType.includes(5)} />电子版+纸质版报告 <span>Electronic + Printed report</span></label>
                  </div>
                  <div className="report-language-options">
                    <label><input type="radio" name="reportLanguage" onChange={() => handleReportTypeChange('中文报告 Chinese report', true)} checked={formData.reportType.includes(2)} />中文报告 <span>Chinese report</span></label>
                    <label><input type="radio" name="reportLanguage" onChange={() => handleReportTypeChange('英文报告 English report', true)} checked={formData.reportType.includes(3)} />英文报告 <span>English report</span></label>
                    <label><input type="radio" name="reportLanguage" onChange={() => handleReportTypeChange('中英文对照报告Chinese-English bilingual report', true)} checked={formData.reportType.includes(6)} />中英文对照报告 <span>Chinese-English bilingual report</span></label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!formData.reportType.includes(1) && (
            <>
              <div className="report-row">
                <div className="report-row-label">报告标识章<br/><small>Report seals</small></div>
                <div className="report-row-content report-inline-options">
                  <label><input type="checkbox" value="normal" checked={formData.reportSeals.includes('normal')} onChange={handleReportSealsChange} />普通报告 <span>Normal report</span></label>
                  <label><input type="checkbox" value="cnas" checked={formData.reportSeals.includes('cnas')} onChange={handleReportSealsChange} />CNAS</label>
                  <label><input type="checkbox" value="cma" checked={formData.reportSeals.includes('cma')} onChange={handleReportSealsChange} />CMA</label>
                </div>
              </div>
            </>
          )}
          {formData.reportType.includes(5) && (
            <div className="report-row">
              <div className="report-row-label">纸质版寄送地址<br/><small>Mailing address</small></div>
              <div className="report-row-content report-mailing-options">
                <label><input type="radio" name="paperReportShippingType" value="1" onChange={handleRadioChange} checked={formData.paperReportShippingType === '1'} />邮寄到委托方 <span>To the applicant</span></label>
                <label><input type="radio" name="paperReportShippingType" value="2" onChange={handleRadioChange} checked={formData.paperReportShippingType === '2'} />邮寄到付款方 <span>To the payer</span></label>
                <label><input type="radio" name="paperReportShippingType" value="3" onChange={handleRadioChange} checked={formData.paperReportShippingType === '3'} />其他 <span>Others</span></label>
                {formData.paperReportShippingType === '3' && <input className="report-address-input" type="text" name="reportAdditionalInfo" value={formData.reportAdditionalInfo} onChange={handleInputChange} placeholder="请输入地址、收件人和电话" />}
              </div>
            </div>
          )}
        </fieldset>

        {!formData.reportType.includes(1) && (<>
          <fieldset>
            <legend>报告抬头 Report Header&nbsp;<span style={{ color: 'red' }}>*</span></legend>
            {Object.keys(reportHeaderOptions).map(option => (
              <label key={option}><input type="radio" name="reportHeader" value={reportHeaderOptions[option]} onClick={() => handleRadioClick('reportHeader', String(reportHeaderOptions[option]))} checked={formData.reportHeader === String(reportHeaderOptions[option])} readOnly /> {option}</label>
            ))}
            {formData.reportHeader === '2' && (
              <label style={{ display: 'block', marginTop: 8 }}>其他(地址/收件人/电话)Others
                <input type="text" name="reportHeaderAdditionalInfo" value={formData.reportHeaderAdditionalInfo} onChange={handleInputChange} style={{ width: '60%', marginLeft: 4 }} placeholder="请输入补充信息" />
              </label>
            )}
          </fieldset>

          <fieldset>
            <legend>报告对应方式 Report Mapping&nbsp;<span style={{ color: 'red' }}>*</span></legend>
            {Object.keys(reportFormOptions).map(option => (
              <label key={option}><input type="radio" name="reportForm" value={reportFormOptions[option]} onClick={() => handleRadioClick('reportForm', String(reportFormOptions[option]))} checked={formData.reportForm === String(reportFormOptions[option])} readOnly /> {option}</label>
            ))}
          </fieldset>
        </>)}

        <fieldset>
          <p>
            <strong>重要说明Important Notes:</strong>
            <br></br>
            1.JITRIAMRI仅对来样检测结果负责，不承担样品真实性、客户指定方法缺陷导致的误差责任。委托方须于报告签发15日内提出异议，可凭余样申请复检（结果无误则正常收费），超期未异议视为验收合格。样品销毁/退回后不再受理复检，超期样品处置不另行通知，委托方信息变更未提前5日书面告知的自行承担后果。JITRIAMRI is solely responsible for the test results of submitted samples, not for sample authenticity or defects in client-specified methodologies. Retest requests must be submitted within 15 days of report delivery, subject to retained sample availability; standard fees apply if original results are confirmed. Retests after sample disposal/return or post-deadline will not be processed. Uncontested reports within 15 days are deemed accepted. Post-deadline sample disposal occurs without notice. Clients bear risks for un-updated information without 5-day prior written notice.
            <br></br>
            2.委托方须于报告签发后30日内支付服务款，超期15日未付视为违约，受托方可暂停服务并追讨费用及法律追偿（含诉讼费、保全费、律师费）。检测验收或报告签发15日内未提出异议即视为确认，不得以异议为由拒付。The Client shall settle payment within 30 days post-report issuance. Delinquency exceeding 15 days constitutes default, entitling the Service Provider to suspend services, reclaim fees, and pursue legal recovery (including litigation costs, preservation bonds, and attorney fees). Full payment obligation arises upon either: (a) testing acceptance, or (b) 15-day non-dispute period post-report issuance. Disputes may not be invoked to withhold payment.
            <br></br>
          </p>
        </fieldset>

        {(workflowMode === 'review' || workflowMode === 'view') && businessTestItemsSnapshot.length > 0 && (
          <section className="business-test-snapshot">
            <div className="business-test-snapshot-heading">
              <h3>业务申请检测项目</h3>
              {workflowMode === 'review' && (
                <button type="button" onClick={handleTestItemsWordDownload} disabled={testItemsWordDownloading}>
                  {testItemsWordDownloading ? '导出中…' : 'Word版导出'}
                </button>
              )}
            </div>
            <p>以下内容为业务提交时的原始填写，仅供开单录入参考。</p>
            <div className="test-item-table-wrapper business-snapshot-scroll">
              <table className="business-snapshot-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th className="sample-wide-col">样品名称</th>
                    <th className="sample-wide-col">材质</th>
                    <th>样品类型</th>
                    <th className="sample-wide-col">样品原号</th>
                    <th>检测项目</th>
                    <th>检测标准</th>
                    <th>样品到达方式</th>
                    <th>是否到样</th>
                    <th>流转备注</th>
                    <th>数量</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {businessTestItemsSnapshot.map((item, index) => {
                    const mappedSampleType = Object.entries(typeMappings.sampleType)
                      .find(([, value]) => String(value) === String(item.sampleType))?.[0];
                    const sampleTypeText = String(item.sampleType) === '5'
                      ? (item.sampleTypeCustom || '其他')
                      : (mappedSampleType || item.sampleType || '—');
                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td className="sample-wide-col">{item.sampleName || '—'}</td>
                        <td className="sample-wide-col">{item.material || '—'}</td>
                        <td>{sampleTypeText}</td>
                        <td className="sample-wide-col">{item.original_no || '—'}</td>
                        <td>{item.test_item || '—'}</td>
                        <td>{item.test_method || '—'}</td>
                        <td>{item.arrival_mode === 'on_site' ? '现场到达' : ['mail', 'delivery'].includes(item.arrival_mode) ? '寄样' : '—'}</td>
                        <td>{item.sample_arrival_status === 'arrived' ? '是' : item.sample_arrival_status === 'not_arrived' ? '否' : '—'}</td>
                        <td>{item.flow_note || '—'}</td>
                        <td>{item.quantity || '—'}</td>
                        <td>{item.note || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isSalesRequestMode ? (
          <>
            <h3>检测项目</h3>
            <div className="test-item-table-wrapper business-entry-scroll">
              <table className="business-test-item-table">
                <thead>
                  <tr>
                    <th className="num">序号</th>
                    <th className="sample-wide-col">样品名称<span style={{ color: 'red' }}>*</span></th>
                    <th className="sample-wide-col">材质<span style={{ color: 'red' }}>*</span></th>
                    <th>样品类型<span style={{ color: 'red' }}>*</span></th>
                    <th className="sample-wide-col">样品原号</th>
                    <th className="business-test-name-col">检测项目<span style={{ color: 'red' }}>*</span></th>
                    <th>检测标准<span style={{ color: 'red' }}>*</span></th>
                    <th className="business-choice-col">样品到达方式</th>
                    <th className="business-choice-col">是否到样</th>
                    <th className="business-flow-note-col">流转备注</th>
                    <th>数量<span style={{ color: 'red' }}>*</span></th>
                    <th>备注</th>
                    <th className="action-col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.testItems.map((item, index) => {
                    const mappedSampleType = Object.entries(typeMappings.sampleType)
                      .find(([, value]) => String(value) === String(item.sampleType))?.[0];
                    const sampleTypeValue = String(item.sampleType) === '5'
                      ? (item.sampleTypeCustom || '')
                      : (mappedSampleType || item.sampleType || '');
                    return (
                      <tr key={index} className={item._locked ? 'locked-test-item-row' : (isModificationMode ? 'modification-test-item-row' : (isAdditionalTestMode ? 'additional-new-test-row' : ''))}>
                        <td className="num">{index + 1}</td>
                        <td className="sample-wide-col"><input type="text" value={item.sampleName || ''} onChange={e => handleTestItemChange(index, 'sampleName', e.target.value)} /></td>
                        <td className="sample-wide-col"><input type="text" value={item.material || ''} onChange={e => handleTestItemChange(index, 'material', e.target.value)} /></td>
                        <td><input type="text" value={sampleTypeValue} onChange={e => handleTestItemChange(index, 'sampleType', e.target.value)} /></td>
                        <td className="sample-wide-col"><input type="text" value={item.original_no || ''} onChange={e => handleTestItemChange(index, 'original_no', e.target.value)} /></td>
                        <td><input type="text" value={item.test_item || ''} onChange={e => handleTestItemChange(index, 'test_item', e.target.value)} disabled={isModificationMode || item._modificationNameLocked} title={isModificationMode ? '修改申请中检测项目名称不可修改' : undefined} /></td>
                        <td><input type="text" value={item.test_method || ''} onChange={e => handleTestItemChange(index, 'test_method', e.target.value)} /></td>
                        <td className="business-choice-cell">
                          {arrivalMethodOptions.map(option => (
                            <label key={option.key}>
                              <input
                                type="radio"
                                name={`business_arrival_${index}`}
                                checked={(item.arrival_mode || '') === option.key || (item.arrival_mode === 'delivery' && option.key === 'mail')}
                                onClick={() => handleTestItemChange(index, 'arrival_mode', option.key)}
                                readOnly
                              />
                              {option.label}
                            </label>
                          ))}
                        </td>
                        <td className="business-choice-cell">
                          <label>
                            <input
                              type="radio"
                              name={`business_arrived_${index}`}
                              checked={item.sample_arrival_status === 'arrived'}
                              onClick={() => handleTestItemChange(index, 'sample_arrival_status', 'arrived')}
                              readOnly
                            />
                            是
                          </label>
                          <label>
                            <input
                              type="radio"
                              name={`business_arrived_${index}`}
                              checked={item.sample_arrival_status === 'not_arrived'}
                              onClick={() => handleTestItemChange(index, 'sample_arrival_status', 'not_arrived')}
                              readOnly
                            />
                            否
                          </label>
                        </td>
                        <td><input type="text" value={item.flow_note || ''} onChange={e => handleTestItemChange(index, 'flow_note', e.target.value)} maxLength={500} /></td>
                        <td><input type="text" value={item.quantity || ''} onChange={e => handleTestItemChange(index, 'quantity', e.target.value)} /></td>
                        <td><input type="text" value={item.note || ''} onChange={e => handleTestItemChange(index, 'note', e.target.value)} /></td>
                        <td className="action-col add-remove-buttons">
                          {!(isModificationMode || item._locked) && <><button type="button" className="copy-button" onClick={() => duplicateTestItem(index)}>复制</button><button type="button" className="remove-button" onClick={() => removeTestItem(index)}>删除</button></>}
                          {(isModificationMode || item._locked) && <span className="locked-item-label">{isModificationMode ? '项目名称已锁定' : '原项目'}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!isModificationMode && <div className="add-test-item-button"><button type="button" onClick={addTestItem}>添加新项目</button></div>}
          </>
        ) : (
        <>
        {(workflowMode !== 'view' || formData.testItems.length > 0) && <h3>{workflowMode === 'review' ? '正式检测项目录入' : '检测项目'}</h3>}
        {(workflowMode !== 'view' || formData.testItems.length > 0) && <>
        <div className="test-item-table-wrapper formal-entry-scroll">
          <table className="test-item-table">
            <thead>
              <tr>
                <th className="num">序号</th>
                <th className="sample-wide-col">样品名称<span style={{ color: 'red' }}>*</span><br/>Sample Name</th>
                <th className="sample-wide-col">材质<span style={{ color: 'red' }}>*</span><br/>Material</th>
                <th>样品状态<span style={{ color: 'red' }}>*</span><br/>Sample Status</th>
                <th className="sample-wide-col">样品原号<br/>Sample No.</th>
                <th>业务报价<span style={{ color: 'red' }}>*</span><br/>Business Quote</th>
                <th>单位<span style={{ color: 'red' }}>*</span><br/>Unit</th>
                <th>折扣<span style={{ color: 'red' }}>*</span><br/>Discount(%)</th>
                <th>检测项目<span style={{ color: 'red' }}>*</span><br/>Test Items</th>
                <th>检测标准<span style={{ color: 'red' }}>*</span><br/>Methods</th>
                <th>到达方式<br/>Arrival</th>
                <th>是否到达<br/>Arrived</th>
                {workflowMode !== 'request' && <th>流转顺序<br/>Seq No</th>}
                <th>加急类型<br/>Service Urgency</th>
                {workflowMode !== 'direct' && workflowMode !== 'review' && <th className="flow-note-col">流转备注<br/>Flow note</th>}
                <th>数量<span style={{ color: 'red' }}>*</span><br/>Qty</th>
                <th>所属部门<span style={{ color: 'red' }}>*</span></th>
                <th>备注<br/>Remarks</th>
                <th className="action-col">操作</th>
              </tr>
            </thead>
            <tbody>
              {formData.testItems.map((item, index) => (
                <tr key={index} onDragOver={(e) => onRowDragOver(e, index)} onDrop={(e) => onRowDrop(e, index)} onDragLeave={onRowDragLeave} className={`${item._locked ? 'formal-locked-test-row' : (isAdditionalTestWorkflow ? 'additional-new-test-row' : '')}${dragOverIndex === index ? ' row-drag-over' : ''}`}>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    <span className="drag-handle" title={item._locked ? '原项目不可调整' : '按住拖动以调整顺序'} draggable={!item._locked} onDragStart={(e) => onHandleDragStart(e, index)} style={{ display:'inline-block', cursor:item._locked ? 'default' : 'grab', marginRight: 6, userSelect:'none' }}>⠿</span>
                    {index + 1}
                  </td>
                  <td className="sample-wide-col"><input type="text" value={item.sampleName || ''} onChange={e => handleTestItemChange(index, 'sampleName', e.target.value)} /></td>
                  <td className="sample-wide-col"><input type="text" value={item.material} onChange={e => handleTestItemChange(index, 'material', e.target.value)} /></td>
                  <td>
                    {String(item.sampleType) === '5' ? (
                      <input type="text" placeholder="请输入" value={item.sampleTypeCustom || ''} onChange={e => handleTestItemChange(index, 'sampleTypeCustom', e.target.value)} />
                    ) : (
                      <select value={item.sampleType === '' || item.sampleType == null ? '' : String(item.sampleType)} onChange={e => handleTestItemChange(index, 'sampleType', e.target.value)}>
                        <option value="" disabled>请选择</option>
                        {Object.entries(typeMappings.sampleType).map(([label, val]) => (<option key={val} value={String(val)}>{label}</option>))}
                      </select>
                    )}
                  </td>
                  <td className="sample-wide-col"><input type="text" value={item.original_no} onChange={(e) => handleTestItemChange(index, 'original_no', e.target.value)} /></td>
                  <td>
                    <input 
                      type="text" 
                      value={item.price_note || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        // 允许空值或纯数字（包括小数）
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          handleTestItemChange(index, 'price_note', val);
                        } else {
                          alert('价格备注只能输入纯数字！');
                        }
                      }} 
                      placeholder="必填"
                    />
                  </td>
                  <td>
                    <select
                      value={item.unit || ''}
                      onChange={(e) => handleTestItemChange(index, 'unit', e.target.value)}
                      style={{ width: 80 + 'px' }}
                    >
                      <option value="" disabled>--请选择--</option>
                      {unitOptions.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.discount_rate || ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          if (val === '' || Number(val) <= 100) {
                            handleTestItemChange(index, 'discount_rate', val);
                          } else {
                            alert('折扣率不能超过100%');
                          }
                        }
                      }}
                      placeholder="0-100"
                      style={{ width: 70 + 'px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editingTestItemIndex === index ? (item.test_item || '') : formatTestItemDisplay(item)}
                      onChange={(e) => handleTestItemInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleTestItemCodeEnter(e, index)}
                      onFocus={() => setEditingTestItemIndex(index)}
                      onBlur={() => setEditingTestItemIndex(null)}
                      placeholder="输入'项目代码'并按回车可自动带出"
                    />
                  </td>
                  <td><input type="text" value={item.test_method} onChange={(e) => handleTestItemChange(index, 'test_method', e.target.value)} /></td>
                  <td>
                    {arrivalMethodOptions.map(opt => (
                      <label key={opt.key} style={{ marginRight: 8 }}>
                        <input
                          type="radio"
                          name={`arrival_method_${index}`}
                          checked={(item.arrival_mode || '') === opt.key || ((item.arrival_mode === 'delivery') && opt.key === 'mail')}
                          onClick={() => handleTestItemChange(index, 'arrival_mode', opt.key)}
                          readOnly
                        /> {opt.label}
                      </label>
                    ))}
                  </td>
                  <td>
                    <label style={{ marginRight: 8 }}>
                      <input
                        type="radio"
                        name={`sample_arrived_${index}`}
                        checked={item.sample_arrival_status === 'arrived'}
                        onClick={() => handleTestItemChange(index, 'sample_arrival_status', 'arrived')}
                        readOnly
                      /> 是
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`sample_arrived_${index}`}
                        checked={item.sample_arrival_status === 'not_arrived'}
                        onClick={() => handleTestItemChange(index, 'sample_arrival_status', 'not_arrived')}
                        readOnly
                      /> 否
                    </label>
                  </td>
                  {workflowMode !== 'request' && <td>
                    <select 
                      value={item.seq_no === '' || item.seq_no == null ? '' : String(item.seq_no)} 
                      onChange={e => handleTestItemChange(index, 'seq_no', e.target.value === '' ? '' : Number(e.target.value))}
                      style={{ width: 70 + 'px' }}
                    >
                      <option value="">--</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </td>}
                  <td>
                    <select value={item.service_urgency || ''} onChange={e => handleTestItemChange(index, 'service_urgency', e.target.value)}>
                      <option value="" disabled>--请选择--</option>
                      {serviceUrgencyOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  {workflowMode !== 'direct' && workflowMode !== 'review' && <td className="flow-note-col"><input type="text" value={item.flow_note || ''} onChange={e => handleTestItemChange(index, 'flow_note', e.target.value)} maxLength={500} placeholder="填写流转、前处理或顺序要求" /></td>}
                  <td><input type="text" value={item.quantity} onChange={(e) => handleTestItemChange(index, 'quantity', e.target.value)} style={{ width: 50 + 'px' }} /></td>
                  {item.price_id
                    ? <td className='selected-price'><span>{departments.find(dept => String(dept.department_id) === String(item.department_id))?.department_name || '未知部门'}</span></td>
                    : <td><select value={item.department_id || ""} onChange={e => handleDepartmentChange(index, e.target.value)}>
                        <option value="" disabled>---请选择---</option>
                        {departments.map(dept => (<option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>))}
                      </select></td>}
                  <td><input type="text" value={item.note} onChange={(e) => handleTestItemChange(index, 'note', e.target.value)} /></td>
                  <td className="action-col add-remove-buttons">
                    {item._locked
                      ? <span className="locked-item-label">原项目</span>
                      : <><button type="button" className="copy-button" style={{ marginRight: 4 }} onClick={() => duplicateTestItem(index)}>复制</button><button type="button" className="add-button" onClick={() => { setSelectedTestIndex(index); setShowPriceModal(true); }}>选择项目</button><button type="button" className="remove-button" onClick={() => removeTestItem(index)}>删除</button></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isModificationMode && <div className="add-test-item-button"><button type="button" onClick={addTestItem}>添加新项目</button></div>}
        </>}
        </>
        )}
        <div className="block other-requirements-block">
          <div className={`other-requirements-layout${workflowMode === 'direct' ? ' is-single' : ''}`}>
            <div className="other-requirements-copy">
              <label>其他要求 Other Requirements:
                <input type="text" name="otherRequirements" value={formData.otherRequirements} onChange={handleOtherRequirementsChange} placeholder="填写其他特殊要求" />
              </label>
              <p>
                注Notes：<br></br>
                1.默认不出具评判结论；The judgment conclusion is not issued by default.<br></br>
                2.若客户未指明测试标准及年代号，则默认为客户接受我方集萃新材料研发有限公司(以下简称JITRIAMRI)推荐的测试方法及最新标准；If the customer does not specify the test standards and the year, it will be deemed by default that the customer accepts the test methods and the latest standards recommended by JITRIAMRI.
                <br></br>
                3.
                <label className="inline-selection-option">
                  <input
                    type="checkbox"
                    name="subcontractingNotAccepted"
                    checked={formData.subcontractingNotAccepted}
                    onChange={handleSubcontractingChange}
                  />
                  不接受分包 Subcontracting is not accepted
                </label>；如未选择，视为接受分包；If not selected, it will be regarded as acceptance of subcontracting.
                <br></br>
                4.若需要CMA、CNAS章或其他测试要求，请在其他要求中写明(可另附页)。If CMA, CNAS stamps or other testing requirements are needed, please specify them in the other requirements.
              </p>
            </div>
            {workflowMode !== 'direct' && (
              <aside className="request-attachments-panel">
                <div className="request-attachments-heading">
                  <strong>附件</strong>
                  <span>文件大小不限</span>
                </div>
                {[
                  { kind: 'request_image', title: '附件图片', hint: 'PNG/JPG，生成PDF时每张图片单独一页', accept: 'image/png,image/jpeg,.png,.jpg,.jpeg' },
                  { kind: 'test_requirement', title: '测试需求单', hint: '支持Word、Excel及其他文件格式', accept: undefined }
                ].map((group) => {
                  const pendingFiles = pendingAttachments.filter((item) => item.kind === group.kind);
                  const uploadedFiles = requestAttachments.filter((item) => group.kind === 'request_image'
                    ? item.file_type === 'request_image'
                    : item.file_type !== 'request_image');
                  return (
                    <section className={`request-attachment-group is-${group.kind}`} key={group.kind}>
                      <div className="request-attachment-group-heading"><strong>{group.title}</strong><small>{group.hint}</small></div>
                      <div className="request-attachments-list">
                        {uploadedFiles.length === 0 && pendingFiles.length === 0 && <p className="request-attachments-empty">暂无文件</p>}
                        {pendingFiles.map((pending) => (
                          <div className="request-attachment-item is-pending" key={pending.localId}>
                            <div><strong>{pending.file.name}</strong><span>{formatAttachmentSize(pending.file.size)} · 待提交</span></div>
                            <button type="button" className="request-attachment-remove" aria-label={`移除附件 ${pending.file.name}`} title="移除" onClick={() => setPendingAttachments(prev => prev.filter(item => item.localId !== pending.localId))}>❌</button>
                          </div>
                        ))}
                        {uploadedFiles.map((attachment) => (
                          <div className="request-attachment-item" key={attachment.file_id}>
                            <div>
                              <a href="#" onClick={(event) => { event.preventDefault(); handleAttachmentDownload(attachment); }}>
                                {attachmentActionId === `download-${attachment.file_id}` ? '下载中…' : attachment.original_filename}
                              </a>
                              <span>{formatAttachmentSize(attachment.file_size)}</span>
                            </div>
                            {!areAttachmentsReadOnly && attachment.can_delete && ['edit', 'review'].includes(workflowMode) && (
                              <button type="button" className="request-attachment-remove" aria-label={`删除附件 ${attachment.original_filename}`} title="删除" onClick={() => handleAttachmentDelete(attachment)} disabled={Boolean(attachmentActionId)}>❌</button>
                            )}
                          </div>
                        ))}
                      </div>
                      {isSalesRequestMode && !areAttachmentsReadOnly && (
                        <label className="request-attachment-upload">
                          <input type="file" multiple accept={group.accept} onChange={(event) => handleAttachmentSelect(event, group.kind)} />
                          <span>＋ 上传{group.title}</span>
                        </label>
                      )}
                    </section>
                  );
                })}
                {requestMeta?.status === 'approved' && (
                  <small>测试需求单在 LIMS 中管理；附件图片随委托单 PDF 查看。</small>
                )}
                {areAttachmentsReadOnly && (
                  <small>加测申请同步展示原申请附件，仅支持查看和下载。</small>
                )}
              </aside>
            )}
          </div>
        </div>
        <h3>样品要求 Sample Requirements</h3>
        <fieldset>
          <legend>样品信息 Sample Infomation</legend>
          <div className="sample-section">
            <p>危险特性 Hazard:&nbsp;<span style={{ color: 'red' }}>*</span></p>
            {hazardOptions.map(opt => (
              <label key={opt.key} style={{ marginRight: 12 }}>
                <input type="checkbox" checked={formData.sampleRequirements.hazards.includes(opt.key)} onChange={e => handleHazardChange(opt.key, e.target.checked)} /> {opt.label}
              </label>
            ))}
            <label style={{ display: 'block', marginTop: 8 }}>其他 Others:
              <input type="text" value={formData.sampleRequirements.hazardOther} onChange={e => handleNestedChange('sampleRequirements', 'hazardOther', e.target.value)} placeholder="请输入其他危险特性" style={{ marginLeft: 4, width: '40%' }} />
            </label>
          </div>
          <hr />
          <div className="sample-section">
            <p>样品磁性 Sample magnetism:&nbsp;<span style={{ color: 'red' }}>*</span></p>
            {magnetismOptions.map(opt => (
              <label key={opt.key} style={{ marginRight: 12 }}>
                <input type="radio" name="magnetism" checked={formData.sampleRequirements.magnetism === opt.key} onClick={() => handleNestedChange('sampleRequirements', 'magnetism', opt.key)} readOnly /> {opt.label}
              </label>
            ))}
          </div>
          <hr />
          <div className="sample-section">
            <p>样品导电性 Sample conductivity:&nbsp;<span style={{ color: 'red' }}>*</span></p>
            {conductivityOptions.map(opt => (
              <label key={opt.key} style={{ marginRight: 12 }}>
                <input type="radio" name="conductivity" checked={formData.sampleRequirements.conductivity === opt.key} onClick={() => handleNestedChange('sampleRequirements', 'conductivity', opt.key)} readOnly /> {opt.label}
              </label>
            ))}
          </div>
          <hr />
          <div className="sample-section">
            <p>2. 是否可以破坏 Can it be broken:&nbsp;<span style={{ color: 'red' }}>*</span></p>
            <label style={{ marginRight: 12 }}><input type="radio" name="breakable" checked={formData.sampleRequirements.breakable === 'yes'} onClick={() => handleNestedChange('sampleRequirements', 'breakable', 'yes')} readOnly /> 是 Yes</label>
            <label><input type="radio" name="breakable" checked={formData.sampleRequirements.breakable === 'no'} onClick={() => handleNestedChange('sampleRequirements', 'breakable', 'no')} readOnly /> 否 No</label>
          </div>
          <hr />
          <div className="sample-section">
            <p>3. 是否孤品 (As shown) :&nbsp;<span style={{ color: 'red' }}>*</span></p>
            <label style={{ marginRight: 12 }}><input type="radio" name="brittle" checked={formData.sampleRequirements.brittle === 'yes'} onClick={() => handleNestedChange('sampleRequirements', 'brittle', 'yes')} readOnly /> 是 Yes</label>
            <label><input type="radio" name="brittle" checked={formData.sampleRequirements.brittle === 'no'} onClick={() => handleNestedChange('sampleRequirements', 'brittle', 'no')} readOnly /> 否 No</label>
          </div>
        </fieldset>

        <fieldset>
          <legend>余样处置 Sample Handling&nbsp;<span style={{ color: 'red' }}>*</span></legend>
          <label><input type="radio" name="sampleSolutionType" value="1" onClick={() => handleRadioClick('sampleSolutionType', '1')} checked={formData.sampleSolutionType === '1'} readOnly />由服务方处理（样品留存90天，逾期销毁）</label>
          <label><input type="radio" name="sampleSolutionType" value="2" onClick={() => handleRadioClick('sampleSolutionType', '2')} checked={formData.sampleSolutionType === '2'} readOnly />委托方自取</label>
          <label><input type="radio" name="sampleSolutionType" value="3" onClick={() => handleRadioClick('sampleSolutionType', '3')} checked={formData.sampleSolutionType === '3'} readOnly />服务方协助寄回 (到付)</label>
          {formData.sampleSolutionType === '3' && (
            <div className="nested-return-address" style={{ paddingLeft: 20 }}>
              <label><input type="radio" name="returnAddressOption" value="same" onClick={() => handleNestedChange('sampleReturnInfo', 'returnAddressOption', 'same')} checked={formData.sampleReturnInfo.returnAddressOption === 'same'} readOnly />同委托方信息</label>
              <label><input type="radio" name="returnAddressOption" value="other" onClick={() => handleNestedChange('sampleReturnInfo', 'returnAddressOption', 'other')} checked={formData.sampleReturnInfo.returnAddressOption === 'other'} readOnly />其他 Others (Address/Recipient/Tel):</label>
              {formData.sampleReturnInfo.returnAddressOption === 'other' && (
                <input type="text" name="sampleShippingAddress" placeholder="填写退回地址/收件人/电话" value={formData.sampleShippingAddress} onChange={handleInputChange} style={{ display: 'block', marginTop: 4 }} />
              )}
            </div>
          )}
          <label><input type="radio" name="sampleSolutionType" value="4" onClick={() => handleRadioClick('sampleSolutionType', '4')} checked={formData.sampleSolutionType === '4'} readOnly />无剩余样品</label>
        </fieldset>

        <section className="signature-confirmation" aria-label="签名确认">
          <div className="signature-confirmation-cell">
            <strong>★委托方签名确认/日期：</strong>
            <span>Authorized Signature/Date：</span>
            <div className="signature-line commissioner-signature-line" aria-label="委托方电子签名">
              <div className="signature-preview">
                {commissionerSignatureUrl ? (
                  <img src={commissionerSignatureUrl} alt={`${selectedCustomer?.customer_name || '委托方'}的电子签名`} />
                ) : (
                  <span className="signature-preview-fallback">
                    {!selectedCustomer && <small>选择委托方后自动检测签名</small>}
                    {selectedCustomer && commissionerSignatureStatus === 'loading' && <small>正在检测电子签名…</small>}
                    {selectedCustomer && commissionerSignatureStatus === 'missing' && <small>该委托方尚未配置电子签名</small>}
                    {selectedCustomer && commissionerSignatureStatus === 'error' && <small>电子签名检测失败，请刷新重试</small>}
                  </span>
                )}
              </div>
              {(isSalesRequestMode || workflowMode === 'direct') && !isReadOnly && selectedCustomer && ['missing', 'ready'].includes(commissionerSignatureStatus) && (
                <div className="commissioner-signature-actions">
                  <button type="button" className="commissioner-signature-upload" onClick={() => commissionerSignatureInputRef.current?.click()} disabled={commissionerSignatureUploading}>
                    {commissionerSignatureUploading ? '处理中…' : commissionerSignatureStatus === 'ready' ? '重新上传' : '上传签名'}
                  </button>
                  {commissionerSignatureStatus === 'ready' && <button type="button" className="commissioner-signature-delete" onClick={handleCommissionerSignatureDelete} disabled={commissionerSignatureUploading}>删除</button>}
                </div>
              )}
              <input ref={commissionerSignatureInputRef} className="commissioner-signature-file" type="file" accept="image/png,.png" onChange={handleCommissionerSignatureUpload} />
            </div>
          </div>
          <div className="signature-confirmation-cell">
            <strong>★评审人确认/日期：</strong>
            <span>Representative/Date：</span>
            <div className="signature-line">
              <div className="signature-preview">
                {salesSignatureUrl ? (
                  <img
                    src={salesSignatureUrl}
                    alt={`${salesName || salesUserId}的电子签名`}
                    onLoad={() => setSalesSignatureStatus('ready')}
                    onError={() => {
                      setSalesSignatureUrl('');
                      setSalesSignatureStatus('error');
                    }}
                  />
                ) : (
                  <span className="signature-preview-fallback">
                    {salesName || ''}
                    {salesUserId && salesSignatureStatus === 'loading' && <small>（正在加载电子签名）</small>}
                    {salesUserId && salesSignatureStatus === 'missing' && <small>（{salesUserId} 签名图片待上传）</small>}
                    {salesUserId && salesSignatureStatus === 'error' && <small>（电子签名加载失败，请刷新重试）</small>}
                  </span>
                )}
              </div>
              {salesSignatureDate && <time dateTime={salesSignatureDate}>{salesSignatureDate}</time>}
            </div>
          </div>
        </section>

        {!isReadOnly && (
          <div className={`workflow-submit-actions${isSalesRequestMode ? ' has-preview' : ''}`}>
            {isSalesRequestMode && <button type="button" className="request-preview-button" onClick={() => setShowRequestPreview(true)}>预览</button>}
            <button
              type="submit"
              className="submit"
              disabled={workflowMode === 'request' && Boolean(selectedCustomer) && commissionerSignatureStatus !== 'ready'}
              title={workflowMode === 'request' && Boolean(selectedCustomer) && commissionerSignatureStatus !== 'ready' ? '请先上传委托方电子签名' : undefined}
            >
              {workflowMode === 'review'
                ? '确认开单'
                : isModificationMode
                  ? '保存修改'
                  : isAdditionalTestMode
                    ? '申请加测'
                : workflowMode === 'edit'
                  ? '保存修改'
                  : workflowMode === 'request'
                    ? '提交审批'
                    : '提交表单并生成Word'}
            </button>
          </div>
        )}

        <OrderRequestPreviewModal
          open={showRequestPreview}
          onClose={() => setShowRequestPreview(false)}
          requestId={requestId}
          imageAttachments={[
            ...requestAttachments.filter((item) => item.file_type === 'request_image'),
            ...pendingAttachments.filter((item) => item.kind === 'request_image')
          ]}
          packet={{
            formSnapshot: { formData, businessTestItems: isAdditionalTestWorkflow ? formData.testItems.filter((item) => !item._locked) : formData.testItems, selectedCustomer, selectedPayer, orderMonthPreference, salesUserId, salesName, salesEmail, salesPhone },
            templateData: { sales_user_id: salesUserId, sales_name: salesName, sales_email: salesEmail, sales_phone: salesPhone, sales_signature_date: salesSignatureDate }
          }}
          requestMeta={isAdditionalTestWorkflow ? { ...(requestMeta || {}), request_type: 'additional_test' } : requestMeta}
          commissionerSignatureUrl={commissionerSignatureUrl}
          salesSignatureUrl={salesSignatureUrl}
        />

        {showCustomerModal && (
          <div className="modal">
            <div className="modal-content">
              <h2 className="modal-title">委托方信息</h2>
              <div className='search-box'>
                <span>搜索委托方</span><input type="text" value={searchCustomerNameTerm} onChange={(e) => setSearchCustomerNameTerm(e.target.value)} placeholder="搜索委托方" className="search-input" />
                <span>搜索联系人</span><input type="text" value={searchContactNameTerm} onChange={(e) => setSearchContactNameTerm(e.target.value)} placeholder="搜索联系人" className="search-input" />
                <span>搜索联系人电话</span><input type="text" value={searchContactPhoneTerm} onChange={(e) => setSearchContactPhoneTerm(e.target.value)} placeholder="搜索联系人电话" className="search-input" />
              </div>
              <div className="table-container">
                <table className="payer-table">
                  <thead><tr><th className='title-id'>ID</th><th>委托方名称</th><th>地址</th><th>联系人名称</th><th>联系人电话</th><th>联系人邮箱</th><th>操作</th></tr></thead>
                  <tbody>
                    {customers.map(customer => (
                      <tr key={customer.id}>
                        <td className='title-id'>{customer.customer_id}</td>
                        <td>{customer.customer_name}</td>
                        <td>{customer.customer_address}</td>
                        <td>{customer.contact_name}</td>
                        <td>{customer.contact_phone_num}</td>
                        <td>{customer.contact_email}</td>
                        <td><button type="button" onClick={() => handleCustomerSelect(customer)}>选择</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setShowCustomerModal(false)}>关闭</button>
            </div>
          </div>
        )}

        {showPayerModal && (
          <div className="modal">
            <div className="modal-content">
              <h2 className="modal-title">付款方信息</h2>
              <div className='search-box'>
                <span>搜索付款方</span><input type="text" value={searchPayerNameTerm} onChange={(e) => setSearchPayerNameTerm(e.target.value)} placeholder="搜索付款方" className="search-input" />
                <span>搜索联系人/导师</span><input type="text" value={searchPayerContactNameTerm} onChange={(e) => setSearchPayerContactNameTerm(e.target.value)} placeholder="搜索联系人/导师" className="search-input" />
                <span>搜索联系人电话</span><input type="text" value={searchPayerContactPhoneTerm} onChange={(e) => setSearchPayerContactPhoneTerm(e.target.value)} placeholder="搜索联系人电话" className="search-input" />
              </div>
              <div className="table-container">
                <table className="payer-table">
                  <thead><tr><th className='title-id'>ID</th><th>付款方名称</th><th>地址</th><th>联系人/导师</th><th>联系人电话</th><th>操作</th></tr></thead>
                  <tbody>
                    {payers.map(payer => (
                      <tr key={payer.payment_id}>
                        <td className='title-id'>{payer.payment_id}</td>
                        <td>{payer.payer_name}</td>
                        <td>{payer.payer_address}</td>
                        <td>{payer.payer_contact_name}</td>
                        <td>{payer.payer_contact_phone_num}</td>
                        <td><button onClick={() => handlePayerSelect(payer)}>选择</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setShowPayerModal(false)}>关闭</button>
            </div>
          </div>
        )}

        {showPriceModal && (
          <div className="modal">
            <div className="modal-content">
              <h2 className="modal-title">选择检测项目</h2>
              <div className='search-box'>
                <span>搜索测试代码</span><input type="text" value={searchTestCode} onChange={(e) => setSearchTestCode(e.target.value)} placeholder="输入测试代码" className="search-input" />
                <span>搜索检测项目</span><input type="text" value={searchTestItem} onChange={(e) => setSearchTestItem(e.target.value)} placeholder="输入检测项目名称" className="search-input" />
                <span>搜索检测条件</span><input type="text" value={searchTestCondition} onChange={(e) => setSearchTestCondition(e.target.value)} placeholder="输入检测条件" className="search-input" />
              </div>
              <div className="table-container">
                <table className="payer-table">
                  <thead><tr><th className='title-id'>ID</th><th>测试代码</th><th>检测项目</th><th>检测条件</th><th>检测标准</th><th>金额</th><th>单位</th><th>操作</th></tr></thead>
                  <tbody>
                    {priceList
                      .filter(item => item.test_item_name.includes(searchTestItem) && item.test_condition.includes(searchTestCondition) && item.test_code.includes(searchTestCode))
                      .map(item => (
                        <tr key={item.price_id}>
                          <td>{item.price_id}</td>
                          <td>{item.test_code}</td>
                          <td>{item.test_item_name}</td>
                          <td>{item.test_condition}</td>
                          <td>{item.test_standard}</td>
                          <td>{item.amount}</td>
                          <td>{item.unit}</td>
                          <td><button onClick={() => handlePriceSelect(item)}>选择</button></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setShowPriceModal(false)}>关闭</button>
            </div>
          </div>
        )}

        {showPrefillModal && (
          <div className="modal">
            <div className="modal-content">
              <div>
                <p>检测到该委托方已绑定了对应的付款方信息：</p>
                <table className="payer-table">
                  <thead><tr><th className='title-id'>ID</th><th>付款方名称</th><th>联系人/导师</th><th>联系人电话</th></tr></thead>
                  <tbody>
                    {prefillPayers.map(payer => (
                      <tr key={payer.payer_id || payer.payment_id}>
                        <td className='title-id'>{payer.payer_id || payer.payment_id}</td>
                        <td>{payer.payer_name}</td>
                        <td>{payer.payer_contact_name}</td>
                        <td>{payer.payer_contact_phone_num}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>请选择是否需要预填？</p>
              <div className='decide-button'>
                <button type="button" onClick={() => setShowPrefillModal(false)}>否，我自己选择</button>
                <button type="button" onClick={() => handlePrefillYes(prefillPayers[0])}>是，帮我预填</button>
              </div>
            </div>
          </div>
        )}
        </fieldset>
      </form>

      {pdfAutomationBusy && (
        <div className="modal workflow-success-modal pdf-automation-modal">
          <div className="modal-content">
            <div className="pdf-automation-spinner" aria-hidden="true" />
            <h2>正在生成PDF中，请勿退出</h2>
            <p className="success-hint">系统正在完成委托单录入、PDF 生成和 LIMS 附件关联。</p>
          </div>
        </div>
      )}
      {showDownloadModal && (
        <div className="modal workflow-success-modal">
          <div className="modal-content">
            <div className="success-check">✓</div>
            <h2>委托单已新增</h2>
            <p>正式委托单号：<strong>{directCreatedOrder?.orderNum}</strong></p>
            <p className="success-hint">{directCreatedOrder?.generatedMessage}</p>
            <div className='decide-button review-success-actions'>
              <button type="button" className="secondary" onClick={() => {
                setShowDownloadModal(false);
                setDirectCreatedOrder(null);
                navigate('/');
              }}>关闭</button>
            </div>
          </div>
        </div>
      )}
      {submittedRequest && (
        <div className="modal workflow-success-modal">
          <div className="modal-content">
            <div className="success-check">✓</div>
            <h2>{submittedRequest.request_type === 'modification' ? '修改申请已提交' : submittedRequest.request_type === 'additional_test' ? '加测申请已提交' : '委托申请已提交'}</h2>
            <p>申请编号：<strong>{submittedRequest.request_no}</strong></p>
            <p className="success-hint">{submittedRequest.request_type === 'modification' ? '修改申请已提交，请等待审核。' : submittedRequest.request_type === 'additional_test' ? '加测已申请，请等待审批。' : '申请已进入审批流程。审批通过并由开单员生成 PDF 后，可在首页下载。'}</p>
            <div className="decide-button">
              <button type="button" className="secondary" onClick={() => navigate('/')}>返回</button>
            </div>
          </div>
        </div>
      )}
      {approvedRequest && (
        <div className="modal workflow-success-modal">
          <div className="modal-content">
            <div className="success-check">✓</div>
            <h2>委托单已新增</h2>
            <p>正式委托单号：<strong>{approvedRequest.orderNum}</strong></p>
            <p className="success-hint">{approvedRequest.generatedMessage}</p>
            <div className="decide-button review-success-actions">
              <button type="button" className="secondary" onClick={() => navigate('/')}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormPage;
