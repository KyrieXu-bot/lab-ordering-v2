const express = require('express');
const pool = require('../db');
const router = express.Router();

// 列出业务员（优先按角色= sales；否则按工号/账号前缀 YW）
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.account, u.name
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.user_id
       LEFT JOIN roles r ON r.role_id = ur.role_id
       WHERE u.is_active = 1 AND (r.role_code = 'sales' OR u.user_id LIKE 'YW%')
       GROUP BY u.user_id, u.account, u.name
       ORDER BY u.user_id`
    );
    res.json(rows.map(r => ({ account: r.account, name: r.name, user_id: r.user_id })));
  } catch (e) { next(e); }
});

// 获取业务员联系方式
router.get('/contact', async (req, res, next) => {
  try {
    const { account } = req.query;
    if (!account) return res.status(400).json({ message: 'account required' });
    const [[u]] = await pool.query(`SELECT email AS user_email, phone AS user_phone_num FROM users WHERE account = ?`, [account]);
    if (!u) return res.status(404).json({ message: 'not found' });
    res.json(u);
  } catch (e) { next(e); }
});

module.exports = {router};
