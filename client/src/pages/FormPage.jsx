import React, { useState, useEffect } from 'react';
import {
  getCommission,
  createCommission,
  generateDocument,
  getSalesperson,
  getCustomers,
  getPayers,
  prefillPayment,
  getPrices,
  getSalespersonContact,
  generateSampleFlow,
  generateOrderTemplate,
  generateProcessTemplate
} from '../api/api';
import { useNavigate } from 'react-router-dom';
import '../css/Form.css'

function FormPage() {
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPrefillModal, setShowPrefillModal] = useState(false);
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [commissionFileName, setCommissionFileName] = useState('');
  const [flowFileName, setFlowFileName] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [commissionUrl, setCommissionUrl] = useState('');
  const [flowUrl, setFlowUrl] = useState('');
  const [orderTemplateUrl, setOrderTemplateUrl] = useState('');
  const [processTemplateUrl, setProcessTemplateUrl] = useState('');
  const [orderTemplateFileName, setOrderTemplateFileName] = useState('');
  const [processTemplateFileName, setProcessTemplateFileName] = useState('');
  const [salespersons, setSalespersons] = useState([]);
  const [salesName, setSalesName] = useState('');
  const [salesEmail, setSalesEmail] = useState('');
  const [salesPhone, setSalesPhone] = useState('');
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

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedPayer, setSelectedPayer] = useState(null);
  const [priceList, setPriceList] = useState([]);
  const [selectedTestIndex, setSelectedTestIndex] = useState(null);

  // 静态部门数据（与后端 departments 对应）
  const departments = [
    { department_id: 1, department_name: '显微组织表征实验室' },
    { department_id: 2, department_name: '物化性能测试实验室' },
    { department_id: 3, department_name: '力学性能测试实验室' },
    { department_id: 4, department_name: '委外' }
  ];
  const navigate = useNavigate();

  const arrivalMethodOptions = [
    { key: 'on_site', label: '现场到达 On-site' },
    { key: 'mail',   label: '寄样 By mail' },
  ];

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
    vatType: '',
    serviceType: '',
    sampleSolutionType: '',
    sampleReturnInfo: {
      returnAddressOption: '',
      returnAddress: ''
    },
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

  const moveTestItem = (from, to) => {
    if (from === to || from == null || to == null) return;
    setFormData(prev => {
      const next = [...prev.testItems];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, testItems: next };
    });
  };
  const onHandleDragStart = (e, index) => {
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
    test_method: p.test_standard,
    unit_price: p.unit_price,
    department_id: p.department_id,
  });

  const formatTestItemDisplay = (ti = {}) => {
    const name = ti.test_item || '';
    const price = ti.unit_price != null && String(ti.unit_price).trim() !== ''
      ? ` (单价${ti.unit_price}元)`
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

  const handlePrefill = async () => {
    if (!formData.orderNum) { alert('请先输入委托单号'); return; }
    try {
      const { data } = await getCommission(formData.orderNum);
      console.log(data)
      setSelectedCustomer(data.customer);
      setSelectedPayer(data.payer);
      if (data.testItems[0]?.assignment_accounts?.length > 0) {
        const acct = data.testItems[0].assignment_accounts.find(acct => acct.includes('YW'));
        if (acct) {
          setFormData(f => ({ ...f, salesPerson: acct }));
          const resp = await getSalespersonContact(acct);
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
        vatType: String(data.vatType || ''),
        serviceType: String(data.orderInfo?.service_type || ''),
        reportSeals: seals,
        deliveryDays: data.orderInfo?.delivery_days_after_receipt || '',
        otherRequirements: data.orderInfo?.other_requirements || '',
        sampleSolutionType: String(data.sampleHandling?.handling_type || ''),
        sampleReturnInfo: data.sampleHandling?.return_info || { returnAddressOption: '', returnAddress: '' },
        sampleRequirements: data.sampleRequirements || { hazards: [], hazardOther:'', magnetism:'', conductivity:'', breakable:'', brittle:'' },
        testItems: (data.testItems || []).map(it => ({
          ...it,
          // 统一键名到前端使用的 camelCase，避免不可编辑/覆盖问题
          sampleName: it.sample_name != null ? it.sample_name : (it.sampleName || ''),
          sampleType: it.sample_type != null ? it.sample_type : (it.sampleType || ''),
          // 其它已使用的键保持不变
          arrival_mode: it.arrival_mode || '',
          sample_arrival_status: it.sample_arrival_status || 'arrived'
        }))
      }));
      alert('预填成功！');
    } catch (err) { console.error('预填失败', err); alert('预填数据失败，请检查委托单号是否正确'); }
  };

  const handleDepartmentChange = (index, newDepartmentId) => {
    const updatedTestItems = formData.testItems.map((item, idx) => idx === index ? { ...item, department_id: newDepartmentId } : item);
    setFormData(prev => ({ ...prev, testItems: updatedTestItems }));
  };

  const addTestItem = () => {
    setFormData(prev => ({ ...prev, testItems: [...prev.testItems, {
      sampleName: '', material: '', sampleType: '', sampleTypeCustom: '', original_no: '',
      test_item: '', test_method: '', quantity: '', note: '', department_id: '', sample_preparation: ''
    }]}));
  };

  const handleTestItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      testItems: prev.testItems.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value, ...(field === 'test_item' ? { price_id: null } : {}) };
        if (field === 'sampleType') {
          if (String(value) === '5') updated.sampleTypeCustom = '';
          else delete updated.sampleTypeCustom;
        }
        return updated;
      })
    }));
  };

  const handlePriceSelect = (item) => {
    setFormData(prev => {
      const items = prev.testItems.slice();
      const idx = selectedTestIndex;
      const oldRow = items[idx] || {};
      const pf = createTestItemFromPrice(item);
      items[idx] = { ...oldRow, ...pf };
      return { ...prev, testItems: items };
    });
    setShowPriceModal(false);
  };

  const applyPriceToRow = (index, priceItem) => {
    setFormData(prev => {
      const items = prev.testItems.slice();
      const oldRow = items[index] || {};
      const pf = createTestItemFromPrice(priceItem);
      items[index] = { ...oldRow, ...pf };
      return { ...prev, testItems: items };
    });
  };

  const handleTestItemCodeEnter = (e, index) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const raw = (formData.testItems[index]?.test_item || '').trim();
    if (!raw) return;
    const matches = priceList.filter(p => (p.test_code || '').toUpperCase() === raw.toUpperCase());
    if (matches.length === 1) { applyPriceToRow(index, matches[0]); }
    else if (matches.length > 1) { setSelectedTestIndex(index); setSearchTestCode(raw); setShowPriceModal(true); }
    else { alert(`未找到项目代码：${raw}`); }
  };

  const handleOtherRequirementsChange = (e) => { setFormData(prev => ({ ...prev, otherRequirements: e.target.value })); };
  const handleSubcontractingChange = (e) => { setFormData(prev => ({ ...prev, subcontractingNotAccepted: e.target.checked })); };
  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleNestedChange = (parent, name, value) => { setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [name]: value } })); };

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
    const updatedReportType = checked ? [...formData.reportType, reportOptions[value]] : formData.reportType.filter(item => item !== reportOptions[value]);
    setFormData({ ...formData, reportType: updatedReportType, showPaperReport: updatedReportType.includes(4) || updatedReportType.includes(5) });
  };

  const handleReportSealsChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({ ...prev, reportSeals: checked ? [...prev.reportSeals, value] : prev.reportSeals.filter(v => v !== value) }));
  };
  const handleRadioChange = (event) => { setFormData({ ...formData, [event.target.name]: event.target.value }); };
  const handleReportHeaderChange = (e) => { setFormData(prev => ({ ...prev, reportHeader: e.target.value })); };
  const handleReportFormChange = (e) => { setFormData(prev => ({ ...prev, reportForm: e.target.value })); };
  const removeTestItem = (index) => { setFormData(prev => ({ ...prev, testItems: prev.testItems.filter((_, i) => i !== index) })); };

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
    setFormData(prev => { const items = [...prev.testItems]; const copy = { ...items[index] }; items.splice(index + 1, 0, copy); return { ...prev, testItems: items }; });
  };

  const downloadFile = (url, filename) => { const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm('请确认填写的信息是否正确，确认无误再提交')) return;
    if (!formData.salesPerson) { alert('提交失败！服务方联系人为必填项，请选择业务员'); return; }
    if (!selectedCustomer) { alert('提交失败！请先选择委托方'); return; }
    if (!selectedCustomer.commissioner_id) {
      alert('提交失败！未选择客户库中的委托方，请选择后重试。');
      return;
    }
    if (!formData.vatType) { alert('提交失败！发票类型为必填项，请选择增值税发票类型'); return; }
    if (!selectedPayer) { alert('提交失败！请先选择付款方'); return; }
    if (!formData.serviceType) { alert('提交失败！周期类型为必填项，请重新选择'); return; }
    if (formData.reportType.length === 0) { alert('提交失败！报告文档为必填项，请重新选择'); return; }
    if (formData.testItems.length === 0) { alert('提交失败！请至少添加一行检测项目'); return; }

    for (let i = 0; i < formData.testItems.length; i++) {
      const ti = formData.testItems[i];
      if (!ti.sampleName) { alert(`提交失败！第${i + 1}行：样品名称为必填项`); return; }
      if (!ti.material) { alert(`提交失败！第${i + 1}行：材质为必填项`); return; }
      if (!ti.sampleType) { alert(`提交失败！第${i + 1}行：样品状态为必填项`); return; }
      if (!ti.test_item) { alert(`提交失败！第${i + 1}行：检测项目为必填项`); return; }
      if (!ti.test_method) { alert(`提交失败！第${i + 1}行：检测标准为必填项`); return; }
      if (ti.sample_preparation === '') { alert(`提交失败！第${i + 1}行：制样为必填项`); return; }
      if (!ti.quantity) { alert(`提交失败！第${i + 1}行：数量为必填项`); return; }
      if (!ti.department_id) { alert(`提交失败！第${i + 1}行：部门为必填项`); return; }
    }

    const req = formData.sampleRequirements;
    if (!req.hazards.length) { alert('提交失败！样品危险特性为必填项，请至少选择一项'); return; }
    if (!req.magnetism) { alert('提交失败！样品磁性为必填项，请选择'); return; }
    if (!req.conductivity) { alert('提交失败！样品导电性为必填项，请选择'); return; }
    if (!req.breakable) { alert('提交失败！是否可破坏为必填项，请选择'); return; }
    if (!req.brittle) { alert('提交失败！是否孤品为必填项，请选择'); return; }

    if (!formData.sampleSolutionType) { alert('提交失败！余样处置为必填项，请重新选择'); return; }
    if (formData.sampleSolutionType === '3' && formData.sampleReturnInfo.returnAddressOption === 'other' && !formData.sampleShippingAddress) {
      alert('提交失败！退回地址为必填项'); return;
    }

    const commissionData = {
      customerId: selectedCustomer.customer_id,
      paymentId: selectedPayer.payment_id,
      commissionerId: selectedCustomer.commissioner_id,
      orderInfo: {
        service_type: formData.serviceType,
        sample_shipping_address: formData.sampleSolutionType === '3' && formData.sampleReturnInfo.returnAddressOption === 'other' ? formData.sampleShippingAddress : null,
        total_price: formData.totalPrice || null,
        order_num: formData.orderNum || null,
        other_requirements: formData.otherRequirements,
        subcontracting_not_accepted: formData.subcontractingNotAccepted,
        report_seals: formData.reportSeals,
        delivery_days_after_receipt: formData.deliveryDays !== '' ? Number(formData.deliveryDays) : null
      },
      vatType: formData.vatType,
      reportInfo: {
        type: formData.reportType,
        paper_report_shipping_type: formData.paperReportShippingType,
        report_additional_info: formData.reportAdditionalInfo || null,
        header_type: formData.reportHeader || null,
        header_other: formData.reportHeader === '2' ? formData.reportHeaderAdditionalInfo : null,
        format_type: formData.reportForm || null
      },
      sampleHandling: { handling_type: formData.sampleSolutionType, return_info: formData.sampleSolutionType === '3' ? formData.sampleReturnInfo : null },
      sampleRequirements: formData.sampleRequirements,
      testItems: formData.testItems.map(item => ({
        sample_name: item.sampleName, material: item.material || '',
        sample_type: item.sampleType === '5' ? item.sampleTypeCustom?.trim() : item.sampleType,
        original_no: item.original_no || '', test_item: item.test_item, test_method: item.test_method,
        sample_preparation: item.sample_preparation, quantity: item.quantity, department_id: item.department_id, note: item.note || '',
        price_id: item.price_id, test_code: item.test_code, test_condition: item.test_condition, price_note: item.price_note, group_id: item.group_id,
        arrival_mode: item.arrival_mode === 'mail' ? 'delivery' : item.arrival_mode,
        sample_arrival_status: item.sample_arrival_status || 'arrived'
      })),
      assignmentInfo: { account: formData.salesPerson }
    };

    try {
      const response = await createCommission(commissionData);
      alert(`表单提交成功！委托单号为: ${response.data.orderNum}`);
      const sampleTypeMap = { 1: '板材', 2: '棒材', 3: '粉末', 4: '液体', 5: '其他' };
      const templateData = {
        serviceType1Symbol: commissionData.orderInfo.service_type === '1' ? '☑' : '☐',
        serviceType2Symbol: commissionData.orderInfo.service_type === '2' ? '☑' : '☐',
        serviceType3Symbol: commissionData.orderInfo.service_type === '3' ? '☑' : '☐',
        reportSeals1Symbol: commissionData.orderInfo.report_seals.includes('normal') ? '☑' : '☐',
        reportSeals2Symbol: commissionData.orderInfo.report_seals.includes('cnas') ? '☑' : '☐',
        reportSeals3Symbol: commissionData.orderInfo.report_seals.includes('cma') ? '☑' : '☐',
        delivery_days_after_receipt: commissionData.orderInfo.delivery_days_after_receipt || '',
        sample_shipping_address: (commissionData.orderInfo.sample_shipping_address || ''),
        total_price: (commissionData.orderInfo.total_price || ''),
        order_num: response.data.orderNum,
        other_requirements: commissionData.orderInfo.other_requirements || '',
        subcontractingNotAcceptedSymbol: commissionData.orderInfo.subcontracting_not_accepted ? '☑' : '☐',
        invoiceType1Symbol: commissionData.vatType === '1' ? '☑' : '☐',
        invoiceType2Symbol: commissionData.vatType === '2' ? '☑' : '☐',
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

      const docRes = await generateDocument(templateData);
      const commissionBlob = new Blob([docRes.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const commissionObjUrl = URL.createObjectURL(commissionBlob);

      const hasDept = id => commissionData.testItems.some(i => String(i.department_id) === String(id));
      const now = new Date(); const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, '0'); const dd = String(now.getDate()).padStart(2, '0');
      const receiptDate = `${yyyy}-${mm}-${dd}`;

      const machiningItems = []; const mechanicsItems = []; const microItems = []; const physchemItems = [];
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
            default: break;
          }
        }
      });

      const flowData = {
        order_num: response.data.orderNum,
        machiningCenterSymbol: machiningItems.length > 0 ? '☑' : '☐',
        mechanicsSymbol: mechanicsItems.length > 0 ? '☑' : '☐',
        microSymbol: hasDept(1) ? '☑' : '☐',
        physchemSymbol: hasDept(2) ? '☑' : '☐',
        sampleReceivedDate: receiptDate,
        showMechanicsTable: hasDept(3),
        showMicroTable: hasDept(1),
        showPhyschemTable: hasDept(2),
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
        serviceType1Symbol: commissionData.orderInfo.service_type === '1' ? '☑' : '☐',
        serviceType2Symbol: commissionData.orderInfo.service_type === '2' ? '☑' : '☐',
        serviceType3Symbol: commissionData.orderInfo.service_type === '3' ? '☑' : '☐',
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
        machiningItems, mechanicsItems, microItems, physchemItems,
      };

      const orderNum = response.data.orderNum;
      const custName = selectedCustomer.customer_name;
      const contactName = selectedCustomer.contact_name;
      const cName = `${orderNum}-${custName}-${contactName}.docx`;
      const fName = `${orderNum}.docx`;
      setCommissionFileName(cName); setFlowFileName(fName);

      const flowRes = await generateSampleFlow(flowData);
      const flowBlob = new Blob([flowRes.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const flowObjUrl = window.URL.createObjectURL(flowBlob);
      
      // 生成模板文档
      const orderTemplateRes = await generateOrderTemplate(templateData);
      const orderTemplateBlob = new Blob([orderTemplateRes.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const orderTemplateObjUrl = window.URL.createObjectURL(orderTemplateBlob);
      
      const processTemplateRes = await generateProcessTemplate(flowData);
      const processTemplateBlob = new Blob([processTemplateRes.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const processTemplateObjUrl = window.URL.createObjectURL(processTemplateBlob);
      
      setCommissionUrl(commissionObjUrl); 
      setFlowUrl(flowObjUrl);
      setOrderTemplateUrl(orderTemplateObjUrl);
      setProcessTemplateUrl(processTemplateObjUrl);
      setOrderTemplateFileName(`委托单模板_${orderNum}.docx`);
      setProcessTemplateFileName(`流转单模板_${orderNum}.docx`);
      setShowDownloadModal(true);
    } catch (error) {
      const msg = error.response?.data?.message || '服务器出现错误，请重试';
      alert(msg); console.error('Creating commission Error:', error);
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
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

  return (
    <div>
      <img src="/JITRI-logo3.png" alt="logo"></img>
      <button type="button" onClick={() => navigate('/')} className='form-back'>返回首页</button>
      <h1>检测委托合同<br/>Testing Application Contract</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="orderNum">任务编号 Task number:
          <input type="text" id="orderNum" name="orderNum" value={formData.orderNum} onChange={handleInputChange} placeholder="请输入委托单号或留空自动生成" />
        </label>
        <button type="button" onClick={handlePrefill} style={{ height: 32 }}>预填</button>
        <h3>服务方信息 Receiver Information</h3>
        <p>Receiver Name：集萃新材料研发有限公司</p>
        <label>联系人 Contact：&nbsp;<span style={{ color: 'red' }}>*</span></label>
        <select name="salesPerson" value={formData.salesPerson} onChange={handleSalespersonChange}>
          <option value="">请选择业务员/空值</option>
          {salespersons.map(person => (<option key={person.account} value={person.account}>{person.name} ({person.account})</option>))}
        </select>
        {salesEmail && <p><strong>邮箱 E-mail：{salesEmail}</strong></p>}
        {salesPhone && <p><strong>联系电话 Tel：{salesPhone}</strong></p>}
        <p>地址 Address：江苏省苏州市相城区青龙港路286号1号楼</p>
        <p>加★内容为必填项The field marked with★must be filled.</p>

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

        <h3>付款方信息 Payer Information&nbsp;<span style={{ color: 'red' }}>*</span></h3>
        <div className="block">
          <fieldset>
            <legend>发票类型&nbsp;<span style={{ color: 'red' }}>*</span></legend>
            <label><input type="radio" name="vatType" value="1" onChange={handleRadioChange} checked={formData.vatType === '1'} /> 增值税普通发票</label>
            <label><input type="radio" name="vatType" value="2" onChange={handleRadioChange} checked={formData.vatType === '2'} /> 增值税专用发票</label>
          </fieldset>
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
        <fieldset><legend>检测要求 Period Type</legend><label>以【检测要求附录】中信息为准 Subject to the Testing Requirements Appendix</label></fieldset>

        <fieldset>
          <legend>周期类型 Period Type&nbsp;<span style={{ color: 'red' }}>*</span></legend>
          <label><input type="radio" name="serviceType" value="1" onChange={handleRadioChange} checked={formData.serviceType === '1'} /> 正常 Standard</label>
          <label><input type="radio" name="serviceType" value="2" onChange={handleRadioChange} checked={formData.serviceType === '2'} /> 加急 Urgent（加收50%检测费用）</label>
          <label><input type="radio" name="serviceType" value="3" onChange={handleRadioChange} checked={formData.serviceType === '3'} /> 特急（加收100%检测费用）</label>
          <label style={{ display: 'block', marginTop: 8 }}>交付时间 Delivery time：收样后
            <input type="number" name="deliveryDays" min="0" value={formData.deliveryDays} onChange={handleInputChange} style={{ width: '4em', margin: '0 4px' }} /> 个工作日
          </label>
          <label>注：周六、周日及节假日不计入工作日Saturday, Sunday and festival days are not workdays</label>
        </fieldset>

        {/* 样品到达信息移动到每个检测项目行内 */}

        <h3>报告要求 Report Requirements</h3>
        <fieldset>
          <legend>报告文档 Report Content&nbsp;<span style={{ color: 'red' }}>*</span></legend>
          {Object.keys(reportOptions).map((option) => (
            <label key={option}>
              <input type="checkbox" value={option} onChange={(e) => handleReportTypeChange(option, e.target.checked)} checked={formData.reportType.includes(reportOptions[option])} /> {option}
            </label>
          ))}
        </fieldset>

        {!(formData.reportType.length === 1 && formData.reportType.includes(1)) && (<>
          <fieldset>
            <legend>报告标识章 Report Seals</legend>
            <label style={{ marginRight: 12 }}><input type="checkbox" value="normal" checked={formData.reportSeals.includes('normal')} onChange={handleReportSealsChange} />普通报告</label>
            <label style={{ marginRight: 12 }}><input type="checkbox" value="cnas" checked={formData.reportSeals.includes('cnas')} onChange={handleReportSealsChange} />CNAS</label>
            <label><input type="checkbox" value="cma" checked={formData.reportSeals.includes('cma')} onChange={handleReportSealsChange} />CMA</label>
          </fieldset>

          <fieldset>
            <legend>纸质版报告寄送地址 Paper delivery address</legend>
            <label><input type="radio" name="paperReportShippingType" value="1" onChange={handleRadioChange} checked={formData.paperReportShippingType === '1'} /> 邮寄到委托方</label>
            <label><input type="radio" name="paperReportShippingType" value="2" onChange={handleRadioChange} checked={formData.paperReportShippingType === '2'} /> 邮寄到付款方</label>
            <label><input type="radio" name="paperReportShippingType" value="3" onChange={handleRadioChange} checked={formData.paperReportShippingType === '3'} /> 其他</label>
            {formData.paperReportShippingType === '3' && (
              <label>请输入地址、收件人和电话:
                <input type="text" name="reportAdditionalInfo" value={formData.reportAdditionalInfo} onChange={handleInputChange} />
              </label>
            )}
          </fieldset>

          <fieldset>
            <legend>报告抬头 Report Header&nbsp;<span style={{ color: 'red' }}>*</span></legend>
            {Object.keys(reportHeaderOptions).map(option => (
              <label key={option}><input type="radio" name="reportHeader" value={reportHeaderOptions[option]} onChange={handleReportHeaderChange} checked={formData.reportHeader === String(reportHeaderOptions[option])} /> {option}</label>
            ))}
            {formData.reportHeader === '2' && (
              <label style={{ display: 'block', marginTop: 8 }}>其他(地址/收件人/电话)Others
                <input type="text" name="reportHeaderAdditionalInfo" value={formData.reportHeaderAdditionalInfo} onChange={handleInputChange} style={{ width: '60%', marginLeft: 4 }} placeholder="请输入补充信息" />
              </label>
            )}
          </fieldset>

          <fieldset>
            <legend>报告版式 Report Format&nbsp;<span style={{ color: 'red' }}>*</span></legend>
            {Object.keys(reportFormOptions).map(option => (
              <label key={option}><input type="radio" name="reportForm" value={reportFormOptions[option]} onChange={handleReportFormChange} checked={formData.reportForm === String(reportFormOptions[option])} /> {option}</label>
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

        <h3>检测项目</h3>
        <div className="test-item-table-wrapper">
          <table className="test-item-table">
            <thead>
              <tr>
                <th className="num">序号</th>
                <th>样品名称<span style={{ color: 'red' }}>*</span><br/>Sample Name</th>
                <th>材质<span style={{ color: 'red' }}>*</span><br/>Material</th>
                <th>样品状态<span style={{ color: 'red' }}>*</span><br/>Sample Status</th>
                <th>样品原号<br/>Sample No.</th>
                <th>价格备注<br/>Price Note</th>
                <th>检测项目<span style={{ color: 'red' }}>*</span><br/>Test Items</th>
                <th>检测标准<span style={{ color: 'red' }}>*</span><br/>Methods</th>
                <th>到达方式<br/>Arrival</th>
                <th>是否到达<br/>Arrived</th>
                <th>制样<span style={{ color: 'red' }}>*</span><br/>Sample preparation</th>
                <th>数量<span style={{ color: 'red' }}>*</span><br/>Qty</th>
                <th>时长(/天)</th>
                <th>所属部门<span style={{ color: 'red' }}>*</span></th>
                <th>备注<br/>Remarks</th>
                <th className="action-col">操作</th>
              </tr>
            </thead>
            <tbody>
              {formData.testItems.map((item, index) => (
                <tr key={index} onDragOver={(e) => onRowDragOver(e, index)} onDrop={(e) => onRowDrop(e, index)} onDragLeave={onRowDragLeave} className={dragOverIndex === index ? 'row-drag-over' : ''}>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    <span className="drag-handle" title="按住拖动以调整顺序" draggable onDragStart={(e) => onHandleDragStart(e, index)} style={{ display:'inline-block', cursor:'grab', marginRight: 6, userSelect:'none' }}>⠿</span>
                    {index + 1}
                  </td>
                  <td><input type="text" value={item.sampleName || ''} onChange={e => handleTestItemChange(index, 'sampleName', e.target.value)} /></td>
                  <td><input type="text" value={item.material} onChange={e => handleTestItemChange(index, 'material', e.target.value)} /></td>
                  <td>
                    {String(item.sampleType) === '5' ? (
                      <input type="text" placeholder="请输入" value={item.sampleTypeCustom || ''} onChange={e => handleTestItemChange(index, 'sampleTypeCustom', e.target.value)} />
                    ) : (
                      <select value={item.sampleType} onChange={e => handleTestItemChange(index, 'sampleType', e.target.value)}>
                        <option value="" disabled>请选择</option>
                        {Object.entries(typeMappings.sampleType).map(([label, val]) => (<option key={val} value={val}>{label}</option>))}
                      </select>
                    )}
                  </td>
                  <td><input type="text" value={item.original_no} onChange={(e) => handleTestItemChange(index, 'original_no', e.target.value)} /></td>
                  <td><input type="text" value={item.price_note || ''} onChange={e => handleTestItemChange(index, 'price_note', e.target.value)} placeholder="可选" /></td>
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
                          onChange={() => handleTestItemChange(index, 'arrival_mode', opt.key)}
                        /> {opt.label}
                      </label>
                    ))}
                  </td>
                  <td>
                    <label style={{ marginRight: 8 }}>
                      <input
                        type="radio"
                        name={`sample_arrived_${index}`}
                        checked={(item.sample_arrival_status || 'arrived') === 'arrived'}
                        onChange={() => handleTestItemChange(index, 'sample_arrival_status', 'arrived')}
                      /> 是 Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`sample_arrived_${index}`}
                        checked={(item.sample_arrival_status || 'arrived') === 'not_arrived'}
                        onChange={() => handleTestItemChange(index, 'sample_arrival_status', 'not_arrived')}
                      /> 否 No
                    </label>
                  </td>
                  <td>
                    <select value={item.sample_preparation} onChange={e => handleTestItemChange(index, 'sample_preparation', e.target.value === '' ? '' : Number(e.target.value))}>
                      <option value="" disabled>--请选择--</option>
                      <option value="1">是 Yes</option>
                      <option value="0">否 No</option>
                    </select>
                  </td>
                  <td><input type="number" min="0" value={item.quantity} onChange={(e) => handleTestItemChange(index, 'quantity', e.target.value)} /></td>
                  <td><input type="number" min="0" style={{ width: 50 + 'px' }} value={item.deadline} onChange={(e) => handleTestItemChange(index, 'deadline', e.target.value)} /></td>
                  {item.price_id
                    ? <td className='selected-price'><span>{departments.find(dept => dept.department_id === item.department_id)?.department_name || '未知部门'}</span></td>
                    : <td><select value={item.department_id || ""} onChange={e => handleDepartmentChange(index, e.target.value)}>
                        <option value="" disabled>---请选择---</option>
                        {departments.map(dept => (<option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>))}
                      </select></td>}
                  <td><input type="text" value={item.note} onChange={(e) => handleTestItemChange(index, 'note', e.target.value)} /></td>
                  <td className="action-col add-remove-buttons">
                    <button type="button" className="copy-button" style={{ marginRight: 4 }} onClick={() => duplicateTestItem(index)}>复制</button>
                    <button type="button" className="add-button" onClick={() => { setSelectedTestIndex(index); setShowPriceModal(true); }}>选择项目</button>
                    <button type="button" className="remove-button" onClick={() => removeTestItem(index)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="add-test-item-button"><button type="button" onClick={addTestItem}>添加新项目</button></div>
        <div className="block">
          <label>其他要求 Other Requirements:
            <input type="text" name="otherRequirements" value={formData.otherRequirements} onChange={handleOtherRequirementsChange} placeholder="填写其他特殊要求" />
          </label>
          <p>
            注Notes：<br></br>
            1.默认不出具评判结论；The judgment conclusion is not issued by default.<br></br>
            2.若客户未指明测试标准及年代号，则默认为客户接受我方集萃新材料研发有限公司(以下简称JITRIAMRI)推荐的测试方法及最新标准；If the customer does not specify the test standards and the year, it will be deemed by default that the customer accepts the test methods and the latest standards recommended by JITRIAMRI.
            <br></br>
            3.
            <input
              type="checkbox"
              name="subcontractingNotAccepted"
              checked={formData.subcontractingNotAccepted}
              onChange={handleSubcontractingChange}
            />不接受分包 Subcontracting is not accepted；如未选择，视为接受分包；If not selected, it will be regarded as acceptance of subcontracting.
            <br></br>
            4.若需要CMA、CNAS章或其他测试要求，请在其他要求中写明(可另附页)。If CMA, CNAS stamps or other testing requirements are needed, please specify them in the other requirements.
          </p>
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
                <input type="radio" name="magnetism" checked={formData.sampleRequirements.magnetism === opt.key} onChange={() => handleNestedChange('sampleRequirements', 'magnetism', opt.key)} /> {opt.label}
              </label>
            ))}
          </div>
          <hr />
          <div className="sample-section">
            <p>样品导电性 Sample conductivity:&nbsp;<span style={{ color: 'red' }}>*</span></p>
            {conductivityOptions.map(opt => (
              <label key={opt.key} style={{ marginRight: 12 }}>
                <input type="radio" name="conductivity" checked={formData.sampleRequirements.conductivity === opt.key} onChange={() => handleNestedChange('sampleRequirements', 'conductivity', opt.key)} /> {opt.label}
              </label>
            ))}
          </div>
          <hr />
          <div className="sample-section">
            <p>2. 是否可以破坏 Can it be broken:&nbsp;<span style={{ color: 'red' }}>*</span></p>
            <label style={{ marginRight: 12 }}><input type="radio" name="breakable" checked={formData.sampleRequirements.breakable === 'yes'} onChange={() => handleNestedChange('sampleRequirements', 'breakable', 'yes')} /> 是 Yes</label>
            <label><input type="radio" name="breakable" checked={formData.sampleRequirements.breakable === 'no'} onChange={() => handleNestedChange('sampleRequirements', 'breakable', 'no')} /> 否 No</label>
          </div>
          <hr />
          <div className="sample-section">
            <p>3. 是否孤品 (As shown) :&nbsp;<span style={{ color: 'red' }}>*</span></p>
            <label style={{ marginRight: 12 }}><input type="radio" name="brittle" checked={formData.sampleRequirements.brittle === 'yes'} onChange={() => handleNestedChange('sampleRequirements', 'brittle', 'yes')} /> 是 Yes</label>
            <label><input type="radio" name="brittle" checked={formData.sampleRequirements.brittle === 'no'} onChange={() => handleNestedChange('sampleRequirements', 'brittle', 'no')} /> 否 No</label>
          </div>
        </fieldset>

        <fieldset>
          <legend>余样处置 Sample Handling&nbsp;<span style={{ color: 'red' }}>*</span></legend>
          <label><input type="radio" name="sampleSolutionType" value="1" onChange={handleRadioChange} checked={formData.sampleSolutionType === '1'} />由服务方处理（样品留存90天，逾期销毁）</label>
          <label><input type="radio" name="sampleSolutionType" value="2" onChange={handleRadioChange} checked={formData.sampleSolutionType === '2'} />委托方自取</label>
          <label><input type="radio" name="sampleSolutionType" value="3" onChange={handleRadioChange} checked={formData.sampleSolutionType === '3'} />服务方协助寄回 (到付)</label>
          {formData.sampleSolutionType === '3' && (
            <div className="nested-return-address" style={{ paddingLeft: 20 }}>
              <label><input type="radio" name="returnAddressOption" value="same" onChange={e => handleNestedChange('sampleReturnInfo', 'returnAddressOption', e.target.value)} checked={formData.sampleReturnInfo.returnAddressOption === 'same'} />同委托方信息</label>
              <label><input type="radio" name="returnAddressOption" value="other" onChange={e => handleNestedChange('sampleReturnInfo', 'returnAddressOption', e.target.value)} checked={formData.sampleReturnInfo.returnAddressOption === 'other'} />其他 Others (Address/Recipient/Tel):</label>
              {formData.sampleReturnInfo.returnAddressOption === 'other' && (
                <input type="text" name="sampleShippingAddress" placeholder="填写退回地址/收件人/电话" value={formData.sampleShippingAddress} onChange={handleInputChange} style={{ display: 'block', marginTop: 4 }} />
              )}
            </div>
          )}
          <label><input type="radio" name="sampleSolutionType" value="4" onChange={handleRadioChange} checked={formData.sampleSolutionType === '4'} />无剩余样品</label>
        </fieldset>

        <button type="submit" className="submit">提交表单并生成Word</button>

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
                  <thead><tr><th className='title-id'>ID</th><th>测试代码</th><th>检测项目</th><th>检测条件</th><th>检测标准</th><th>单价</th><th>操作</th></tr></thead>
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
                          <td>{item.unit_price} 元</td>
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
                      <tr key={payer.payment_id}>
                        <td className='title-id'>{payer.payment_id}</td>
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

      </form>

      {showDownloadModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>文件已生成</h2>
            <p>请分别点击下面按钮下载：</p>
            <div className='decide-button'>
              <button onClick={() => downloadFile(orderTemplateUrl, orderTemplateFileName)}>下载委托单模板</button>
              <button onClick={() => downloadFile(processTemplateUrl, processTemplateFileName)}>下载流转单模板</button>
              <button onClick={() => { 
                URL.revokeObjectURL(commissionUrl); 
                URL.revokeObjectURL(flowUrl); 
                URL.revokeObjectURL(orderTemplateUrl); 
                URL.revokeObjectURL(processTemplateUrl); 
                setShowDownloadModal(false); 
                window.location.href = '/'; 
              }}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormPage;
