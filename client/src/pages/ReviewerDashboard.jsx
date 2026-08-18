import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrderRequests } from '../api/api'
import PortalLayout from '../components/PortalLayout'

const statusText = { submitted: '待审批', approved: '已通过', returned: '已退回', withdrawn: '已撤回' }

export default function ReviewerDashboard() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('submitted')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getOrderRequests().then(({ data }) => setRows(data)).catch((error) => alert(error.response?.data?.message || '申请列表加载失败')).finally(() => setLoading(false))
  }, [])
  const visible = filter === 'all' ? rows : rows.filter((row) => row.status === filter)
  const pending = rows.filter((row) => row.status === 'submitted').length

  return (
    <PortalLayout>
      <section className="portal-hero reviewer-hero">
        <div><span className="portal-eyebrow">开单工作台</span><h1>委托审批</h1><p>审核业务提交的资料，通过后自动生成正式委托单。</p></div>
        <div className="reviewer-hero-actions">
          <button className="portal-primary" onClick={() => navigate('/orders/new')}>＋ 自行创建委托单</button>
          <div className="pending-counter"><strong>{pending}</strong><span>待审批</span></div>
        </div>
      </section>
      <section className="portal-card">
        <div className="portal-card-heading"><div><h2>申请队列</h2><p>优先展示待处理申请</p></div><div className="portal-tabs">{[['submitted','待审批'],['approved','已通过'],['returned','已退回'],['withdrawn','已撤回'],['all','全部']].map(([key,label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div></div>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead><tr><th>申请编号</th><th>申请人</th><th>委托方</th><th>提交时间</th><th>状态</th><th>正式单号</th><th className="portal-actions">操作</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="portal-empty">正在加载…</td></tr> : visible.length === 0 ? <tr><td colSpan="7" className="portal-empty">当前没有相关申请</td></tr> : visible.map((row) => (
                <tr key={row.request_id}>
                  <td className="portal-mono">{row.request_no}</td><td>{row.applicant_name}</td><td>{row.customer_name || '—'}</td><td>{formatTime(row.submitted_at)}</td>
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
      </section>
    </PortalLayout>
  )
}

function formatTime(value) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—' }
