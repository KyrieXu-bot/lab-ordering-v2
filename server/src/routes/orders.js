const express = require('express');
const pool = require('../db');
const { nextOrderId } = require('../utils/orderId');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { q, customer_id, created_from, created_to, limit = 50, offset = 0 } = req.query;
    let where = ' WHERE 1=1 '; const params = [];
    if (q) { where += ' AND (o.order_id LIKE ? OR c.customer_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (customer_id) { where += ' AND o.customer_id = ?'; params.push(customer_id); }
    if (created_from) { where += ' AND o.created_at >= ?'; params.push(created_from); }
    if (created_to) { where += ' AND o.created_at <= ?'; params.push(created_to); }
    const [rows] = await pool.query(
      `SELECT o.*, c.customer_name, p.contact_name AS payer_contact, m.contact_name AS commissioner_contact
       FROM orders o
       JOIN customers c ON c.customer_id = o.customer_id
       LEFT JOIN payers p ON p.payer_id = o.payer_id
       LEFT JOIN commissioners m ON m.commissioner_id = o.commissioner_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`, [...params, Number(limit), Number(offset)]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const {
      customer_id, payer_id = null, commissioner_id = null, created_by,
      is_internal = 0,
      agreement_note = null, note = null, prefix = 'JC', test_items = []
    } = req.body;

    await conn.beginTransaction();
    const order_id = await nextOrderId(prefix);

    await conn.query(
      `INSERT INTO orders (order_id, customer_id, payer_id, commissioner_id, created_by, is_internal, agreement_note, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_id, customer_id, payer_id, commissioner_id, created_by, is_internal, agreement_note, note]
    );

    for (const ti of test_items) {
      const {
        price_id = null, category_name, detail_name, test_code = null, standard_code = null,
        department_id = null, group_id = null, quantity = 1, unit_price = null,
        discount_rate = null, final_unit_price = null, line_total = null,
        is_add_on = 0, is_outsourced = 0, seq_no = null
      } = ti;
      await conn.query(
        `INSERT INTO test_items
         (order_id, price_id, category_name, detail_name, test_code, standard_code, department_id, group_id,
          quantity, unit_price, discount_rate, final_unit_price, line_total, is_add_on, is_outsourced, seq_no,
          sample_name, material, sample_type, original_no, sample_preparation, note,
          arrival_mode, sample_arrival_status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [order_id, price_id, category_name, detail_name, test_code, standard_code, department_id, group_id,
         quantity, unit_price, discount_rate, final_unit_price, line_total, is_add_on, is_outsourced, seq_no,
         ti.sample_name || null, ti.material || null, ti.sample_type || null, ti.original_no || null, ti.sample_preparation || null, ti.note || null,
         (ti.arrival_mode === 'mail' ? 'delivery' : (ti.arrival_mode || null)),
         (ti.sample_arrival_status === 'not_arrived' || ti.sample_arrival_status === 'arrived') ? ti.sample_arrival_status : 'arrived']
      );
    }

    await conn.commit();
    res.status(201).json({ order_id });
  } catch (e) {
    await (conn.rollback().catch(()=>{}));
    next(e);
  } finally {
    conn.release();
  }
});

router.get('/:order_id', async (req, res, next) => {
  try {
    const { order_id } = req.params;
    const [[order]] = await pool.query(
      `SELECT o.*, c.customer_name
       FROM orders o JOIN customers c ON c.customer_id = o.customer_id
       WHERE o.order_id = ?`, [order_id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const [items] = await pool.query(
      `SELECT ti.*, g.group_code, g.group_name
       FROM test_items ti
       LEFT JOIN lab_groups g ON g.group_id = ti.group_id
       WHERE ti.order_id = ?
       ORDER BY ti.test_item_id`, [order_id]
    );
    const [samples] = await pool.query(
      `SELECT * FROM samples WHERE order_id = ? ORDER BY sample_id`, [order_id]
    );
    res.json({ order, items, samples });
  } catch (e) { next(e); }
});

router.patch('/:order_id/arrival', async (req, res, next) => {
  try {
    const { order_id } = req.params;
    const { sample_arrival_status } = req.body;
    await pool.query(`UPDATE orders SET sample_arrival_status = ? WHERE order_id = ?`, [sample_arrival_status, order_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = { router };
