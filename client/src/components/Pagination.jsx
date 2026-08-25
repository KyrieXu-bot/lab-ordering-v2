import React from 'react'

export default function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null

  const first = Math.max(1, Math.min(page - 2, totalPages - 4))
  const last = Math.min(totalPages, first + 4)
  const pages = []
  for (let value = first; value <= last; value += 1) pages.push(value)

  return (
    <nav className="portal-pagination" aria-label="申请列表分页">
      <span className="portal-pagination-summary">第 {page} / {totalPages} 页 · 共 {total} 条</span>
      <div className="portal-pagination-buttons">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>上一页</button>
        {pages.map((value) => (
          <button
            type="button"
            key={value}
            className={value === page ? 'active' : ''}
            aria-current={value === page ? 'page' : undefined}
            onClick={() => onChange(value)}
          >
            {value}
          </button>
        ))}
        <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>下一页</button>
      </div>
    </nav>
  )
}
