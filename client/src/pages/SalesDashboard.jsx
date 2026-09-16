import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrderRequests, withdrawOrderRequest } from '../api/api'
import Pagination from '../components/Pagination'
import PortalLayout from '../components/PortalLayout'
import OrderRequestPreviewModal from '../components/OrderRequestPreviewModal'
import TextDetailModal, { TruncatedDetailLink } from '../components/TextDetailModal'
import RequestDownloadMenu from '../components/RequestDownloadMenu'

const statusText = { submitted: '待审批', pending_open: '待开单', opened: '已开单', returned: '已驳回', withdrawn: '已撤回' }
const requestTypeText = { normal: '普通', modification: '修改', additional_test: '加测' }
const PAGE_SIZE = 20

export default function SalesDashboard() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState('all')
  const [requestTypeFilter, setRequestTypeFilter] = useState('all')
  const [previewRequestId, setPreviewRequestId] = useState(null)
  const [previewRelatedRequestIds, setPreviewRelatedRequestIds] = useState([])
  const [expandedGroups, setExpandedGroups] = useState({})
  const [changeSource, setChangeSource] = useState(null)
  const [textDetail, setTextDetail] = useState(null)
  const tableWrapRef = useRef(null)

  async function load(targetPage = page) {
    setLoading(true); setError('')
    try {
      const { data } = await getOrderRequests({
        page: targetPage,
        page_size: PAGE_SIZE,
        keyword: keyword || undefined,
        status: filter === 'all' ? undefined : filter,
        request_type: requestTypeFilter === 'all' ? undefined : requestTypeFilter,
        grouped: 1
      })
      const items = Array.isArray(data) ? data : (data.items || [])
      setRows(items)
      setTotal(Array.isArray(data) ? items.length : Number(data.pagination?.total || 0))
      setTotalPages(Array.isArray(data) ? 1 : Number(data.pagination?.total_pages || 1))
      if (tableWrapRef.current) tableWrapRef.current.scrollTop = 0
    }
    catch (requestError) { setError(requestError.response?.data?.message || '申请列表加载失败') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])
  useEffect(() => { load(page) }, [page, keyword, filter, requestTypeFilter])

  function changeFilter(nextFilter) {
    setFilter(nextFilter)
    setPage(1)
  }

  function changeRequestTypeFilter(nextType) {
    setRequestTypeFilter(nextType)
    setExpandedGroups({})
    setPage(1)
  }

  async function withdraw(row) {
    if (!window.confirm(`确认撤回申请 ${row.request_no}？撤回后记录仍会保留。`)) return
    try {
      await withdrawOrderRequest(row.request_id)
      if (rows.length === 1 && page > 1) setPage(page - 1)
      else await load(page)
    }
    catch (requestError) { alert(requestError.response?.data?.message || '撤回失败') }
  }

  const groups = useMemo(() => {
    const map = new Map()
    rows.forEach((row) => {
      const key = row.group_key || row.approved_order_id || `REQUEST-${row.request_id}`
      if (!map.has(key)) map.set(key, { key, rows: [] })
      map.get(key).rows.push(row)
    })
    return Array.from(map.values()).map((group) => {
      group.rows.sort((a, b) => Number(b.request_id) - Number(a.request_id))
      group.latest = requestTypeFilter === 'all'
        ? group.rows[0]
        : (group.rows.find(row => (row.request_type || 'normal') === requestTypeFilter) || group.rows[0])
      group.opening = [...group.rows].reverse().find(row => (row.request_type || 'normal') === 'normal') || group.latest
      group.source = group.rows.find(row => row.request_type !== 'additional_test' && row.status === 'approved' && Boolean(row.order_opened))
        || group.rows.find(row => (row.request_type || 'normal') === 'normal' && row.status === 'approved' && Boolean(row.order_opened))
      group.pdfRow = group.rows.find(row => Boolean(row.pdf_generated) && Boolean(row.attachment_file_id))
      group.flowRow = group.rows.find(row => Boolean(row.order_opened) && Boolean(row.approved_order_id)) || group.source
      group.requirementRow = group.rows.find(row => Boolean(row.requirement_file_id)) || group.opening
      group.pendingModification = group.rows.some(row => row.request_type === 'modification' && row.status === 'submitted')
      group.pendingAdditionalTest = group.rows.some(row => row.request_type === 'additional_test' && row.status === 'submitted')
      return group
    })
  }, [rows, requestTypeFilter])

  function toggleGroup(key) { setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] })) }
  function openGroupPreview(group) {
    setPreviewRelatedRequestIds(group.rows.map((item) => item.request_id))
    setPreviewRequestId(group.latest.request_id)
  }
  function closePreview() {
    setPreviewRequestId(null)
    setPreviewRelatedRequestIds([])
  }

  return (
    <PortalLayout dashboard>
      <div className="portal-dashboard">
        <section className="portal-hero">
          <div><span className="portal-eyebrow">我的委托</span><h1>委托申请</h1><p>新建检测委托，并在这里跟踪审批结果和正式单号。</p></div>
          <button className="portal-primary" onClick={() => navigate('/requests/new')}>＋ 新建委托单</button>
        </section>
        <section className="portal-card">
          <div className="portal-card-heading">
            <div><h2>申请记录</h2><p>共 {total} 条，每页 {PAGE_SIZE} 条</p></div>
            <div className="portal-card-tools">
              <label className="portal-search"><span>搜索</span><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="申请编号 / 委托方 / 委托人 / 业务员 / 正式单号" /></label>
              <label className="portal-select-filter"><span>申请类型</span><select value={requestTypeFilter} onChange={(event) => changeRequestTypeFilter(event.target.value)}><option value="all">全部</option><option value="normal">普通</option><option value="additional_test">加测</option><option value="modification">修改</option></select></label>
              <div className="portal-tabs">{[['all','全部'],['submitted','待审批'],['pending_open','待开单'],['opened','已开单'],['returned','已驳回'],['withdrawn','已撤回']].map(([key,label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => changeFilter(key)}>{label}</button>)}</div>
            </div>
          </div>
          {error && <div className="portal-error">{error}</div>}
          <div className="portal-table-wrap portal-table-scroll" ref={tableWrapRef}>
            <table className="portal-table grouped-request-table">
              <thead><tr><th className="formal-order-col">正式单号</th><th className="commissioner-name-col">委托方</th><th className="commissioner-contact-col">委托人</th><th className="request-latest-col">最近申请</th><th className="request-history-col">申请历程</th><th className="request-applicant-col">申请人</th><th className="salesperson-name-col">业务员（服务方）</th><th className="request-status-col">当前状态</th><th className="request-note-cell">备注</th><th className="portal-actions grouped-request-actions">操作</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="10" className="portal-empty">正在加载…</td></tr> : groups.length === 0 ? <tr><td colSpan="10" className="portal-empty">{keyword ? '没有匹配的申请' : '当前筛选下没有委托申请'}</td></tr> : groups.map((group) => {
                  const row = group.latest
                  const expanded = Boolean(expandedGroups[group.key])
                  return <React.Fragment key={group.key}>
                    <tr className="request-group-row">
                      <td className="portal-mono formal-order-col">{row.approved_order_id || '—'}</td>
                      <td className="commissioner-name-col"><TruncatedDetailLink value={row.customer_name} label="委托方" onOpen={setTextDetail} /></td>
                      <td className="commissioner-contact-col">{row.commissioner_contact_name || '—'}</td>
                      <td className="request-latest-col"><span className={`request-type-pill type-${row.request_type || 'normal'}`}>{requestTypeText[row.request_type || 'normal']}</span><span className="portal-mono request-latest-no">{row.request_no}</span></td>
                      <td className="request-history-col"><span className="history-count-label">{group.rows.length} 条申请记录</span></td>
                      <td className="request-applicant-col">{row.applicant_name || '—'}</td>
                      <td className="salesperson-name-col">{row.salesperson_name || '—'}</td>
                      <td className="request-status-col"><span className={`status-pill status-${row.display_status}`}>{statusText[row.display_status] || row.display_status}</span></td>
                      <td className="request-note-cell"><TruncatedDetailLink value={group.opening.review_note} label="备注" onOpen={setTextDetail} /></td>
                      <td className="portal-actions grouped-request-actions">
                        {group.rows.length > 1 ? (
                          <>
                            <button onClick={() => openGroupPreview(group)}>预览</button>
                            {group.source && <><button className="additional-test-button" disabled={group.pendingAdditionalTest} title={group.pendingAdditionalTest ? '已有待审批的加测申请' : ''} onClick={() => navigate(`/requests/${group.source.request_id}/add-test`)}>加测</button><button className="change-order-button" disabled={group.pendingModification} title={group.pendingModification ? '已有待审批的修改申请' : ''} onClick={() => setChangeSource(group.source)}>修改</button></>}
                            <RequestDownloadMenu pdfRow={group.pdfRow} flowRow={group.flowRow} requirementRow={group.requirementRow} />
                            <button type="button" className={`group-operation-toggle${expanded ? ' is-expanded' : ''}`} onClick={() => toggleGroup(group.key)} aria-expanded={expanded}>{expanded ? '收起 ↑' : '展开 ↓'}</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openGroupPreview(group)}>预览</button>
                            {group.source && <><button className="additional-test-button" disabled={group.pendingAdditionalTest} title={group.pendingAdditionalTest ? '已有待审批的加测申请' : ''} onClick={() => navigate(`/requests/${group.source.request_id}/add-test`)}>加测</button><button className="change-order-button" disabled={group.pendingModification} title={group.pendingModification ? '已有待审批的修改申请' : ''} onClick={() => setChangeSource(group.source)}>修改</button></>}
                            <RequestDownloadMenu pdfRow={group.pdfRow} flowRow={group.flowRow} requirementRow={group.requirementRow} />
                            {['submitted','returned'].includes(row.status) && <button onClick={() => navigate(`/requests/${row.request_id}/edit`)}>修改申请</button>}
                            {row.status === 'submitted' && <button className="danger" onClick={() => withdraw(row)}>撤回</button>}
                          </>
                        )}
                      </td>
                    </tr>
                    {expanded && <tr className="request-history-row"><td colSpan="10"><div className="request-history-list">
                      {group.rows.map(item => <div className="request-history-item" key={item.request_id}>
                        <span className={`request-type-pill type-${item.request_type || 'normal'}`}>{requestTypeText[item.request_type || 'normal']}</span>
                        <strong className="portal-mono request-history-number">{item.request_no}</strong>
                        <span className="request-history-person" title={item.applicant_name || ''}>申请人：{item.applicant_name || '—'}</span>
                        <span className="request-history-person" title={item.salesperson_name || ''}>业务员：{item.salesperson_name || '—'}</span>
                        <time className="request-history-time" dateTime={item.submitted_at || ''}>{formatTime(item.submitted_at)}</time>
                        <span className={`status-pill request-history-status status-${item.display_status}`}>{statusText[item.display_status] || item.display_status}</span>
                        <span className="request-history-note" title={item.review_note || ''}>{item.review_note || '—'}</span>
                        <div className="request-history-actions">
                          <RequestDownloadMenu pdfRow={item.attachment_file_id ? item : null} flowRow={group.flowRow} requirementRow={item} compact />
                          {['submitted','returned'].includes(item.status) && <button onClick={() => navigate(`/requests/${item.request_id}/edit`)}>修改申请</button>}
                          {item.status === 'submitted' && <button className="danger" onClick={() => withdraw(item)}>撤回</button>}
                        </div>
                      </div>)}
                    </div></td></tr>}
                  </React.Fragment>
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </section>
        <OrderRequestPreviewModal open={Boolean(previewRequestId)} requestId={previewRequestId} relatedRequestIds={previewRelatedRequestIds} onClose={closePreview} />
        <TextDetailModal detail={textDetail} onClose={() => setTextDetail(null)} />
        {changeSource && <div className="follow-up-confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setChangeSource(null)}><section className="follow-up-confirm-modal" role="dialog" aria-modal="true"><span className="follow-up-warning">!</span><h2>申请修改</h2><p>当前审批已通过，继续修改需要开单员二次审批，是否继续？</p><div><button type="button" className="cancel" onClick={() => setChangeSource(null)}>取消</button><button type="button" className="confirm" onClick={() => navigate(`/requests/${changeSource.request_id}/change`)}>确认继续</button></div></section></div>}
      </div>
    </PortalLayout>
  )
}

function formatTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}
