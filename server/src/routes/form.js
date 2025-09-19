const express = require('express');
const pool  = require('../db');
const router = express.Router();

// 委托方选择列表：commissioners + customers
router.get('/customers', async (req, res, next) => {
  try {
    const { customerNameTerm = '', contactNameTerm = '', contactPhoneTerm = '' } = req.query;
    const [rows] = await pool.query(
      `SELECT m.commissioner_id,
              c.customer_id,
              c.customer_name,
              c.address AS customer_address,
              m.contact_name,
              m.contact_phone AS contact_phone_num,
              m.email AS contact_email
       FROM commissioners m
       JOIN payers p ON p.payer_id = m.payer_id
       JOIN customers c ON c.customer_id = p.customer_id
       WHERE c.is_active = 1 AND m.is_active = 1
         AND (c.customer_name LIKE ?)
         AND (m.contact_name LIKE ? OR ? = '')
         AND (m.contact_phone LIKE ? OR ? = '')
       ORDER BY m.commissioner_id DESC
       LIMIT 200`,
      [`%${customerNameTerm}%`, `%${contactNameTerm}%`, contactNameTerm, `%${contactPhoneTerm}%`, contactPhoneTerm]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// 付款方选择列表：payers + customers
router.get('/payers', async (req, res, next) => {
  try {
    const { payerNameTerm = '', payerContactNameTerm = '', payerContactPhoneTerm = '' } = req.query;
    const [rows] = await pool.query(
      `SELECT p.payer_id AS payment_id,
              c.customer_id,
              c.customer_name AS payer_name,
              c.address AS payer_address,
              p.contact_name AS payer_contact_name,
              p.contact_phone AS payer_contact_phone_num,
              c.phone AS payer_phone_num,
              c.bank_name, c.tax_id AS tax_number, c.bank_account
       FROM payers p
       JOIN customers c ON c.customer_id = p.customer_id
       WHERE p.is_active = 1 AND c.is_active = 1
         AND (c.customer_name LIKE ?)
         AND (p.contact_name LIKE ? OR ? = '')
         AND (p.contact_phone LIKE ? OR ? = '')
       ORDER BY p.payer_id DESC
       LIMIT 200`,
      [`%${payerNameTerm}%`, `%${payerContactNameTerm}%`, payerContactNameTerm, `%${payerContactPhoneTerm}%`, payerContactPhoneTerm]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// 选择委托方后，预填付款方（同客户）
router.get('/prefill-payers', async (req, res, next) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) return res.json([]);
    const [rows] = await pool.query(
      `SELECT p.payer_id AS payment_id,
              c.customer_id,
              c.customer_name AS payer_name,
              c.address AS payer_address,
              p.contact_name AS payer_contact_name,
              p.contact_phone AS payer_contact_phone_num,
              c.bank_name, c.tax_id AS tax_number, c.bank_account
       FROM payers p
       JOIN customers c ON c.customer_id = p.customer_id
       WHERE p.is_active = 1 AND c.is_active = 1 AND p.customer_id = ?
       ORDER BY p.payer_id DESC`, [customer_id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// 价目检索（兼容 test_item_name / test_condition 字段）
router.get('/prices', async (req, res, next) => {
  try {
    const { testItem = '', testCondition = '', testCode = '' } = req.query;
    const [rows] = await pool.query(
      `SELECT price_id,
              test_code,
              category_name AS test_item_name,
              detail_name   AS test_condition,
              standard_code AS test_standard,
              unit_price,
              department_id,
              group_id
       FROM price
       WHERE is_active = 1
         AND (category_name LIKE ?)
         AND (detail_name LIKE ?)
         AND (IFNULL(test_code,'') LIKE ?)
       ORDER BY category_name, detail_name
       LIMIT 300`,
      [`%${testItem}%`, `%${testCondition}%`, `%${testCode}%`]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = { router };
