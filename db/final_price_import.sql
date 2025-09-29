-- ===========================================
-- 开单v2.0 price表完整导入脚本
-- 包含：数据清理 + 重置AUTO_INCREMENT + 数据导入
-- ===========================================

-- 第一步：禁用外键检查（如果有外键约束）
SET FOREIGN_KEY_CHECKS = 0;

-- 第二步：清空现有数据
DELETE FROM `price`;

-- 第三步：重置AUTO_INCREMENT为1
ALTER TABLE `price` AUTO_INCREMENT = 1;

-- 第四步：重新启用外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 第五步：导入新数据
-- 数据将从price_id=1开始自增

INSERT INTO `price` (`category_name`, `detail_name`, `test_code`, `standard_code`, `department_id`, `group_id`, `unit_price`, `is_outsourced`, `is_active`, `note`) VALUES

