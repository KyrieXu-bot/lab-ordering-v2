const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}_${safe}`);
  }
});
const upload = multer({ storage });

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { category, order_id = null, test_item_id = null, sample_id = null, uploaded_by } = req.body;
    const filename = req.file.filename;
    const filepath = `/uploads/${filename}`;
    await pool.query(
      `INSERT INTO project_files (category, filename, filepath, order_id, test_item_id, sample_id, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category, filename, filepath, order_id || null, test_item_id || null, sample_id || null, uploaded_by]
    );
    res.status(201).json({ filename, filepath });
  } catch (e) { next(e); }
});

router.get('/by-entity', async (req, res, next) => {
  try {
    const { order_id, test_item_id, sample_id } = req.query;
    let where = ' WHERE 1=1 '; const params = [];
    if (order_id) { where += ' AND order_id = ?'; params.push(order_id); }
    if (test_item_id) { where += ' AND test_item_id = ?'; params.push(test_item_id); }
    if (sample_id) { where += ' AND sample_id = ?'; params.push(sample_id); }
    const [rows] = await pool.query(`SELECT * FROM project_files ${where} ORDER BY file_id DESC`, params);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = { router };
