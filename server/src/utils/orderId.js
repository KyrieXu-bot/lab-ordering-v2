const pool = require('../db');

async function nextOrderId(prefix = 'JC') {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const now = new Date();
    const yy = String(now.getUTCFullYear()).slice(-2);
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const yymm = `${yy}${mm}`;

    const [rows] = await conn.query(
      'SELECT last_seq FROM order_id_counters WHERE prefix = ? AND yymm = ? FOR UPDATE',
      [prefix, yymm]
    );
    let seq = 0;
    if (rows.length === 0) {
      await conn.query('INSERT INTO order_id_counters (prefix, yymm, last_seq) VALUES (?, ?, ?)', [prefix, yymm, 0]);
    } else {
      seq = rows[0].last_seq;
    }
    const newSeq = seq + 1;
    await conn.query('UPDATE order_id_counters SET last_seq = ? WHERE prefix = ? AND yymm = ?', [newSeq, prefix, yymm]);
    await conn.commit();
    return `${prefix}${yymm}${String(newSeq).padStart(3,'0')}`;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { nextOrderId };
