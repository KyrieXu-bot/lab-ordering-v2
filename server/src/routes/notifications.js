const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const afterId = Math.max(0, Number.parseInt(req.query.after_id, 10) || 0);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 30));
    const params = [req.user.user_id];
    const afterSql = afterId ? 'AND n.notification_id > ?' : '';
    if (afterId) params.push(afterId);
    params.push(limit);
    const [items] = await pool.query(
      `SELECT n.notification_id, n.notification_type, n.request_id,
              n.title, n.message, n.read_at, n.created_at
       FROM ordering_notifications n
       WHERE n.recipient_user_id = ? ${afterSql}
       ORDER BY n.notification_id ${afterId ? 'ASC' : 'DESC'}
       LIMIT ?`,
      params
    );
    const [[unreadRow]] = await pool.query(
      `SELECT COUNT(*) AS unread_count
       FROM ordering_notifications
       WHERE recipient_user_id = ? AND read_at IS NULL`,
      [req.user.user_id]
    );
    const latestId = items.reduce((max, item) => Math.max(max, Number(item.notification_id)), afterId);
    res.json({ items, unread_count: Number(unreadRow?.unread_count || 0), latest_id: latestId });
  } catch (error) { next(error); }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE ordering_notifications SET read_at = CURRENT_TIMESTAMP(3)
       WHERE recipient_user_id = ? AND read_at IS NULL`,
      [req.user.user_id]
    );
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    const notificationId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ message: '通知编号不正确' });
    }
    const [result] = await pool.query(
      `UPDATE ordering_notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP(3))
       WHERE notification_id = ? AND recipient_user_id = ?`,
      [notificationId, req.user.user_id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: '通知不存在' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

module.exports = { router };
