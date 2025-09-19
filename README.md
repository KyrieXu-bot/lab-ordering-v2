# 开单系统 2.0（React + Express + MySQL）
只包含开单/检测流转。客户库/付款方/委托方在管理系统维护，本系统仅只读引用。

## 目录
- db/schema_v2.sql — 建表脚本（v2，订单/用户均为字符串主键）
- server/ — Express + mysql2 API
- client/ — Vite + React 前端

## 使用
1) 初始化数据库：
  mysql -u root -p -e "CREATE DATABASE lab_v2 DEFAULT CHARACTER SET utf8mb4"
  mysql -u root -p lab_v2 < db/schema_v2.sql

2) 启动后端：
  cd server && cp .env.example .env && npm install && npm run dev

3) 启动前端：
  cd client && npm install && npm run dev  # http://localhost:5173
