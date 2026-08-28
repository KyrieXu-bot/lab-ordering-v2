import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { approveOrderRequest, downloadOrderRequestAttachment, generateOrderRequestPdf, getOrderRequests, returnOrderRequest } from '../api/api'
import Pagination from '../components/Pagination'
import PortalLayout from '../components/PortalLayout'
import OrderRequestPreviewModal from '../components/OrderRequestPreviewModal'

const statusText = { submitted: '待审批', approved: '已通过', returned: '已驳回', withdrawn: '已撤回' }
const requestTypeText = { normal: '普通', modification: '修改', additional_test: '加测' }
const urgencyText = { normal: '正常', urgent_1_5x: '加急', urgent_2x: '特急' }
const PAGE_SIZE = 20

export default function ReviewerDashboard() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts] = useState({ submitted: 0, approved: 0, returned: 0, withdrawn: 0 })
  const [generatingId, setGeneratingId] = useState(null)
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
  }, [filter, page, keyword, refreshKey])
  const pending = Number(counts.submitted || 0)

  function changeFilter(nextFilter) {
    setFilter(nextFilter)
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

  async function downloadPdf(row) {
    try {
      const response = await downloadOrderRequestAttachment(row.request_id)
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = row.attachment_filename || `${row.request_no}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      alert(requestError.response?.data?.message || 'PDF 下载失败')
    }
  }

  async function generatePdf(row) {
    if (generatingId) return
    setGeneratingId(row.request_id)
    try {
      const { data } = await generateOrderRequestPdf(row.request_id)
      const params = { page, page_size: PAGE_SIZE }
      if (filter !== 'all') params.status = filter
      if (keyword) params.keyword = keyword
      const response = await getOrderRequests(params)
      const items = Array.isArray(response.data) ? response.data : (response.data.items || [])
      setRows(items)
      alert(data.already_generated ? 'PDF 已生成，可以直接下载。' : 'PDF 生成完成，业务员现已可以同步下载。')
    } catch (requestError) {
      alert(requestError.response?.data?.message || 'PDF 生成失败，请重试')
    } finally {
      setGeneratingId(null)
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
            <div><h2>申请队列</h2><p>共 {total} 条，每页 {PAGE_SIZE} 条；加急待审批优先置顶</p></div>
            <div className="portal-card-tools">
              <label className="portal-search"><span>搜索</span><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="申请编号 / 委托方 / 正式单号" /></label>
              <div className="portal-tabs">{[['all','全部'],['submitted','待审批'],['approved','已通过'],['returned','已退回'],['withdrawn','已撤回']].map(([key,label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => changeFilter(key)}>{label}</button>)}</div>
            </div>
          </div>
          {error && <div className="portal-error">{error}</div>}
          <div className="portal-table-wrap portal-table-scroll" ref={tableWrapRef}>
            <table className="portal-table">
              <thead><tr><th>申请编号</th><th>申请类型</th><th>申请人</th><th>委托方</th><th>提交时间</th><th>周期类型</th><th>状态</th><th>正式单号</th><th className="portal-actions">操作</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="9" className="portal-empty">正在加载…</td></tr> : rows.length === 0 ? <tr><td colSpan="9" className="portal-empty">{keyword ? '没有匹配的申请' : '当前没有相关申请'}</td></tr> : rows.map((row) => (
                  <tr key={row.request_id} className={row.status === 'submitted' && ['urgent_1_5x', 'urgent_2x'].includes(row.order_urgency_type) ? 'portal-priority-row' : ''}>
                    <td className="portal-mono">{row.request_no}</td><td><span className={`request-type-pill type-${row.request_type || 'normal'}`}>{requestTypeText[row.request_type || 'normal']}</span></td><td>{row.applicant_name}</td><td>{row.customer_name || '—'}</td><td>{formatTime(row.submitted_at)}</td>
                    <td><span className={`urgency-pill urgency-${row.order_urgency_type || 'normal'}`}>{urgencyText[row.order_urgency_type] || '正常'}</span></td>
                    <td><span className={`status-pill status-${row.status}`}>{row.status === 'approved' && !row.order_opened ? '已通过 · 待开单' : (statusText[row.status] || row.status)}</span></td><td className="portal-mono">{row.approved_order_id || '—'}</td>
                    <td className="portal-actions">
                      <button onClick={() => setPreviewRequestId(row.request_id)}>预览</button>
                      <button className="review-action-button" disabled={row.status !== 'submitted'} onClick={() => openDecision(row)}>审批</button>
                      <button className="open-order-button" disabled={row.status !== 'approved' || Boolean(row.order_opened) || row.request_type === 'modification'} onClick={() => navigate(`/review/${row.request_id}`)}>{row.request_type === 'additional_test' ? '录入加测' : '开单'}</button>
                      {(row.request_type || 'normal') === 'normal' && row.attachment_file_id && !row.pdf_generated && (
                        <button className="pdf-download-button historical-pdf-button" onClick={() => downloadPdf(row)}>下载原PDF</button>
                      )}
                      {row.status === 'approved' && Boolean(row.approved_order_id) && Boolean(row.order_opened)
                        && ((row.request_type || 'normal') !== 'normal' || !row.attachment_file_id || row.pdf_generated) && (
                        row.pdf_generated && row.attachment_file_id
                          ? <button className="pdf-download-button" onClick={() => downloadPdf(row)}>下载PDF</button>
                          : generatingId === row.request_id
                            ? <span className="pdf-generation-progress"><span>生成中，约需 8–10 秒，请勿刷新</span><i /></span>
                            : <button className="pdf-generate-button" onClick={() => generatePdf(row)}>生成PDF</button>
                      )}
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
