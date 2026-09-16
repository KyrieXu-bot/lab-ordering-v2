import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { approveOrderRequest, generateOrderRequestPdf, getOrderRequests, returnOrderRequest } from '../api/api'
import Pagination from '../components/Pagination'
import PortalLayout from '../components/PortalLayout'
import OrderRequestPreviewModal from '../components/OrderRequestPreviewModal'
import RequestDownloadMenu from '../components/RequestDownloadMenu'

const statusText = { submitted: '待审批', pending_open: '待开单', opened: '已开单', returned: '已驳回', withdrawn: '已撤回' }
const requestTypeText = { normal: '普通', modification: '修改', additional_test: '加测' }
const urgencyText = { normal: '正常', urgent_1_5x: '加急', urgent_2x: '特急' }
const PAGE_SIZE = 20

export default function ReviewerDashboard() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [requestTypeFilter, setRequestTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts] = useState({ submitted: 0, pending_open: 0, opened: 0, returned: 0, withdrawn: 0 })
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [decisionRequest, setDecisionRequest] = useState(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [returnMode, setReturnMode] = useState(false)
  const [decisionBusy, setDecisionBusy] = useState(false)
  const [approvalSuccess, setApprovalSuccess] = useState(null)
  const [previewRequestId, setPreviewRequestId] = useState(null)
  const [pdfGeneratingRequestId, setPdfGeneratingRequestId] = useState(null)
  const tableWrapRef = useRef(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setLoading(true)
    setError('')
    const params = { page, page_size: PAGE_SIZE }
    if (filter !== 'all') params.status = filter
    if (requestTypeFilter !== 'all') params.request_type = requestTypeFilter
    if (keyword) params.keyword = keyword
    getOrderRequests(params)
      .then(({ data }) => {
        const items = Array.isArray(data) ? data : (data.items || [])
        setRows(items)
        setTotal(Array.isArray(data) ? items.length : Number(data.pagination?.total || 0))
        setTotalPages(Array.isArray(data) ? 1 : Number(data.pagination?.total_pages || 1))
        if (!Array.isArray(data)) setCounts(data.counts || {})
        if (tableWrapRef.current) tableWrapRef.current.scrollTop = 0
      })
      .catch((requestError) => setError(requestError.response?.data?.message || '申请列表加载失败'))
      .finally(() => setLoading(false))
  }, [filter, requestTypeFilter, page, keyword, refreshKey])
  const pending = Number(counts.submitted || 0)

  function changeFilter(nextFilter) {
    setFilter(nextFilter)
    setPage(1)
  }

  function changeRequestTypeFilter(nextType) {
    setRequestTypeFilter(nextType)
    setPage(1)
  }

  function openDecision(row) {
    setDecisionRequest(row)
    setDecisionNote('')
    setReturnReason('')
    setReturnMode(false)
    setApprovalSuccess(null)
  }

  function closeDecision() {
    if (decisionBusy) return
    setDecisionRequest(null)
    setApprovalSuccess(null)
    setReturnMode(false)
  }

  async function approveRequest() {
    if (!decisionRequest || decisionBusy) return
    setDecisionBusy(true)
    try {
      const { data } = await approveOrderRequest(decisionRequest.request_id, decisionNote, decisionRequest.version)
      setApprovalSuccess({ orderNum: data.orderNum, requestType: data.requestType || decisionRequest.request_type || 'normal', requiresOpen: Boolean(data.requiresOpen) })
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      alert(requestError.response?.data?.message || '审批失败，请重试')
    } finally {
      setDecisionBusy(false)
    }
  }

  async function confirmReturn() {
    if (!decisionRequest || decisionBusy) return
    const reason = returnReason.trim()
    if (!reason) return alert('请填写回退原因')
    setDecisionBusy(true)
    try {
      await returnOrderRequest(decisionRequest.request_id, reason)
      setDecisionRequest(null)
      setReturnMode(false)
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      alert(requestError.response?.data?.message || '回退失败，请重试')
    } finally {
      setDecisionBusy(false)
    }
  }

  function currentPdfRow(row) {
    if (row.order_pdf_request_id) {
      return {
        request_id: row.order_pdf_request_id,
        attachment_file_id: row.order_pdf_file_id,
        attachment_filename: row.order_pdf_filename,
        request_no: row.request_no
      }
    }
    return row.attachment_file_id ? row : null
  }

  async function generatePdf(row) {
    if (!row?.request_id || pdfGeneratingRequestId) return
    setPdfGeneratingRequestId(row.request_id)
    try {
      const { data } = await generateOrderRequestPdf(row.request_id)
      console.info('[PDF手动生成成功]', { requestId: row.request_id, orderId: row.approved_order_id, response: data })
      alert(data?.already_generated ? 'PDF 已存在并已关联到 LIMS。' : 'PDF 生成成功并已关联到 LIMS。')
      setRefreshKey((value) => value + 1)
    } catch (requestError) {
      console.error('[PDF手动生成失败]', {
        requestId: row.request_id,
        orderId: row.approved_order_id,
        status: requestError.response?.status,
        response: requestError.response?.data,
        headers: requestError.response?.headers,
        error: requestError
      })
      alert(requestError.response?.data?.message || `PDF 生成失败（HTTP ${requestError.response?.status || '未知'}），请打开浏览器控制台查看详情。`)
    } finally {
      setPdfGeneratingRequestId(null)
    }
  }

  return (
    <PortalLayout dashboard>
      <div className="portal-dashboard">
        <section className="portal-hero reviewer-hero">
          <div><span className="portal-eyebrow">开单工作台</span><h1>委托审批</h1><p>审批后系统自动分配单号，再进入正式开单录入。</p></div>
          <div className="reviewer-hero-actions">
            <button className="portal-primary" onClick={() => navigate('/orders/new')}>＋ 自行创建委托单</button>
            <button type="button" className={`pending-counter pending-counter-button${filter === 'submitted' ? ' active' : ''}`} onClick={() => changeFilter('submitted')} aria-pressed={filter === 'submitted'} title="筛选待审批申请"><strong>{pending}</strong><span>待审批</span></button>
          </div>
        </section>
        <section className="portal-card">
          <div className="portal-card-heading">
            <div><h2>申请队列</h2><p>共 {total} 条，每页 {PAGE_SIZE} 条；未生成正式单号的申请在前，其余按正式单号升序</p></div>
            <div className="portal-card-tools">
              <label className="portal-search"><span>搜索</span><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="申请编号 / 委托方 / 委托人 / 业务员 / 正式单号" /></label>
              <label className="portal-select-filter"><span>申请类型</span><select value={requestTypeFilter} onChange={(event) => changeRequestTypeFilter(event.target.value)}><option value="all">全部</option><option value="normal">普通</option><option value="additional_test">加测</option><option value="modification">修改</option></select></label>
              <div className="portal-tabs">{[['all','全部'],['submitted','待审批'],['pending_open','待开单'],['opened','已开单'],['returned','已驳回'],['withdrawn','已撤回']].map(([key,label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => changeFilter(key)}>{label}</button>)}</div>
            </div>
          </div>
          {error && <div className="portal-error">{error}</div>}
          <div className="portal-table-wrap portal-table-scroll" ref={tableWrapRef}>
            <table className="portal-table reviewer-request-table">
              <thead><tr><th>正式单号</th><th className="commissioner-name-col">委托方</th><th className="commissioner-contact-col">委托人</th><th>申请编号</th><th>申请类型</th><th>申请人</th><th>业务员（服务方）</th><th>提交时间</th><th>周期类型</th><th>到达方式</th><th>状态</th><th className="portal-actions">操作</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="12" className="portal-empty">正在加载…</td></tr> : rows.length === 0 ? <tr><td colSpan="12" className="portal-empty">{keyword ? '没有匹配的申请' : '当前没有相关申请'}</td></tr> : rows.map((row) => (
                  <tr key={row.request_id} className={row.status === 'submitted' && ['urgent_1_5x', 'urgent_2x'].includes(row.order_urgency_type) ? 'portal-priority-row' : ''}>
                    <td className="portal-mono">{row.approved_order_id || '—'}</td><td className="commissioner-name-col commissioner-name-full">{row.customer_name || '—'}</td><td className="commissioner-contact-col">{row.commissioner_contact_name || '—'}</td><td className="portal-mono">{row.request_no}</td><td><span className={`request-type-pill type-${row.request_type || 'normal'}`}>{requestTypeText[row.request_type || 'normal']}</span></td><td>{row.applicant_name}</td><td>{row.salesperson_name || '—'}</td><td>{formatTime(row.submitted_at)}</td>
                    <td><span className={`urgency-pill urgency-${row.order_urgency_type || 'normal'}`}>{urgencyText[row.order_urgency_type] || '正常'}</span></td>
                    <td><span className="arrival-summary"><span>{row.arrival_mode === 'on_site' ? '现场' : row.arrival_mode === 'delivery' ? '寄样' : '—'}</span>{Number(row.test_item_count) > 0 && <span className={`item-count-pill ${Number(row.test_item_count) > 1 ? 'multiple' : 'single'}`} title={`共 ${row.test_item_count} 行项目`}>{Number(row.test_item_count) > 1 ? '多' : '单'}</span>}</span></td>
                    <td><span className={`status-pill status-${row.display_status}`}>{statusText[row.display_status] || row.display_status}</span></td>
                    <td className="portal-actions">
                      <button onClick={() => setPreviewRequestId(row.request_id)}>预览</button>
                      <button className="review-action-button" disabled={row.status !== 'submitted'} onClick={() => openDecision(row)}>审批</button>
                      <button className="open-order-button" disabled={row.status !== 'approved' || Boolean(row.order_opened) || row.request_type === 'modification'} onClick={() => navigate(`/review/${row.request_id}`)}>{row.request_type === 'additional_test' ? '录入加测' : '开单'}</button>
                      <button
                        className="pdf-generate-button"
                        disabled={!row.order_opened || !row.approved_order_id || Boolean(pdfGeneratingRequestId)}
                        title={row.order_opened ? '手动生成或检查委托单 PDF' : '完成开单后才能生成 PDF'}
                        onClick={() => generatePdf(row)}
                      >{pdfGeneratingRequestId === row.request_id ? '生成中…' : '生成PDF'}</button>
                      <RequestDownloadMenu pdfRow={currentPdfRow(row)} flowRow={row} requirementRow={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </section>
        {decisionRequest && (
          <div className="review-decision-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDecision()}>
            <section className="review-decision-modal" role="dialog" aria-modal="true" aria-labelledby="review-decision-title">
              {approvalSuccess ? (
                <>
                  <div className="review-decision-success">✓</div>
                  <h2 id="review-decision-title">审批成功</h2>
                  <p>{approvalSuccess.requestType === 'normal' ? '已出单号' : '关联正式单号'}：<strong>{approvalSuccess.orderNum}</strong></p>
                  {approvalSuccess.requiresOpen && <p className="review-success-next">请在申请队列点击“录入加测”完成正式检测项目录入。</p>}
                  <button type="button" className="review-modal-close" onClick={closeDecision}>知道了</button>
                </>
              ) : (
                <>
                  <div className="review-modal-heading">
                    <div><span>申请审批</span><h2 id="review-decision-title">{decisionRequest.request_no}</h2></div>
                    <button type="button" onClick={closeDecision} aria-label="关闭">×</button>
                  </div>
                  {!returnMode ? (
                    <label className="review-modal-input">审批备注（可选）
                      <input type="text" value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} maxLength={500} placeholder="可填写简短备注" autoFocus />
                    </label>
                  ) : (
                    <label className="review-modal-input return-reason">回退原因
                      <input type="text" value={returnReason} onChange={(event) => setReturnReason(event.target.value)} maxLength={500} placeholder="请输入回退原因" autoFocus />
                    </label>
                  )}
                  <div className="review-modal-actions">
                    {!returnMode ? (
                      <>
                        <button type="button" className="approve" onClick={approveRequest} disabled={decisionBusy}>{decisionBusy ? '处理中…' : '通过'}</button>
                        <button type="button" className="return" onClick={() => setReturnMode(true)} disabled={decisionBusy}>回退</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="cancel" onClick={() => setReturnMode(false)} disabled={decisionBusy}>取消</button>
                        <button type="button" className="return" onClick={confirmReturn} disabled={decisionBusy}>{decisionBusy ? '处理中…' : '确认回退'}</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
        <OrderRequestPreviewModal open={Boolean(previewRequestId)} requestId={previewRequestId} onClose={() => setPreviewRequestId(null)} />
      </div>
    </PortalLayout>
  )
}

function formatTime(value) { return value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '—' }
