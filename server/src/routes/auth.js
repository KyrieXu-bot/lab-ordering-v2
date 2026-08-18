const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth, isReviewer, isSales } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: '请输入账号和密码' });

    const [rows] = await pool.query(
      `SELECT u.user_id, u.account, u.password_hash, u.name, u.is_active,
              GROUP_CONCAT(DISTINCT r.role_code ORDER BY r.role_code) AS role_codes
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.user_id
       LEFT JOIN roles r ON r.role_id = ur.role_id
       WHERE u.account = ?
       GROUP BY u.user_id, u.account, u.password_hash, u.name, u.is_active
       LIMIT 1`,
      [username]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: '账号或密码错误' });
    }
    if (!user.is_active) return res.status(403).json({ message: '账号已被停用' });

    const roles = user.role_codes ? user.role_codes.split(',') : [];
    const identity = { user_id: user.user_id, roles, role: roles[0] || 'member' };
    if (!isReviewer(identity) && !isSales(identity)) {
      return res.status(403).json({ message: '当前账号没有开单系统使用权限' });
    }

    const reviewer = isReviewer(identity);
    const token = jwt.sign(
      { sub: user.user_id, user_id: user.user_id, username: user.account, name: user.name, roles, role: roles[0] || 'member', reviewer },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );
    res.json({ token, user: { user_id: user.user_id, username: user.account, name: user.name, roles, reviewer } });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = { router };
