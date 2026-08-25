import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { downloadOrderRequestAttachment, generateOrderRequestPdf, getOrderRequests, withdrawOrderRequest } from '../api/api'
import Pagination from '../components/Pagination'
import PortalLayout from '../components/PortalLayout'

const statusText = { submitted: '待审批', approved: '已通过', returned: '已退回', withdrawn: '已撤回' }
const PAGE_SIZE = 20

export default function SalesDashboard() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generatingId, setGeneratingId] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const tableWrapRef = useRef(null)

  async function load(targetPage = page) {
    setLoading(true); setError('')
    try {
      const { data } = await getOrderRequests({ page: targetPage, page_size: PAGE_SIZE })
      const items = Array.isArray(data) ? data : (data.items || [])
      setRows(items)
      setTotal(Array.isArray(data) ? items.length : Number(data.pagination?.total || 0))
      setTotalPages(Array.isArray(data) ? 1 : Number(data.pagination?.total_pages || 1))
      if (tableWrapRef.current) tableWrapRef.current.scrollTop = 0
    }
    catch (requestError) { setError(requestError.response?.data?.message || '申请列表加载失败') }
    finally { setLoading(false) }
  }
  useEffect(() => { load(page) }, [page])

  async function withdraw(row) {
    if (!window.confirm(`确认撤回申请 ${row.request_no}？撤回后记录仍会保留。`)) return
    try {
      await withdrawOrderRequest(row.request_id)
      if (rows.length === 1 && page > 1) setPage(page - 1)
      else await load(page)
    }
    catch (requestError) { alert(requestError.response?.data?.message || '撤回失败') }
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
    } catch (error) { alert(error.response?.data?.message || 'PDF 下载失败') }
  }

  async function generatePdf(row) {
    if (generatingId) return
    setGeneratingId(row.request_id)
    try {
      const { data } = await generateOrderRequestPdf(row.request_id)
      await load(page)
      alert(data.already_generated ? 'PDF 已经生成，可以直接下载。' : `PDF 生成完成，已关联到 ${data.linked_test_item_count || 0} 个检测项目附件。`)
    } catch (requestError) {
      alert(requestError.response?.data?.message || 'PDF 生成失败，请重试')
    } finally {
      setGeneratingId(null)
    }
  }

  return (
    <PortalLayout dashboard>
      <div className="portal-dashboard">
        <section className="portal-hero">
          <div><span className="portal-eyebrow">我的委托</span><h1>委托申请</h1><p>新建检测委托，并在这里跟踪审批结果和正式单号。</p></div>
          <button className="portal-primary" onClick={() => navigate('/requests/new')}>＋ 新建委托单</button>
        </section>
        <section className="portal-card">
          <div className="portal-card-heading"><div><h2>申请记录</h2><p>共 {total} 条，每页 {PAGE_SIZE} 条</p></div></div>
          {error && <div className="portal-error">{error}</div>}
          <div className="portal-table-wrap portal-table-scroll" ref={tableWrapRef}>
            <table className="portal-table">
              <thead><tr><th>申请编号</th><th>委托方</th><th>提交时间</th><th>状态</th><th>正式单号</th><th className="portal-actions">操作</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="6" className="portal-empty">正在加载…</td></tr> : rows.length === 0 ? <tr><td colSpan="6" className="portal-empty">还没有委托申请</td></tr> : rows.map((row) => (
                  <tr key={row.request_id}>
                    <td className="portal-mono">{row.request_no}</td>
                    <td>{row.customer_name || '—'}</td>
                    <td>{formatTime(row.submitted_at)}</td>
                    <td><span className={`status-pill status-${row.status}`}>{statusText[row.status] || row.status}</span></td>
                    <td className="portal-mono">{row.approved_order_id || '—'}</td>
                    <td className="portal-actions">
                      {['submitted', 'returned'].includes(row.status)
                        ? <button onClick={() => navigate(`/requests/${row.request_id}/edit`)}>修改</button>
                        : <button onClick={() => navigate(`/requests/${row.request_id}`)}>查看详情</button>}
                      {row.status === 'approved' && row.approved_order_id && (
                        row.pdf_generated && row.attachment_file_id
                          ? <button className="pdf-download-button" onClick={() => downloadPdf(row)}>下载PDF</button>
                          : generatingId === row.request_id
                            ? <span className="pdf-generation-progress"><span>生成中</span><i /></span>
                            : <button className="pdf-generate-button" onClick={() => generatePdf(row)}>生成PDF</button>
                      )}
                      {row.status === 'submitted' && <button className="danger" onClick={() => withdraw(row)}>撤回</button>}
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

function formatTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
