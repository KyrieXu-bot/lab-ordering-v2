-- 为customers表添加owner_user_id字段
ALTER TABLE customers 
ADD COLUMN owner_user_id VARCHAR(20) NULL COMMENT '业务绑定（负责人 users.user_id 工号）' AFTER grade,
ADD CONSTRAINT fk_customers_owner FOREIGN KEY (owner_user_id)
    REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
ADD INDEX idx_customers_owner (owner_user_id);
