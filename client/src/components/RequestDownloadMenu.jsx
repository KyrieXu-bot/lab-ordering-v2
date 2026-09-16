import React, { useEffect, useRef, useState } from 'react'
import { downloadOrderRequestAttachment, downloadOrderRequestFile, downloadOrderRequestFlow } from '../api/api'

function saveResponse(response, fallbackName, mimeType) {
  const url = URL.createObjectURL(new Blob([response.data], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = responseFilename(response) || fallbackName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function responseFilename(response) {
  const disposition = response?.headers?.['content-disposition'] || ''
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (utf8Name) {
    try { return decodeURIComponent(utf8Name) } catch (_) { return utf8Name }
  }
  return disposition.match(/filename="?([^";]+)"?/i)?.[1] || ''
}

function flowFallbackName(flowRow) {
  const orderId = flowRow?.approved_order_id || '委托单'
  return `${orderId}-流转单.docx`
}

export default function RequestDownloadMenu({ pdfRow, flowRow, requirementRow, compact = false }) {
  const [busy, setBusy] = useState('')
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const hasPdf = Boolean(pdfRow?.attachment_file_id)
  const hasFlow = Boolean(flowRow?.order_opened && flowRow?.approved_order_id)
  const hasRequirement = Boolean(requirementRow?.requirement_file_id)

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  async function run(kind, action) {
    if (busy) return
    setOpen(false)
    setBusy(kind)
    try { await action() }
    catch (error) { alert(error.response?.data?.message || `${kind}下载失败`) }
    finally { setBusy('') }
  }

  return (
    <span ref={menuRef} className={`request-download-menu${compact ? ' is-compact' : ''}${open ? ' is-open' : ''}`}>
      <button type="button" className="request-download-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>下载 <span aria-hidden="true">{open ? '▴' : '▾'}</span></button>
      <span className="request-download-options" role="menu">
        <button type="button" role="menuitem" disabled={!hasPdf || Boolean(busy)} onClick={() => run('PDF', async () => {
          const response = await downloadOrderRequestAttachment(pdfRow.request_id)
          saveResponse(response, pdfRow.attachment_filename || `${pdfRow.request_no || '委托单'}.pdf`, 'application/pdf')
        })}>{busy === 'PDF' ? '下载中…' : '下载PDF'}</button>
        <button type="button" role="menuitem" disabled={!hasFlow || Boolean(busy)} onClick={() => run('流转单', async () => {
          const response = await downloadOrderRequestFlow(flowRow.request_id)
          saveResponse(response, flowFallbackName(flowRow), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        })}>{busy === '流转单' ? '下载中…' : '下载流转单'}</button>
        <button type="button" role="menuitem" disabled={!hasRequirement || Boolean(busy)} title={hasRequirement ? '' : '申请时未上传测试需求单'} onClick={() => run('需求单', async () => {
          const response = await downloadOrderRequestFile(requirementRow.request_id, requirementRow.requirement_file_id)
          saveResponse(response, requirementRow.requirement_filename || `${requirementRow.request_no || '申请'}-测试需求单`, 'application/octet-stream')
        })}>{busy === '需求单' ? '下载中…' : '下载需求单'}</button>
      </span>
    </span>
  )
}
