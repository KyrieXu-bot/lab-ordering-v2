import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/api'
import { getSession } from '../auth'

const POLL_INTERVAL_MS = 5000

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  )
}

function NoticeIcon({ type }) {
  const isSuccess = ['request_approved', 'request_opened'].includes(type)
  const isReturned = type === 'request_returned'
  return <span className={`notification-type-icon${isSuccess ? ' success' : ''}${isReturned ? ' returned' : ''}`}>{isSuccess ? '✓' : isReturned ? '↩' : '!'}</span>
}

function formatNotificationTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  const sameDay = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
  return date.toLocaleString('zh-CN', sameDay
    ? { hour: '2-digit', minute: '2-digit', hour12: false }
    : { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const session = getSession()
  const userId = session?.user?.user_id
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const latestIdRef = useRef(0)
  const initializedRef = useRef(false)
  const busyRef = useRef(false)
  const centerRef = useRef(null)

  const showNewNotification = useCallback((notification) => {
    if (!notification || !userId) return
    const seenKey = `ordering_notification_seen_${userId}`
    const seenId = Number(localStorage.getItem(seenKey) || 0)
    const notificationId = Number(notification.notification_id)
    if (notificationId <= seenId) return
    localStorage.setItem(seenKey, String(notificationId))
    setToast(notification)
  }, [userId])

  const poll = useCallback(async (initial = false) => {
    if (!userId || busyRef.current || (!initial && document.visibilityState === 'hidden')) return
    busyRef.current = true
    try {
      const params = initial || !latestIdRef.current ? {} : { after_id: latestIdRef.current }
      const { data } = await getNotifications(params)
      const incoming = Array.isArray(data.items) ? data.items : []
      setUnreadCount(Number(data.unread_count || 0))
      if (initial || !initializedRef.current) {
        setItems(incoming)
        latestIdRef.current = Number(data.latest_id || incoming[0]?.notification_id || 0)
        initializedRef.current = true
        const newestUnread = incoming.find((item) => !item.read_at)
        showNewNotification(newestUnread)
        return
      }
      if (!incoming.length) return
      latestIdRef.current = Number(data.latest_id || incoming[incoming.length - 1].notification_id)
      setItems((current) => {
        const byId = new Map([...incoming, ...current].map((item) => [String(item.notification_id), item]))
        return Array.from(byId.values()).sort((a, b) => Number(b.notification_id) - Number(a.notification_id)).slice(0, 30)
      })
      showNewNotification(incoming[incoming.length - 1])
      window.dispatchEvent(new CustomEvent('ordering:notifications', { detail: incoming }))
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[notifications] polling failed', error)
    } finally {
      busyRef.current = false
    }
  }, [showNewNotification, userId])

  useEffect(() => {
    poll(true)
    const timer = window.setInterval(() => poll(false), POLL_INTERVAL_MS)
    const handleVisibility = () => { if (document.visibilityState === 'visible') poll(false) }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [poll])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 8000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (centerRef.current && !centerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  async function readNotification(notification, shouldNavigate = true) {
    if (!notification.read_at) {
      setItems((current) => current.map((item) => item.notification_id === notification.notification_id
        ? { ...item, read_at: new Date().toISOString() }
        : item))
      setUnreadCount((count) => Math.max(0, count - 1))
      markNotificationRead(notification.notification_id).catch(() => poll(true))
    }
    setOpen(false)
    setToast(null)
    if (shouldNavigate && notification.request_id) navigate(`/requests/${notification.request_id}`)
  }

  async function readAll() {
    if (!unreadCount) return
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })))
    setUnreadCount(0)
    try { await markAllNotificationsRead() }
    catch (_) { poll(true) }
  }

  return (
    <>
      <div className="notification-center" ref={centerRef}>
        <button
          type="button"
          className={`notification-bell${open ? ' active' : ''}`}
          aria-label={`消息通知${unreadCount ? `，${unreadCount}条未读` : ''}`}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <BellIcon />
          {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        {open && (
          <section className="notification-panel" aria-label="消息通知">
            <header><div><strong>消息通知</strong>{unreadCount > 0 && <span>{unreadCount} 条未读</span>}</div><button type="button" onClick={readAll} disabled={!unreadCount}>全部已读</button></header>
            <div className="notification-list">
              {items.length === 0
                ? <div className="notification-empty"><BellIcon /><span>暂无消息</span></div>
                : items.map((item) => (
                  <button type="button" key={item.notification_id} className={`notification-item${item.read_at ? '' : ' unread'}`} onClick={() => readNotification(item)}>
                    <NoticeIcon type={item.notification_type} />
                    <span className="notification-copy"><strong>{item.title}</strong><span>{item.message}</span><time>{formatNotificationTime(item.created_at)}</time></span>
                  </button>
                ))}
            </div>
          </section>
        )}
      </div>
      {toast && createPortal((
        <aside className="notification-toast" role="status" aria-live="polite">
          <button type="button" className="notification-toast-close" aria-label="关闭通知" onClick={() => setToast(null)}>×</button>
          <button type="button" className="notification-toast-content" onClick={() => readNotification(toast)}>
            <NoticeIcon type={toast.notification_type} />
            <span><small>消息通知</small><strong>{toast.title}</strong><span>{toast.message}</span><time>{formatNotificationTime(toast.created_at)}</time></span>
          </button>
        </aside>
      ), document.body)}
    </>
  )
}
