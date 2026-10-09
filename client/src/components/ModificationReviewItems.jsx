import React from 'react';

const fields = [
  ['sample_name', '样品名称'], ['material', '材质'], ['sample_type', '样品类型'],
  ['original_no', '样品原号'], ['test_item', '检测项目'], ['test_method', '检测标准'],
  ['arrival_mode', '到达方式'], ['sample_arrival_status', '是否到样'], ['quantity', '数量'], ['note', '备注']
];

const normalized = (item = {}) => ({
  ...item,
  sample_name: item.sampleName ?? item.sample_name,
  sample_type: String(item.sampleType ?? item.sample_type) === '5'
    ? (item.sampleTypeCustom || '其他')
    : ({ 1: '板材', 2: '棒材', 3: '粉末', 4: '液体' }[item.sampleType ?? item.sample_type]
      || item.sampleType || item.sample_type),
  arrival_mode: item.arrival_mode === 'mail' ? 'delivery' : item.arrival_mode
});

const display = (field, value) => field === 'arrival_mode'
  ? ({ on_site: '现场到达', delivery: '寄样' }[value] || '—')
  : field === 'sample_arrival_status'
    ? ({ arrived: '是', not_arrived: '否' }[value] || '—')
    : String(value ?? '') || '—';

export function BusinessModificationItems({ items, baseline }) {
  return <div className="test-item-table-wrapper business-snapshot-scroll">
    <table className="business-snapshot-table">
      <thead><tr><th>序号</th>{fields.map(([field, label]) => <th key={field}>{label}</th>)}</tr></thead>
      <tbody>{items.map((raw, index) => {
        const item = normalized(raw);
        const previous = normalized(baseline[index]);
        return <tr key={index} className={raw.cancelled_in_additional_test ? 'cancelled-test-item-row' : ''}>
          <td>{index + 1}</td>
          {fields.map(([field]) => {
            const changed = String(item[field] ?? '') !== String(previous[field] ?? '');
            return <td key={field} className={changed ? 'modification-changed-value' : ''}>
              {display(field, item[field])}
              {changed && <small className="modification-before">原：{display(field, previous[field])}</small>}
            </td>;
          })}
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
