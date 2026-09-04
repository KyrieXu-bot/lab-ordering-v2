import React, { useEffect } from 'react'

export function TruncatedDetailLink({ value, label, onOpen }) {
  const text = String(value || '').trim()
  if (!text) return <span className="portal-empty-value">—</span>

  return (
    <button
      type="button"
      className="portal-truncated-link"
      title={`查看完整${label}`}
      onClick={() => onOpen({ title: label, content: text })}
    >
      {text}
    </button>
  )
}

export default function TextDetailModal({ detail, onClose }) {
  useEffect(() => {
    if (!detail) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [detail, onClose])

  if (!detail) return null

  return (
    <div className="text-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="text-detail-modal" role="dialog" aria-modal="true" aria-labelledby="text-detail-title">
        <header>
          <h2 id="text-detail-title">{detail.title}详情</h2>
          <button type="button" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <div className="text-detail-content">{detail.content}</div>
        <button type="button" className="text-detail-close" onClick={onClose}>关闭</button>
      </section>
    </div>
  )
}
