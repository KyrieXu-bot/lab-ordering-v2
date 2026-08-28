// server/src/db.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jitri2',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  // MySQL 会话使用北京时间；按 +08:00 解析 DATETIME，避免返回前端后再次多加 8 小时。
  timezone: process.env.DB_TIMEZONE || '+08:00',
});
module.exports = pool ;
