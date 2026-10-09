import React from 'react'

export const RETURN_REASON_OPTIONS = [
  '填写项目、代码、报价信息不完整',
  '未注明委外供应商',
  '流转顺序未注明',
  '检测项目信息不完整',
  '未注明现场测试时间',
  '其他'
]

export function resolveReturnReason(choice, otherReason) {
  if (!choice) return ''
  if (choice === '其他') return otherReason.trim()
  return choice
}

export default function ReturnReasonSelector({ value, otherValue, onChange, onOtherChange, className = '' }) {
  function toggleReason(reason, checked) {
    if (!checked) {
      onChange('')
      if (reason === '其他') onOtherChange('')
      return
    }
    if (value === '其他' && reason !== '其他') onOtherChange('')
    onChange(reason)
  }

  return (
    <fieldset className={`return-reason-selector ${className}`.trim()}>
      <legend>驳回原因 <span>*</span></legend>
      <div className="return-reason-options">
        {RETURN_REASON_OPTIONS.map((reason, index) => (
          <label key={reason}>
            <input
              type="checkbox"
              value={reason}
              checked={value === reason}
              onChange={(event) => toggleReason(reason, event.target.checked)}
              aria-label={`${index + 1}. ${reason}`}
            />
            <span>{index + 1}. {reason === '其他' ? '其他（请填写原因）' : reason}</span>
          </label>
        ))}
      </div>
      {value === '其他' && (
        <label className="return-reason-other">
          其他理由
          <input
            type="text"
            value={otherValue}
            onChange={(event) => onOtherChange(event.target.value)}
            maxLength={500}
            placeholder="请输入其他驳回理由"
            autoFocus
          />
        </label>
      )}
    </fieldset>
  )
}
