const express = require('express');
const pool = require('../db');
const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const {
      order_id, price_id = null, category_name, detail_name, test_code = null, standard_code = null,
      department_id = null, group_id = null, quantity = 1, unit_price = null,
      discount_rate = null, final_unit_price = null, line_total = null,
      is_add_on = 0, is_outsourced = 0, seq_no = null
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO test_items
       (order_id, price_id, category_name, detail_name, test_code, standard_code, department_id, group_id,
        quantity, unit_price, discount_rate, final_unit_price, line_total, is_add_on, is_outsourced, seq_no)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [order_id, price_id, category_name, detail_name, test_code, standard_code, department_id, group_id,
       quantity, unit_price, discount_rate, final_unit_price, line_total, is_add_on, is_outsourced, seq_no]
    );
    res.status(201).json({ test_item_id: result.insertId });
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const fields = [
      'quantity','unit_price','discount_rate','final_unit_price','line_total',
      'machine_hours','work_hours','status','current_assignee','seq_no','is_add_on','is_outsourced'
    ];
    const sets = []; const vals = [];
    for (const f of fields) if (req.body[f] !== undefined) { sets.push(`${f}=?`); vals.push(req.body[f]); }
    if (!sets.length) return res.json({ ok: true });
    vals.push(id);
    await pool.query(`UPDATE test_items SET ${sets.join(', ')} WHERE test_item_id = ?`, vals);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/by-order/:order_id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ti.*, g.group_code, g.group_name
       FROM test_items ti LEFT JOIN lab_groups g ON g.group_id = ti.group_id
       WHERE ti.order_id = ? ORDER BY ti.test_item_id`, [req.params.order_id]);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = { router };
