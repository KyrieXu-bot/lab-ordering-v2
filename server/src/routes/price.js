const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { q, category, group_id, limit = 50 } = req.query;
    let where = ' WHERE is_active = 1 '; const params = [];
    if (q) { where += ' AND (category_name LIKE ? OR detail_name LIKE ? OR test_code LIKE ?)';
      params.push(`%${q}%`,`%${q}%`,`%${q}%`); }
    if (category) { where += ' AND category_name = ?'; params.push(category); }
    if (group_id) { where += ' AND group_id = ?'; params.push(group_id); }
    const [rows] = await pool.query(
      `SELECT * FROM price ${where} ORDER BY category_name, detail_name LIMIT ?`, [...params, Number(limit)]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = { router };
