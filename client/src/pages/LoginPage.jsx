import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { login } from '../api/api'
import { getSession, setSession } from '../auth'
import '../css/Portal.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (getSession()?.token) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { data } = await login(username.trim(), password)
      setSession(data)
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || '登录失败，请稍后重试')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-kicker">JITRI · ORDERING</div>
        <h1>委托申请管理系统</h1>
        <p>使用 LIMS 账号登录，提交和审核检测委托申请。</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>账号<input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label>
          <label>密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
          {error && <div className="portal-error">{error}</div>}
          <button type="submit" disabled={submitting || !username || !password}>{submitting ? '正在登录…' : '登录系统'}</button>
        </form>
      </div>
      <div className="login-aside"><div><span>清晰 · 有序 · 可追溯</span><h2>让每一份委托<br />从申请开始规范。</h2></div></div>
    </div>
  )
}
