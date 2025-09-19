const express = require('express');
const pool = require('../db');
const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const {
      order_id, test_item_id = null, sample_code = null, description = null,
      quantity_received = null, residue_qty = null, handling_method = null,
      return_required = 0, return_tracking_no = null, return_confirmed = 0
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO samples
       (order_id, test_item_id, sample_code, description, quantity_received, residue_qty, handling_method,
        return_required, return_tracking_no, return_confirmed)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [order_id, test_item_id, sample_code, description, quantity_received, residue_qty, handling_method,
       return_required, return_tracking_no, return_confirmed]
    );
    res.status(201).json({ sample_id: result.insertId });
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const fields = [
      'description','quantity_received','residue_qty','handling_method',
      'return_required','return_tracking_no','return_confirmed'
    ];
    const sets = []; const vals = [];
    for (const f of fields) if (req.body[f] !== undefined) { sets.push(`${f}=?`); vals.push(req.body[f]); }
    if (!sets.length) return res.json({ ok: true });
    vals.push(id);
    await pool.query(`UPDATE samples SET ${sets.join(', ')} WHERE sample_id = ?`, vals);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/by-order/:order_id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM samples WHERE order_id = ? ORDER BY sample_id`, [req.params.order_id]);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = { router };
