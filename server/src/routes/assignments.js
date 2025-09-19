const express = require('express');
const pool = require('../db');
const router = express.Router();

router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { test_item_id, assigned_to, supervisor_id = null, created_by, note = null } = req.body;
    await conn.beginTransaction();
    await conn.query(`UPDATE assignments SET is_active = 0 WHERE test_item_id = ? AND is_active = 1`, [test_item_id]);
    await conn.query(
      `INSERT INTO assignments (test_item_id, assigned_to, supervisor_id, is_active, note, created_by)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [test_item_id, assigned_to, supervisor_id, note, created_by]
    );
    await conn.query(`UPDATE test_items SET current_assignee = ?, status = 'assigned' WHERE test_item_id = ?`,
      [assigned_to, test_item_id]);
    await conn.commit();
    res.status(201).json({ ok: true });
  } catch (e) {
    await (conn.rollback().catch(()=>{}));
    next(e);
  } finally {
    conn.release();
  }
});

module.exports = { router };
