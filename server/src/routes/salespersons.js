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

// 获取组长信息（根据group_id）
router.get('/leaders', async (req, res, next) => {
  try {
    const { group_id } = req.query;
    if (!group_id) return res.status(400).json({ message: 'group_id required' });
    
    const [rows] = await pool.query(
      `SELECT u.user_id, u.account, u.name, u.group_id, u.group_role
       FROM users u
       WHERE u.is_active = 1 AND u.group_id = ? AND u.group_role = 'leader'
       ORDER BY u.user_id`,
      [group_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No leader found for this group' });
    }
    
    res.json(rows);
  } catch (e) { next(e); }
});

// 获取室主任信息（根据department_id）
router.get('/department-leaders', async (req, res, next) => {
  try {
    const { department_id } = req.query;
    if (!department_id) return res.status(400).json({ message: 'department_id required' });
    
    const [rows] = await pool.query(
      `SELECT u.user_id, u.account, u.name, u.group_id, u.group_role, u.department_id
       FROM users u
       WHERE u.is_active = 1 AND u.department_id = ? AND u.group_role = 'leader'
       ORDER BY u.user_id`,
      [department_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No department leader found' });
    }
    
    res.json(rows);
  } catch (e) { next(e); }
});

// 根据客户ID获取对应的业务员信息
router.get('/by-customer', async (req, res, next) => {
  try {
    const { customer_id, payer_id } = req.query;
    if (!customer_id) return res.status(400).json({ message: 'customer_id required' });
    
    let query, params;
    
    if (payer_id) {
      // 如果指定了付款方ID，优先使用该付款方的业务员
      query = `SELECT u.user_id, u.account, u.name, u.email, u.phone
               FROM payers p
               JOIN users u ON u.user_id = p.owner_user_id
               WHERE p.payer_id = ? AND u.is_active = 1`;
      params = [payer_id];
    } else {
      // 否则从客户的所有付款方中获取第一个有业务员的
      query = `SELECT u.user_id, u.account, u.name, u.email, u.phone
               FROM payers p
               JOIN users u ON u.user_id = p.owner_user_id
               WHERE p.customer_id = ? AND u.is_active = 1
               ORDER BY p.payer_id LIMIT 1`;
      params = [customer_id];
    }
    
    const [[row]] = await pool.query(query, params);
    
    if (!row) {
      return res.status(404).json({ message: 'No salesperson found for this customer' });
    }
    
    res.json({
      user_id: row.user_id,
      account: row.account,
      name: row.name,
      email: row.email,
      phone: row.phone
    });
  } catch (e) { next(e); }
});

module.exports = {router};
