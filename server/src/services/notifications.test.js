const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REVIEWER_USER_ID,
  submittedNotification,
  withdrawnNotification,
  applicantNotification
} = require('./notifications');

test('新申请固定通知唯一开单员 JC0089', () => {
  const notification = submittedNotification({ requestId: 23, requestType: 'additional_test', actorName: '业务员甲' });
  assert.equal(notification.recipientUserId, REVIEWER_USER_ID);
  assert.equal(notification.recipientUserId, 'JC0089');
  assert.match(notification.message, /业务员甲提交了加测申请 SQ00000023/);
});

test('审批、退回和开单通知只使用开单员称谓', () => {
  const notifications = [
    applicantNotification({ applicantUserId: 'YW001', requestId: 8, eventType: 'approved', orderNum: 'JC26090001' }),
    applicantNotification({ applicantUserId: 'YW001', requestId: 8, eventType: 'returned', note: '请补充附件' }),
    applicantNotification({ applicantUserId: 'YW001', requestId: 8, eventType: 'opened', orderNum: 'JC26090001' })
  ];
  assert.ok(notifications.every((item) => item.recipientUserId === 'YW001'));
  assert.ok(notifications.every((item) => item.message.includes('开单员')));
  assert.match(notifications[1].message, /请补充附件/);
});

test('撤回消息会同步给开单员，避免保留过期提醒', () => {
  const notification = withdrawnNotification({ requestId: 9, requestType: 'modification', actorName: '业务员乙' });
  assert.equal(notification.recipientUserId, 'JC0089');
  assert.match(notification.message, /撤回了修改申请/);
});
