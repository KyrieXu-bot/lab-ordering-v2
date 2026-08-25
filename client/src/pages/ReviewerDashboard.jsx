import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrderRequests } from '../api/api'
import Pagination from '../components/Pagination'
import PortalLayout from '../components/PortalLayout'

const statusText = { submitted: '待审批', approved: '已通过', returned: '已退回', withdrawn: '已撤回' }
const urgencyText = { normal: '正常', urgent_1_5x: '加急', urgent_2x: '特急' }
const PAGE_SIZE = 20

export default function ReviewerDashboard() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('submitted')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts] = useState({ submitted: 0, approved: 0, returned: 0, withdrawn: 0 })
  const tableWrapRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    const params = { page, page_size: PAGE_SIZE }
    if (filter !== 'all') params.status = filter
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
  }, [filter, page])
  const pending = Number(counts.submitted || 0)

  function changeFilter(nextFilter) {
    setFilter(nextFilter)
    setPage(1)
  }

  return (
    <PortalLayout dashboard>
      <div className="portal-dashboard">
        <section className="portal-hero reviewer-hero">
          <div><span className="portal-eyebrow">开单工作台</span><h1>委托审批</h1><p>审核业务提交的资料，通过后自动生成正式委托单。</p></div>
          <div className="reviewer-hero-actions">
            <button className="portal-primary" onClick={() => navigate('/orders/new')}>＋ 自行创建委托单</button>
            <div className="pending-counter"><strong>{pending}</strong><span>待审批</span></div>
          </div>
        </section>
        <section className="portal-card">
          <div className="portal-card-heading"><div><h2>申请队列</h2><p>共 {total} 条，每页 {PAGE_SIZE} 条；加急待审批优先置顶</p></div><div className="portal-tabs">{[['submitted','待审批'],['approved','已通过'],['returned','已退回'],['withdrawn','已撤回'],['all','全部']].map(([key,label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => changeFilter(key)}>{label}</button>)}</div></div>
          {error && <div className="portal-error">{error}</div>}
          <div className="portal-table-wrap portal-table-scroll" ref={tableWrapRef}>
            <table className="portal-table">
              <thead><tr><th>申请编号</th><th>申请人</th><th>委托方</th><th>提交时间</th><th>周期类型</th><th>状态</th><th>正式单号</th><th className="portal-actions">操作</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="8" className="portal-empty">正在加载…</td></tr> : rows.length === 0 ? <tr><td colSpan="8" className="portal-empty">当前没有相关申请</td></tr> : rows.map((row) => (
                  <tr key={row.request_id} className={row.status === 'submitted' && ['urgent_1_5x', 'urgent_2x'].includes(row.order_urgency_type) ? 'portal-priority-row' : ''}>
                    <td className="portal-mono">{row.request_no}</td><td>{row.applicant_name}</td><td>{row.customer_name || '—'}</td><td>{formatTime(row.submitted_at)}</td>
                    <td><span className={`urgency-pill urgency-${row.order_urgency_type || 'normal'}`}>{urgencyText[row.order_urgency_type] || '正常'}</span></td>
                    <td><span className={`status-pill status-${row.status}`}>{statusText[row.status] || row.status}</span></td><td className="portal-mono">{row.approved_order_id || '—'}</td>
                    <td className="portal-actions">
                      <button onClick={() => navigate(`/requests/${row.request_id}`)}>查看详情</button>
                      {row.status === 'submitted' && <button onClick={() => navigate(`/review/${row.request_id}`)}>审批</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </section>
      </div>
    </PortalLayout>
  )
}

function formatTime(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—' }
