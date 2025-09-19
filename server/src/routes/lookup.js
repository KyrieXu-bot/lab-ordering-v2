const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/customers', async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    let where = ' WHERE is_active = 1 '; const params = [];
    if (q) { where += ' AND (customer_name LIKE ? OR tax_id LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    const [rows] = await pool.query(`SELECT customer_id, customer_name, tax_id FROM customers ${where} ORDER BY customer_name LIMIT ?`,
      [...params, Number(limit)]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/payers', async (req, res, next) => {
  try {
    const { customer_id, q, limit = 20 } = req.query;
    let where = ' WHERE is_active = 1 '; const params = [];
    if (customer_id) { where += ' AND customer_id = ?'; params.push(customer_id); }
    if (q) { where += ' AND (contact_name LIKE ? OR contact_phone LIKE ?)'; params.push(`%${q}%`,`%${q}%`); }
    const [rows] = await pool.query(
      `SELECT payer_id, customer_id, contact_name, payment_term_days, discount_rate FROM payers ${where} ORDER BY payer_id DESC LIMIT ?`,
      [...params, Number(limit)]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/commissioners', async (req, res, next) => {
  try {
    const { payer_id, q, limit = 20 } = req.query;
    let where = ' WHERE is_active = 1 '; const params = [];
    if (payer_id) { where += ' AND payer_id = ?'; params.push(payer_id); }
    if (q) { where += ' AND (contact_name LIKE ? OR email LIKE ? OR contact_phone LIKE ?)'; params.push(`%${q}%`,`%${q}%`,`%${q}%`); }
    const [rows] = await pool.query(
      `SELECT commissioner_id, payer_id, contact_name, email FROM commissioners ${where} ORDER BY commissioner_id DESC LIMIT ?`,
      [...params, Number(limit)]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = { router };
