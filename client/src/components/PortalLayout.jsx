import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession, getSession } from '../auth'
import '../css/Portal.css'

export default function PortalLayout({ children, wide = false, dashboard = false }) {
  const navigate = useNavigate()
  const session = getSession()
  const user = session?.user
  useEffect(() => {
    if (dashboard) window.scrollTo({ top: 0, left: 0 })
  }, [dashboard])
  return (
    <div className={`portal-shell${dashboard ? ' portal-dashboard-shell' : ''}`}>
      <header className="portal-header">
        <button className="portal-brand" onClick={() => navigate('/')} type="button">
          <span className="portal-brand-mark">J</span>
          <span><strong>集萃开单</strong><small>委托申请管理系统</small></span>
        </button>
        <div className="portal-account">
          <span>{user?.name || user?.username}</span>
          <span className="portal-role">{user?.reviewer ? '开单审核' : '业务员'}</span>
          <button type="button" className="portal-link-button" onClick={() => { clearSession(); navigate('/login') }}>退出登录</button>
        </div>
      </header>
      <main className={`portal-main${wide ? ' portal-main-wide' : ''}${dashboard ? ' portal-main-dashboard' : ''}`}>{children}</main>
    </div>
  )
}
