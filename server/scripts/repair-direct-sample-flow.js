const path = require('path');
const fs = require('fs').promises;
const pool = require('../src/db');
const { addSampleFlowQrToPdf, createSampleFlowToken } = require('../src/services/sampleFlowQr');

async function repairDirectSampleFlows() {
  const conn = await pool.getConnection();
  const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
  try {
    const [rows] = await conn.query(
      `SELECT r.request_id, r.approved_order_id, r.attachment_file_id, f.stored_path
       FROM order_requests r
       LEFT JOIN order_request_files f ON f.file_id = r.attachment_file_id
       WHERE r.request_type = 'normal' AND r.status = 'approved'
         AND r.approved_order_id IS NOT NULL AND r.sample_flow_token IS NULL
       ORDER BY r.request_id`
    );

    for (const row of rows) {
      const token = createSampleFlowToken();
      const absolutePath = row.stored_path ? path.resolve(uploadsRoot, row.stored_path) : null;
      const tempPath = absolutePath ? `${absolutePath}.sample-flow-fix.tmp` : null;
      const backupPath = absolutePath ? `${absolutePath}.sample-flow-fix.bak` : null;
      let pdfSize = null;

      if (absolutePath) {
        if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
          throw new Error(`附件路径越界：${row.stored_path}`);
        }
        await fs.copyFile(absolutePath, tempPath);
        await addSampleFlowQrToPdf(tempPath, token);
        pdfSize = (await fs.stat(tempPath)).size;
      }

      await conn.beginTransaction();
      try {
        const [updateResult] = await conn.query(
          `UPDATE order_requests SET sample_flow_token = ?, version = version + 1
           WHERE request_id = ? AND sample_flow_token IS NULL`,
          [token, row.request_id]
        );
        if (updateResult.affectedRows !== 1) throw new Error(`申请 ${row.request_id} 的 token 已被其他操作更新`);
        if (row.attachment_file_id && pdfSize != null) {
          await conn.query('UPDATE order_request_files SET file_size = ? WHERE file_id = ?', [pdfSize, row.attachment_file_id]);
        }
        if (absolutePath) {
          await fs.rename(absolutePath, backupPath);
          await fs.rename(tempPath, absolutePath);
        }
        await conn.commit();
        if (backupPath) await fs.rm(backupPath, { force: true });
        console.log(JSON.stringify({
          order_id: row.approved_order_id,
          token,
          pdf_updated: Boolean(absolutePath),
          pdf_size: pdfSize,
        }));
      } catch (error) {
        await conn.rollback();
        if (backupPath) {
          await fs.rm(absolutePath, { force: true }).catch(() => {});
          await fs.rename(backupPath, absolutePath).catch(() => {});
        }
        if (tempPath) await fs.rm(tempPath, { force: true }).catch(() => {});
        throw error;
      }
    }

    return rows.length;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  repairDirectSampleFlows()
    .then(async (count) => {
      console.log(`已修复 ${count} 张直接开单。`);
      await pool.end();
    })
    .catch(async (error) => {
      console.error(error);
      await pool.end().catch(() => {});
      process.exitCode = 1;
    });
}

module.exports = { repairDirectSampleFlows };
