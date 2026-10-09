const REVIEWER_USER_ID = 'JC0089';

const REQUEST_TYPE_LABELS = {
  normal: '普通申请',
  modification: '修改申请',
  additional_test: '加测申请'
};

function requestNumber(requestId) {
  return `SQ${String(requestId).padStart(8, '0')}`;
}

function submittedNotification({ requestId, requestType = 'normal', actorName = '业务员', resubmitted = false }) {
  const typeLabel = REQUEST_TYPE_LABELS[requestType] || '委托申请';
  return {
    recipientUserId: REVIEWER_USER_ID,
    notificationType: resubmitted ? 'request_resubmitted' : 'request_submitted',
    requestId,
    title: resubmitted ? '申请已重新提交' : `新${typeLabel}待审批`,
    message: `${actorName || '业务员'}${resubmitted ? '重新提交了' : '提交了'}${typeLabel} ${requestNumber(requestId)}`
  };
}

function withdrawnNotification({ requestId, requestType = 'normal', actorName = '业务员' }) {
  const typeLabel = REQUEST_TYPE_LABELS[requestType] || '委托申请';
  return {
    recipientUserId: REVIEWER_USER_ID,
    notificationType: 'request_withdrawn',
    requestId,
    title: '申请已撤回',
    message: `${actorName || '业务员'}撤回了${typeLabel} ${requestNumber(requestId)}`
  };
}

function applicantNotification({ applicantUserId, requestId, eventType, orderNum = '', note = '' }) {
  const requestNo = requestNumber(requestId);
  if (eventType === 'approved') {
    return {
      recipientUserId: applicantUserId,
      notificationType: 'request_approved',
      requestId,
      title: '申请审批通过',
      message: `开单员已审批通过申请 ${requestNo}${orderNum ? `，关联单号 ${orderNum}` : ''}`
    };
  }
  if (eventType === 'returned') {
    const reason = String(note || '').trim();
    return {
      recipientUserId: applicantUserId,
      notificationType: 'request_returned',
      requestId,
      title: '申请已退回',
      message: `开单员退回了申请 ${requestNo}${reason ? `：${reason}` : ''}`.slice(0, 500)
    };
  }
  return {
    recipientUserId: applicantUserId,
    notificationType: 'request_opened',
    requestId,
    title: '开单已完成',
    message: `开单员已完成申请 ${requestNo} 的正式开单${orderNum ? `，正式单号 ${orderNum}` : ''}`
  };
}

async function createNotification(conn, notification, actorUserId = null) {
  if (!notification?.recipientUserId) return;
  await conn.query(
    `INSERT INTO ordering_notifications
      (recipient_user_id, actor_user_id, notification_type, request_id, title, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      notification.recipientUserId,
      actorUserId || null,
      notification.notificationType,
      notification.requestId || null,
      String(notification.title || '').slice(0, 80),
      String(notification.message || '').slice(0, 500)
    ]
  );
}

module.exports = {
  REVIEWER_USER_ID,
  requestNumber,
  submittedNotification,
  withdrawnNotification,
  applicantNotification,
  createNotification
};
