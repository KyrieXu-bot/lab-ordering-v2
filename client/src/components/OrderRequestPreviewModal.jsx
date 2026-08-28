import React, { useEffect, useMemo, useState } from 'react'
import { getCommissionerSignature, getOrderRequest, getSalespersonSignature } from '../api/api'
import '../css/OrderRequestPreview.css'

const mark = (value) => value ? '☑' : '☐'
const asArray = (value) => Array.isArray(value) ? value : []
const text = (value) => value === null || value === undefined ? '' : String(value)
const oneOf = (value, expected) => String(value ?? '') === String(expected)

function signatureToUrl(response) {
  return URL.createObjectURL(response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'image/png' }))
}

export default function OrderRequestPreviewModal({ open, onClose, requestId, packet: livePacket, requestMeta, commissionerSignatureUrl: liveCommissionerSignature, salesSignatureUrl: liveSalesSignature }) {
  const [packet, setPacket] = useState(livePacket || null)
  const [comparisonPacket, setComparisonPacket] = useState(null)
  const [meta, setMeta] = useState(requestMeta || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [commissionerSignatureUrl, setCommissionerSignatureUrl] = useState(liveCommissionerSignature || '')
  const [salesSignatureUrl, setSalesSignatureUrl] = useState(liveSalesSignature || '')

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setError('')
    setPacket(livePacket || null)
    setComparisonPacket(null)
    setMeta(requestMeta || null)
    if (!requestId) return
    let active = true
    setLoading(true)
    getOrderRequest(requestId)
      .then(async ({ data }) => {
        if (!active) return
        setMeta(data)
        setPacket(data.reviewed_payload || data.submitted_payload || {})
        if (['modification', 'additional_test'].includes(data.request_type) && data.parent_request_id) {
          try {
            const { data: parent } = await getOrderRequest(data.parent_request_id)
            if (active) setComparisonPacket(parent.reviewed_payload || parent.submitted_payload || null)
          } catch (_) {
            if (active) setComparisonPacket(null)
          }
        }
      })
      .catch((requestError) => active && setError(requestError.response?.data?.message || '预览加载失败'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [open, requestId, livePacket, requestMeta])

  const view = useMemo(() => normalizePacket(packet, meta), [packet, meta])
  const previousView = useMemo(() => comparisonPacket ? normalizePacket(comparisonPacket, {}) : null, [comparisonPacket])
  const compareChanges = meta?.request_type === 'modification' && Boolean(previousView)
  const highlightAddedItems = meta?.request_type === 'additional_test'
  const previewItems = useMemo(() => {
    if (!highlightAddedItems || !previousView) return view.items.map(item => ({ ...item, previewAdded: false }))
    return [
      ...previousView.items.map(item => ({ ...item, previewAdded: false })),
      ...view.items.map(item => ({ ...item, previewAdded: true }))
    ]
  }, [highlightAddedItems, previousView, view.items])

  useEffect(() => {
    if (!open) return undefined
    let active = true
    const objectUrls = []
    setCommissionerSignatureUrl(liveCommissionerSignature || '')
    setSalesSignatureUrl(liveSalesSignature || '')
    if (!liveCommissionerSignature && view.customerId) {
      getCommissionerSignature(view.customerId).then((response) => {
        if (!active) return
        const url = signatureToUrl(response); objectUrls.push(url); setCommissionerSignatureUrl(url)
      }).catch(() => {})
    }
    if (!liveSalesSignature && view.salesUserId) {
      getSalespersonSignature(view.salesUserId).then((response) => {
        if (!active) return
        const url = signatureToUrl(response); objectUrls.push(url); setSalesSignatureUrl(url)
      }).catch(() => {})
    }
    return () => { active = false; objectUrls.forEach((url) => URL.revokeObjectURL(url)) }
  }, [open, view.customerId, view.salesUserId, liveCommissionerSignature, liveSalesSignature])

  if (!open) return null
  return (
    <div className="order-preview-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="order-preview-modal" role="dialog" aria-modal="true" aria-label="委托单预览">
        <header className="order-preview-toolbar">
          <div><strong>委托单预览</strong>{view.requestNo && <span>{view.requestNo}</span>}</div>
          <button type="button" onClick={onClose} aria-label="关闭预览" title="关闭"><span aria-hidden="true">×</span></button>
        </header>
        <div className="order-preview-scroll">
          {loading ? <div className="order-preview-state">正在生成预览…</div> : error ? <div className="order-preview-state is-error">{error}</div> : (
            <article className="order-preview-paper">
              <div className="snapshot-document-header">
                <div className="snapshot-company-brand">
                  <img src="/JITRI-logo3.png" alt="集萃新材料研发有限公司" />
                  <div><strong>集萃新材料研发有限公司</strong><small>JITRI Advanced Materials R&amp;D Co.,Ltd.</small></div>
                </div>
                <h1>检测委托单 <small>Testing Application Form</small></h1>
                <div className="snapshot-task-number"><span>任务编号</span><small>Task number：</small><strong>{view.orderNum}</strong></div>
              </div>
              <table className="snapshot-table provider-table"><tbody>
                <tr><th rowSpan="2">服务方名称<br/><small>Receiver Name</small></th><td rowSpan="2">集萃新材料研发有限公司</td><th>联系人 <small>Contact</small></th><td><ChangedText value={view.salesName} previous={previousView?.salesName} compare={compareChanges}/></td></tr>
                <tr><th>邮 箱 <small>E-mail</small></th><td><ChangedText value={view.salesEmail} previous={previousView?.salesEmail} compare={compareChanges}/></td></tr>
                <tr><th>地址 <small>Address</small></th><td>江苏省苏州市相城区青龙港路286号1号楼</td><th>联系电话 <small>Tel</small></th><td><ChangedText value={view.salesPhone} previous={previousView?.salesPhone} compare={compareChanges}/></td></tr>
              </tbody></table>
              <p className="snapshot-required">加★内容为必填项 The field marked with ★ must be filled.</p>
              <Section title="委托方信息" english="Applicant Information">
                <table className="snapshot-table"><tbody>
                  <tr><th>★委托方名称 <small>Customer Name</small></th><td><ChangedText value={view.customerName} previous={previousView?.customerName} compare={compareChanges}/></td><th>★联系人 <small>Contact</small></th><td><ChangedText value={view.customerContact} previous={previousView?.customerContact} compare={compareChanges}/></td></tr>
                  <tr><th>★地址 <small>Address</small></th><td><ChangedText value={view.customerAddress} previous={previousView?.customerAddress} compare={compareChanges}/></td><th>★报告接收邮箱 <small>E-mail</small></th><td><ChangedText value={view.customerEmail} previous={previousView?.customerEmail} compare={compareChanges}/></td></tr>
                  <tr><th></th><td></td><th>★联系电话 <small>Tel</small></th><td><ChangedText value={view.customerPhone} previous={previousView?.customerPhone} compare={compareChanges}/></td></tr>
                </tbody></table>
                <p className="snapshot-note">注：以上信息将显示在报告中，请仔细填写；报告签发后修改将收取费用。 The above information will appear in the report. Please complete it carefully.</p>
              </Section>
              <Section title="付款方信息" english="Payer Information">
                <table className="snapshot-table"><tbody>
                  <tr><th>名称 <small>Name</small></th><td><ChangedText value={view.payerName} previous={previousView?.payerName} compare={compareChanges}/></td><th>地址 <small>Address</small></th><td><ChangedText value={view.payerAddress} previous={previousView?.payerAddress} compare={compareChanges}/></td></tr>
                  <tr><th>电话 <small>Tel</small></th><td><ChangedText value={view.payerPhone} previous={previousView?.payerPhone} compare={compareChanges}/></td><th>开户银行 <small>Deposit Bank</small></th><td><ChangedText value={view.payerBank} previous={previousView?.payerBank} compare={compareChanges}/></td></tr>
                  <tr><th>税号 <small>Tax No.</small></th><td><ChangedText value={view.payerTaxNo} previous={previousView?.payerTaxNo} compare={compareChanges}/></td><th>银行账号 <small>Bank Account</small></th><td><ChangedText value={view.payerBankAccount} previous={previousView?.payerBankAccount} compare={compareChanges}/></td></tr>
                  <tr><th>付款联系人 <small>Payer</small></th><td><ChangedText value={view.payerContact} previous={previousView?.payerContact} compare={compareChanges}/></td><th>邮箱 <small>Email</small></th><td><ChangedText value={view.payerEmail} previous={previousView?.payerEmail} compare={compareChanges}/></td></tr>
                </tbody></table>
              </Section>
              <Section title="检测信息" english="Test Information">
                <table className="snapshot-table"><tbody>
                  <tr><th>★检测要求<br/><small>Test Request</small></th><td>以《检测要求附录》中信息为准 Subject to the Testing Requirements Appendix</td></tr>
                  <tr><th>★周期类型<br/><small>Period Type</small></th><td className="snapshot-options">
                    <Choice checked={view.urgency === 'normal'} previousChecked={previousView?.urgency === 'normal'} compare={compareChanges}>正常 Standard</Choice>　
                    <Choice checked={view.urgency === 'urgent_1_5x'} previousChecked={previousView?.urgency === 'urgent_1_5x'} compare={compareChanges}>加急 Urgent（加收50%检测费用）</Choice>　
                    <Choice checked={view.urgency === 'urgent_2x'} previousChecked={previousView?.urgency === 'urgent_2x'} compare={compareChanges}>特急 Special Urgent（加收100%检测费用）</Choice><br/>
                    交付时间 Delivery time：收样后 <u><ChangedText value={view.deliveryDays || '　'} previous={previousView?.deliveryDays || '　'} compare={compareChanges}/></u> 个工作日 / working days after sample receipt
                  </td></tr>
                </tbody></table>
              </Section>
              <Section title="报告要求" english="Report Requirements">
                <table className="snapshot-table"><tbody>
                  <tr><th>★报告文档<br/><small>Report Content</small></th><td className="snapshot-options">
                    报告版式：<Choice checked={view.reportTypes.includes(1)} previousChecked={previousView?.reportTypes.includes(1)} compare={compareChanges}>测试图片或数据汇总（无需测试报告） Test pictures or data summaries (No test report)</Choice><br/>
                    <Choice checked={view.reportTypes.includes(2)} previousChecked={previousView?.reportTypes.includes(2)} compare={compareChanges}>中文报告 Chinese report</Choice>　<Choice checked={view.reportTypes.includes(3)} previousChecked={previousView?.reportTypes.includes(3)} compare={compareChanges}>英文报告 English report</Choice>　<Choice checked={view.reportTypes.includes(6)} previousChecked={previousView?.reportTypes.includes(6)} compare={compareChanges}>中英文对照报告 Chinese-English bilingual report</Choice><br/>
                    报告标识章：<Choice checked={view.seals.includes('normal')} previousChecked={previousView?.seals.includes('normal')} compare={compareChanges}>普通报告 Normal report</Choice>　<Choice checked={view.seals.includes('cnas')} previousChecked={previousView?.seals.includes('cnas')} compare={compareChanges}>CNAS</Choice>　<Choice checked={view.seals.includes('cma')} previousChecked={previousView?.seals.includes('cma')} compare={compareChanges}>CMA</Choice>
                    <span className="snapshot-report-rule" />
                    交付形式：<Choice checked={view.reportTypes.includes(4)} previousChecked={previousView?.reportTypes.includes(4)} compare={compareChanges}>仅电子版报告 E-report only</Choice>　<Choice checked={view.reportTypes.includes(5)} previousChecked={previousView?.reportTypes.includes(5)} compare={compareChanges}>电子版+纸质版报告 Electronic + Printed report</Choice><br/>
                    纸质版报告寄送地址：<Choice checked={oneOf(view.paperShipping, 1)} previousChecked={oneOf(previousView?.paperShipping, 1)} compare={compareChanges}>邮寄到委托方</Choice>　<Choice checked={oneOf(view.paperShipping, 2)} previousChecked={oneOf(previousView?.paperShipping, 2)} compare={compareChanges}>邮寄到付款方</Choice>　<Choice checked={oneOf(view.paperShipping, 3)} previousChecked={oneOf(previousView?.paperShipping, 3)} compare={compareChanges}>其他</Choice> <InlineBlank value={view.reportAdditionalInfo} previous={previousView?.reportAdditionalInfo} compare={compareChanges} />
                  </td></tr>
                  <tr><th>★报告抬头<br/><small>Report Information</small></th><td><Choice checked={oneOf(view.reportHeader, 1)} previousChecked={oneOf(previousView?.reportHeader, 1)} compare={compareChanges}>同委托方名称和地址 Same as applicant</Choice>　<Choice checked={oneOf(view.reportHeader, 2)} previousChecked={oneOf(previousView?.reportHeader, 2)} compare={compareChanges}>其他</Choice> <InlineBlank value={view.reportHeaderOther} previous={previousView?.reportHeaderOther} compare={compareChanges} /></td></tr>
                  <tr><th>★报告版式<br/><small>Report Form</small></th><td><Choice checked={oneOf(view.reportForm, 1)} previousChecked={oneOf(previousView?.reportForm, 1)} compare={compareChanges}>一份委托单对应一个报告</Choice>　<Choice checked={oneOf(view.reportForm, 2)} previousChecked={oneOf(previousView?.reportForm, 2)} compare={compareChanges}>每一个项目对应一份报告</Choice></td></tr>
                </tbody></table>
              </Section>
              <div className="snapshot-important"><strong>重要说明 Important Notes：</strong><p>委托方应保证所提交样品及信息真实、完整；检测结果仅对所送样品负责。报告签发后如需修改，按相关规定执行。</p></div>
              <Section title="检测要求附录" english="Testing Requirements Appendix">
                <div className="snapshot-table-overflow"><table className="snapshot-table appendix-table"><thead><tr>
                  <th>序号<br/><small>No.</small></th><th>★样品名称<br/><small>Sample Name</small></th><th>★材质<br/><small>Material</small></th><th>★样品型态<br/><small>Sample State</small></th><th>样品原号<br/><small>Sample No.</small></th><th>★检测项目<br/><small>Test Items</small></th><th>★检测标准<br/><small>Methods</small></th><th>★数量<br/><small>Qty</small></th><th>备注<br/><small>Remarks</small></th>
                </tr></thead><tbody>{previewItems.length ? previewItems.map((item, index) => <tr className={item.previewAdded ? 'snapshot-added-item' : ''} key={index}><td>{index + 1}</td><td>{item.sampleName}</td><td>{item.material}</td><td>{item.sampleType}</td><td>{item.originalNo}</td><td>{item.testItem}</td><td>{item.method}</td><td>{item.quantity}</td><td>{item.note}</td></tr>) : <tr><td>1</td><td/><td/><td/><td/><td/><td/><td/><td/></tr>}</tbody></table></div>
                <table className="snapshot-table"><tbody><tr><th>其他要求 <small>Other Requirements</small>：</th><td><ChangedText value={view.otherRequirements} previous={previousView?.otherRequirements} compare={compareChanges}/></td></tr></tbody></table>
                <div className="snapshot-notes"><strong>注 Notes：</strong><ol><li>默认不出具评判结论。</li><li>未指明测试标准及年代号时，默认接受服务方推荐的方法及最新标准。</li><li><Choice checked={view.subcontractingNotAccepted} previousChecked={previousView?.subcontractingNotAccepted} compare={compareChanges}>不接受分包 Subcontracting is not accepted</Choice>；未勾选视为接受分包。</li><li>其他测试要求请在“其他要求”中写明。</li></ol></div>
              </Section>
              <Section title="样品要求" english="Sample Requirements">
                <table className="snapshot-table sample-requirements-table"><tbody><tr>
                  <th>★样品信息<br/><small>Sample Information</small></th><td>
                    储运特性 Storage & Transport Properties：<br/>{hazardOptions.map(([key, label]) => <React.Fragment key={key}><Choice checked={view.hazards.includes(key)} previousChecked={previousView?.hazards.includes(key)} compare={compareChanges}>{label}</Choice>　</React.Fragment>)}<ChangedText value={view.hazardOther} previous={previousView?.hazardOther} compare={compareChanges}/><br/>
                    样品磁性 Sample magnetism：<OptionChoices value={view.magnetism} previous={previousView?.magnetism} options={magnetismOptions} compare={compareChanges}/><br/>
                    其他 Others：<br/>1. 样品导电性：<OptionChoices value={view.conductivity} previous={previousView?.conductivity} options={conductivityOptions} compare={compareChanges}/><br/>2. 是否可以破坏：<Choice checked={view.breakable === 'yes'} previousChecked={previousView?.breakable === 'yes'} compare={compareChanges}>是 Yes</Choice>，<Choice checked={view.breakable === 'no'} previousChecked={previousView?.breakable === 'no'} compare={compareChanges}>否 No</Choice>；<br/>3. 是否易碎：<Choice checked={view.brittle === 'yes'} previousChecked={previousView?.brittle === 'yes'} compare={compareChanges}>是 Yes</Choice>，<Choice checked={view.brittle === 'no'} previousChecked={previousView?.brittle === 'no'} compare={compareChanges}>否 No</Choice>。
                  </td><th>★余样处置<br/><small>Sample Handling</small></th><td>
                    <Choice checked={oneOf(view.handlingType, 1)} previousChecked={oneOf(previousView?.handlingType, 1)} compare={compareChanges}>由服务方处理（样品留存90天，逾期销毁）</Choice><br/><Choice checked={oneOf(view.handlingType, 2)} previousChecked={oneOf(previousView?.handlingType, 2)} compare={compareChanges}>委托方自取</Choice><br/><Choice checked={oneOf(view.handlingType, 3)} previousChecked={oneOf(previousView?.handlingType, 3)} compare={compareChanges}>服务方协助寄回（到付）</Choice><br/><Choice checked={view.returnAddressOption === 'same'} previousChecked={previousView?.returnAddressOption === 'same'} compare={compareChanges}>同委托方信息</Choice>　<Choice checked={view.returnAddressOption === 'other'} previousChecked={previousView?.returnAddressOption === 'other'} compare={compareChanges}>其他</Choice> <ChangedText value={view.returnAddress} previous={previousView?.returnAddress} compare={compareChanges}/><br/><Choice checked={oneOf(view.handlingType, 4)} previousChecked={oneOf(previousView?.handlingType, 4)} compare={compareChanges}>无剩余样品</Choice>
                  </td>
                </tr></tbody></table>
              </Section>
              <div className="snapshot-signatures"><Signature label="★委托方签名确认/日期" english="Authorized Signature/Date" image={commissionerSignatureUrl} date={view.customerSignatureDate}/><Signature label="★评审人确认/日期" english="Representative/Date" image={salesSignatureUrl} date={view.salesSignatureDate}/></div>
            </article>
          )}
        </div>
      </section>
    </div>
  )
}

function Section({ title, english, children }) { return <section className="snapshot-section"><h2>{title} <small>{english}</small></h2>{children}</section> }
function ChangedText({ value, previous, compare }) {
  const changed = compare && text(value) !== text(previous)
  const displayValue = value === null || value === undefined || value === '' ? (changed ? '—' : '') : value
  return <span className={changed ? 'snapshot-changed-value' : ''}>{displayValue}</span>
}
function InlineBlank({ value, previous, compare }) { return <span className="snapshot-inline-blank"><ChangedText value={value || ''} previous={previous || ''} compare={compare}/></span> }
function Choice({ checked, previousChecked, compare, children }) {
  const changed = compare && Boolean(checked) !== Boolean(previousChecked)
  const className = changed ? `snapshot-choice ${checked ? 'is-selected-change' : 'is-previous-choice'}` : 'snapshot-choice'
  const displayChecked = checked || (changed && previousChecked)
  return <span className={className}>{mark(displayChecked)} {children}</span>
}
function OptionChoices({ value, previous, options, compare }) {
  return options.map(([key, label], index) => <React.Fragment key={key}><Choice checked={value === key} previousChecked={previous === key} compare={compare}>{label}</Choice>{index < options.length - 1 ? '　' : ''}</React.Fragment>)
}
function Signature({ label, english, image, date }) { return <div className="snapshot-signature"><strong>{label}：</strong><div className="snapshot-signature-entry"><span className="snapshot-signature-line">{image && <img src={image} alt="电子签名"/>}</span><span className="snapshot-date-label">日期 Date：</span><span className="snapshot-date">{date || ''}</span></div><small>{english}：</small></div> }

const hazardOptions = [['Safety','无危险性 Safety'],['Flammability','易燃易爆 Flammability'],['Irritation','刺激性 Irritation'],['Volatility','易挥发 Volatility'],['Fragile','易碎 Fragile'],['Other','其他 Others']]
const magnetismOptions = [['Non-magnetic','无磁 Non-magnetic'],['Weak-magnetic','弱磁 Weak-magnetic'],['Strong-magnetic','强磁 Strong-magnetic'],['Unknown','未知 Unknown']]
const conductivityOptions = [['Conductor','导体 Conductor'],['Semiconductor','半导体 Semiconductor'],['Insulator','绝缘体 Insulator'],['Unknown','未知 Unknown']]

function normalizePacket(packet = {}, meta = {}) {
  const snapshot = packet?.formSnapshot || {}
  const form = snapshot.formData || {}
  const commission = packet?.commissionData || {}
  const order = commission.orderInfo || {}
  const report = commission.reportInfo || {}
  const handling = commission.sampleHandling || {}
  const requirements = commission.sampleRequirements || form.sampleRequirements || {}
  const customer = snapshot.selectedCustomer || {}
  const payer = snapshot.selectedPayer || {}
  const template = packet?.templateData || {}
  const sourceItems = asArray(snapshot.businessTestItems).length ? snapshot.businessTestItems : (asArray(form.testItems).length ? form.testItems : asArray(commission.testItems))
  return {
    requestNo: meta?.request_no || meta?.requestNo || '', orderNum: meta?.display_order_id || meta?.approved_order_id || meta?.approvedOrderId || form.orderNum || order.order_num || '',
    customerId: customer.commissioner_id || customer.customer_id || customer.id || template.customer_id || '',
    customerName: customer.customer_name || form.customerInfo?.customerName || template.customer_name || '', customerAddress: customer.customer_address || form.customerInfo?.customerAddress || template.customer_address || '', customerContact: customer.contact_name || form.customerInfo?.contactName || template.customer_contactName || '', customerEmail: customer.contact_email || form.customerInfo?.contactEmail || template.customer_contactEmail || '', customerPhone: customer.contact_phone_num || form.customerInfo?.contactPhoneNum || template.customer_contactPhone || '',
    payerName: payer.payer_name || form.payerInfo?.payerName || template.payer_name || '', payerAddress: payer.payer_address || form.payerInfo?.payerAddress || template.payer_address || '', payerPhone: payer.payer_contact_phone_num || form.payerInfo?.payerContactPhoneNum || template.payer_contactPhone || '', payerContact: payer.payer_contact_name || form.payerInfo?.payerContactName || template.payer_contactName || '', payerEmail: payer.payer_contact_email || form.payerInfo?.payerContactEmail || template.payer_contactEmail || '', payerBank: payer.bank_name || form.payerInfo?.bankName || template.payer_bankName || '', payerTaxNo: payer.tax_number || form.payerInfo?.taxNumber || template.payer_taxNumber || '', payerBankAccount: payer.bank_account || form.payerInfo?.bankAccount || template.payer_bankAccount || '',
    salesUserId: template.sales_user_id || snapshot.salesUserId || '', salesName: template.sales_name || snapshot.salesName || '', salesEmail: template.sales_email || snapshot.salesEmail || '', salesPhone: template.sales_phone || snapshot.salesPhone || '', salesSignatureDate: template.sales_signature_date || '', customerSignatureDate: template.customer_signature_date || '',
    urgency: form.orderUrgencyType || order.order_urgency_type || 'normal', deliveryDays: form.deliveryDays ?? order.delivery_days_after_receipt ?? '', reportTypes: asArray(form.reportType).length ? form.reportType : asArray(report.type), seals: asArray(form.reportSeals).length ? form.reportSeals : asArray(order.report_seals), paperShipping: form.paperReportShippingType || report.paper_report_shipping_type || '', reportAdditionalInfo: form.reportAdditionalInfo || report.report_additional_info || '', reportHeader: form.reportHeader || report.header_type || '', reportHeaderOther: form.reportHeaderAdditionalInfo || report.header_other || '', reportForm: form.reportForm || report.format_type || '',
    items: sourceItems.map((item) => ({ sampleName: text(item.sampleName ?? item.sample_name), material: text(item.material), sampleType: sampleTypeText(item.sampleType ?? item.sample_type, item.sampleTypeCustom ?? item.sample_type_custom), originalNo: text(item.original_no ?? item.originalNo), testItem: text(item.test_item ?? item.testItem), method: text(item.test_method ?? item.testMethod), quantity: text(item.quantity), note: text(item.note ?? item.remarks) })),
    otherRequirements: form.otherRequirements || order.other_requirements || '', subcontractingNotAccepted: Boolean(form.subcontractingNotAccepted ?? order.subcontracting_not_accepted), hazards: asArray(requirements.hazards), hazardOther: requirements.hazardOther || requirements.hazard_other || '', magnetism: requirements.magnetism || '', conductivity: requirements.conductivity || '', breakable: requirements.breakable || '', brittle: requirements.brittle || '', handlingType: form.sampleSolutionType || handling.handling_type || '', returnAddressOption: form.sampleReturnInfo?.returnAddressOption || handling.return_info?.returnAddressOption || '', returnAddress: form.sampleReturnInfo?.returnAddress || handling.return_info?.returnAddress || ''
  }
}

function sampleTypeText(value, custom) { const labels = { 1:'板材', 2:'棒材', 3:'粉末', 4:'液体', 5:'其他' }; return custom || labels[value] || text(value) }
