/*! SET NAMES utf8mb4 */;
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS project_files;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS samples;
DROP TABLE IF EXISTS test_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_id_counters;
DROP TABLE IF EXISTS price;
DROP TABLE IF EXISTS commissioners;
DROP TABLE IF EXISTS payers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS lab_groups;
DROP TABLE IF EXISTS departments;

CREATE TABLE departments (
  department_id   SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '部门ID',
  department_name VARCHAR(80) NOT NULL UNIQUE COMMENT '部门名称（如 力学/显微/物化）',
  is_active       TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门表';

CREATE TABLE lab_groups (
  group_id      SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '实验小组ID',
  group_code    VARCHAR(16) NOT NULL UNIQUE COMMENT '小组编码（L/M/C/其他）',
  group_name    VARCHAR(64) NOT NULL COMMENT '小组名称',
  department_id SMALLINT UNSIGNED NOT NULL COMMENT '所属部门ID',
  is_active     TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_labgroups_dept FOREIGN KEY (department_id) REFERENCES departments(department_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='实验小组（与部门关联）';

CREATE TABLE roles (
  role_id   TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '角色ID',
  role_code VARCHAR(32) NOT NULL UNIQUE COMMENT '角色编码：admin/leader/supervisor/technician/sales/finance 等',
  role_name VARCHAR(64) NOT NULL COMMENT '角色名称（中文）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色字典';

CREATE TABLE users (
  user_id   VARCHAR(20) PRIMARY KEY COMMENT '员工工号（如 LX005/WH012/XW123/YW888）',
  account   VARCHAR(255) NOT NULL UNIQUE COMMENT '登录账号（唯一）',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  name      VARCHAR(100) NOT NULL COMMENT '姓名',
  email     VARCHAR(255) NULL UNIQUE COMMENT '邮箱（可空）',
  phone     VARCHAR(20)  NULL COMMENT '手机号（可空）',
  group_id  SMALLINT UNSIGNED NOT NULL COMMENT '所属小组（唯一归属，FK lab_groups）',
  group_role ENUM('leader','supervisor','member') NOT NULL DEFAULT 'member' COMMENT '组内职能：leader=主任/负责人, supervisor=组长, member=组员',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_users_group FOREIGN KEY (group_id) REFERENCES lab_groups(group_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_users_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表：主键为员工工号；强制一人仅属一个小组';

CREATE TABLE user_roles (
  user_id VARCHAR(20) NOT NULL COMMENT '员工工号',
  role_id TINYINT UNSIGNED NOT NULL COMMENT '角色ID',
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户-角色 关系';

CREATE TABLE customers (
  customer_id     BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '客户ID',
  customer_name   VARCHAR(160) NOT NULL COMMENT '客户名称',
  address         VARCHAR(255) NULL COMMENT '地址',
  phone           VARCHAR(40)  NULL COMMENT '电话（可空）',
  bank_name       VARCHAR(160) NULL COMMENT '开户行信息（可空）',
  tax_id          VARCHAR(40)  NOT NULL UNIQUE COMMENT '税号（唯一）',
  bank_account    VARCHAR(64)  NULL COMMENT '银行账号（可空）',
  province        VARCHAR(64)  NULL COMMENT '区域（省）',
  nature          VARCHAR(64)  NULL COMMENT '性质（企业/高校/科研/个人等）',
  scale           VARCHAR(64)  NULL COMMENT '规模（预留）',
  grade           VARCHAR(32)  NULL COMMENT '客户分级（预留）',
  is_active       TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_customers_name (customer_name),
  INDEX idx_customers_province (province)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户库（税号唯一）';

CREATE TABLE payers (
  payer_id           BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '付款方ID',
  customer_id        BIGINT UNSIGNED NOT NULL COMMENT '关联客户ID（customers）',
  contact_name       VARCHAR(80)  NOT NULL COMMENT '付款人',
  contact_phone      VARCHAR(40)  NULL COMMENT '付款人电话',
  payment_term_days  INT UNSIGNED NULL COMMENT '账期（天）',
  discount_rate      DECIMAL(5,2) NULL COMMENT '折扣（百分比 0~100）',
  owner_user_id      VARCHAR(20)  NULL COMMENT '业务绑定（负责人 users.user_id 工号）',
  is_active          TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_payers_customer FOREIGN KEY (customer_id)
    REFERENCES customers(customer_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_payers_owner FOREIGN KEY (owner_user_id)
    REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_payers_customer (customer_id),
  INDEX idx_payers_contact (contact_name),
  INDEX idx_payers_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='付款方：账期/折扣/业务绑定';

CREATE TABLE commissioners (
  commissioner_id  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '委托方ID',
  payer_id         BIGINT UNSIGNED NOT NULL COMMENT '关联付款方ID（payers）',
  contact_name     VARCHAR(80)  NOT NULL COMMENT '委托人',
  contact_phone    VARCHAR(40)  NULL COMMENT '委托人电话',
  email            VARCHAR(120) NULL COMMENT '邮箱',
  is_active        TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_commissioners_payer FOREIGN KEY (payer_id)
    REFERENCES payers(payer_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_commissioners_payer (payer_id),
  INDEX idx_commissioners_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='委托方：从付款方继承客户名称';

CREATE TABLE price (
  price_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '价格项ID',
  category_name VARCHAR(160) NOT NULL COMMENT '检测大类，如“金属室温拉伸（T）”',
  detail_name   VARCHAR(200) NOT NULL COMMENT '具体检测项目，如“金属抗拉强度/断后伸长率”',
  test_code     VARCHAR(40)  NULL COMMENT '检测代码（用于检索/委外识别，如OS001）',
  standard_code VARCHAR(64)  NULL COMMENT '检测标准编号（如 GB/T ...）',
  department_id SMALLINT UNSIGNED NULL COMMENT '归属部门ID',
  group_id      SMALLINT UNSIGNED NULL COMMENT '归属实验小组ID（如 L/M/C）',
  unit_price    DECIMAL(10,2) NOT NULL COMMENT '标准单价',
  is_outsourced TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否委外（用于主界面标识/筛选）',
  is_active     TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  note          VARCHAR(255) NULL COMMENT '备注',
  active_from   DATE NULL COMMENT '生效开始日期（可选）',
  active_to     DATE NULL COMMENT '生效结束日期（可选）',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_price_dept FOREIGN KEY (department_id) REFERENCES departments(department_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_price_group FOREIGN KEY (group_id) REFERENCES lab_groups(group_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_price_code (test_code),
  INDEX idx_price_cat (category_name),
  UNIQUE KEY uq_price_dept_code (department_id, test_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='价格表：标准项目目录（大类/细项）与单价';

CREATE TABLE order_id_counters (
  prefix   VARCHAR(8) NOT NULL COMMENT '前缀（默认 JC；内部委托可用其他前缀）',
  yymm     CHAR(4)    NOT NULL COMMENT '年月（YYMM）',
  last_seq INT UNSIGNED NOT NULL COMMENT '该年月下最新序号',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (prefix, yymm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='委托单号计数器（前缀+YYMM 维度）';

CREATE TABLE orders (
  order_id VARCHAR(20) PRIMARY KEY COMMENT '委托单号（业务主键，如 JC2504001 或其他前缀）',
  customer_id BIGINT UNSIGNED NOT NULL COMMENT '客户ID（customers）',
  payer_id BIGINT UNSIGNED NULL COMMENT '付款方ID（payers）',
  commissioner_id BIGINT UNSIGNED NULL COMMENT '委托方ID（commissioners）',
  created_by VARCHAR(20) NOT NULL COMMENT '开单员（users.user_id 工号）',
  arrival_mode ENUM('on_site','delivery') NULL COMMENT '样品到达方式：现场/寄样',
  sample_arrival_status ENUM('arrived','not_arrived') NOT NULL DEFAULT 'arrived' COMMENT '样品是否已到（未到则流程受限）',
  is_internal TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否内部委托（如失效分析）',
  agreement_note VARCHAR(255) NULL COMMENT '合作协议/内委托备注',
  note VARCHAR(500) NULL COMMENT '备注',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_o_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_o_payer FOREIGN KEY (payer_id) REFERENCES payers(payer_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_o_comm FOREIGN KEY (commissioner_id) REFERENCES commissioners(commissioner_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_o_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_o_customer (customer_id),
  INDEX idx_o_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='委托单（业务主键编码：JC+YYMM+序号）';

CREATE TABLE test_items (
  test_item_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '检测项目ID',
  order_id     VARCHAR(20) NOT NULL COMMENT '所属委托单号（orders.order_id）',
  price_id     BIGINT UNSIGNED NULL COMMENT '引用标准价格项（price）',
  category_name VARCHAR(160) NOT NULL COMMENT '检测大类（如 金属室温拉伸（T））',
  detail_name   VARCHAR(200) NOT NULL COMMENT '具体检测项目（如 金属抗拉强度/断后伸长率）',
  sample_name   VARCHAR(200) NULL COMMENT '样品名称（前端传）',
  material      VARCHAR(200) NULL COMMENT '材质/材料（前端传）',
  sample_type   VARCHAR(120) NULL COMMENT '样品类型（前端传）',
  original_no   VARCHAR(120) NULL COMMENT '原始编号（前端传）',
  test_code     VARCHAR(40)  NULL COMMENT '检测代码（如 OS001；也用于委外识别）',
  standard_code VARCHAR(64)  NULL COMMENT '检测标准编号（GB/T ...）',
  department_id SMALLINT UNSIGNED NULL COMMENT '执行部门ID',
  group_id      SMALLINT UNSIGNED NULL COMMENT '执行小组ID（L/M/C）',
  quantity      INT NOT NULL DEFAULT 1 COMMENT '件数/数量',
  unit_price    DECIMAL(10,2) NULL COMMENT '单价（下单时冻结；非标可手填）',
  discount_rate DECIMAL(5,2)  NULL COMMENT '折扣率（%），从付款方带出，可修改',
  final_unit_price DECIMAL(10,2) NULL COMMENT '折后单价',
  line_total    DECIMAL(12,2) NULL COMMENT '行小计=折后单价*数量（可应用计算回填）',
  machine_hours DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT '机时（记录）',
  work_hours    DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT '工时（记录）',
  is_add_on     TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否加测',
  is_outsourced TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否委外（从价格项/代码识别后冻结）',
  seq_no        INT NULL COMMENT '流转顺序号（可选，用于按实验室顺序展示）',
  sample_preparation VARCHAR(255) NULL COMMENT '样品预处理（前端传）',
  note          VARCHAR(255) NULL COMMENT '备注（前端传）',
  status ENUM('new','assigned','running','waiting_review','report_uploaded','completed','cancelled') NOT NULL DEFAULT 'new' COMMENT '项目状态（精简）',
  current_assignee VARCHAR(20) NULL COMMENT '当前执行人（users.user_id 工号），便于我的任务查询',
  arrival_mode ENUM('on_site','delivery') NULL COMMENT '样品到达方式：现场/寄样',
  sample_arrival_status ENUM('arrived','not_arrived') NOT NULL DEFAULT 'arrived' COMMENT '样品是否已到（未到则流程受限）',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ti_order   FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ti_price   FOREIGN KEY (price_id) REFERENCES price(price_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_ti_dept    FOREIGN KEY (department_id) REFERENCES departments(department_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_ti_group   FOREIGN KEY (group_id) REFERENCES lab_groups(group_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_ti_assignee FOREIGN KEY (current_assignee) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_ti_order (order_id),
  INDEX idx_ti_code (test_code),
  INDEX idx_ti_group_status (group_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='检测项目：大类/细项直存；支持非标、加测、委外';

CREATE TABLE samples (
  sample_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '样品ID',
  order_id VARCHAR(20) NOT NULL COMMENT '所属委托单号（orders.order_id）',
  test_item_id BIGINT UNSIGNED NULL COMMENT '关联检测项目ID（常见一一；若未来要多对多可增映射表）',
  sample_code VARCHAR(80) NULL COMMENT '样品条码/编号（扫码）',
  description VARCHAR(255) NULL COMMENT '样品描述',
  quantity_received INT NULL COMMENT '收样数量',
  residue_qty INT NULL COMMENT '余样数量',
  handling_method ENUM('return','keep','dispose') NULL COMMENT '样品处理方式：寄回/留样/销毁',
  return_required TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否需寄回客户',
  return_tracking_no VARCHAR(80) NULL COMMENT '寄回快递单号',
  return_confirmed TINYINT(1) NOT NULL DEFAULT 0 COMMENT '寄回确认（样品管理员确认）',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_s_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_s_ti FOREIGN KEY (test_item_id) REFERENCES test_items(test_item_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_s_order (order_id),
  INDEX idx_s_code (sample_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='样品：寄回/余样信息';

CREATE TABLE assignments (
  assignment_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '分配记录ID',
  test_item_id  BIGINT UNSIGNED NOT NULL COMMENT '检测项目ID（test_items）',
  assigned_to   VARCHAR(20) NOT NULL COMMENT '执行技术员（users.user_id 工号）',
  supervisor_id VARCHAR(20) NULL COMMENT '组长/审核人（users.user_id 工号）',
  is_active     TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否当前激活分配（系统保证唯一）',
  note          VARCHAR(255) NULL COMMENT '备注',
  created_by    VARCHAR(20) NOT NULL COMMENT '指派人（users.user_id 工号）',
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  active_key BIGINT GENERATED ALWAYS AS (CASE WHEN is_active=1 THEN test_item_id ELSE NULL END) STORED,
  UNIQUE KEY uq_assignment_active (active_key),
  INDEX idx_as_to (assigned_to),
  INDEX idx_as_ti (test_item_id),
  FOREIGN KEY (test_item_id)  REFERENCES test_items(test_item_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (assigned_to)   REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (supervisor_id) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (created_by)    REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分配记录：仅保留激活标记，无时间段';

CREATE TABLE project_files (
  file_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '文件ID',
  category ENUM('order','test_item','sample','raw_record','outsourcing_report','photo','other') NOT NULL COMMENT '文件类别',
  filename VARCHAR(200) NOT NULL COMMENT '文件名',
  filepath VARCHAR(300) NOT NULL COMMENT '文件路径',
  order_id VARCHAR(20) NULL COMMENT '关联委托单（可空）',
  test_item_id BIGINT UNSIGNED NULL COMMENT '关联检测项目（可空）',
  sample_id BIGINT UNSIGNED NULL COMMENT '关联样品（可空）',
  uploaded_by VARCHAR(20) NOT NULL COMMENT '上传人（users.user_id 工号）',
  last_download_time DATETIME(3) NULL COMMENT '最后下载时间',
  last_download_by   VARCHAR(120) NULL COMMENT '最后下载人姓名',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (order_id)   REFERENCES orders(order_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (test_item_id) REFERENCES test_items(test_item_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (sample_id)  REFERENCES samples(sample_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_pf_cat (category),
  INDEX idx_pf_order (order_id),
  INDEX idx_pf_ti (test_item_id),
  INDEX idx_pf_sample (sample_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附件：原始记录/委外报告/收样照片等';

SET FOREIGN_KEY_CHECKS=1;
