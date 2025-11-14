// server/src/routes/commission.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

/**
 * 预填：根据委托单号读取
 * GET /api/commission?orderNum=JC...
 */
router.get('/', async (req, res, next) => {
  try {
    const { orderNum } = req.query;
    if (!orderNum) return res.status(400).json({ message: 'orderNum required' });

    // 1. 读取 orders 主表
    const [[o]] = await pool.query(`SELECT * FROM orders WHERE order_id = ?`, [orderNum]);
    if (!o) return res.status(404).json({ message: 'not found' });

    // 2. 聚合 customer / payer（保持原逻辑）
    let customer = null, payer = null;
    if (o.commissioner_id) {
      const [[row]] = await pool.query(
        `SELECT m.commissioner_id, c.customer_id, m.commissioner_name AS customer_name, m.address AS customer_address,
                m.contact_name, m.contact_phone AS contact_phone_num, m.email AS contact_email
         FROM commissioners m
         JOIN payers p ON p.payer_id = m.payer_id
         JOIN customers c ON c.customer_id = p.customer_id
         WHERE m.commissioner_id = ? LIMIT 1`, [o.commissioner_id]
      );
      customer = row || null;
    } else {
      // 兜底：基于 payer_id 或 customer_id 回填，并尽量带出 commissioners 的联系人信息
      if (o.payer_id) {
        const [[row]] = await pool.query(
          `SELECT c.customer_id,
                  COALESCE(m.commissioner_name, c.customer_name) AS customer_name,
                  COALESCE(m.address, c.address) AS customer_address,
                  m.commissioner_id,
                  m.contact_name,
                  m.contact_phone AS contact_phone_num,
                  m.email AS contact_email
           FROM payers p
           JOIN customers c ON c.customer_id = p.customer_id
           LEFT JOIN commissioners m ON m.payer_id = p.payer_id
           WHERE p.payer_id = ?
           ORDER BY m.commissioner_id DESC
           LIMIT 1`, [o.payer_id]
        );
        customer = row || null;
      } else if (o.customer_id) {
        const [[row]] = await pool.query(
          `SELECT c.customer_id,
                  COALESCE(m.commissioner_name, c.customer_name) AS customer_name,
                  COALESCE(m.address, c.address) AS customer_address,
                  m.commissioner_id,
                  m.contact_name,
                  m.contact_phone AS contact_phone_num,
                  m.email AS contact_email
           FROM customers c
           LEFT JOIN payers p ON p.customer_id = c.customer_id
           LEFT JOIN commissioners m ON m.payer_id = p.payer_id
           WHERE c.customer_id = ?
           ORDER BY m.commissioner_id DESC
           LIMIT 1`, [o.customer_id]
        );
        customer = row || null;
      }
    }


    if (o.payer_id) {
      const [[row]] = await pool.query(
        `SELECT p.payer_id AS payment_id, c.customer_id, c.customer_name AS payer_name,
                c.address AS payer_address, p.contact_name AS payer_contact_name, c.phone AS payer_phone_num,
                p.contact_phone AS payer_contact_phone_num, c.bank_name, c.tax_id AS tax_number, c.bank_account
         FROM payers p
         JOIN customers c ON c.customer_id = p.customer_id
         WHERE p.payer_id = ? LIMIT 1`, [o.payer_id]
      );
      payer = row || null;
    }

    // 3. 读取 test_items 并解析 assignment_accounts（保证返回数组）
    const [items] = await pool.query(
      `SELECT ti.*,
              (SELECT JSON_ARRAYAGG(a.assigned_to) FROM assignments a WHERE a.test_item_id = ti.test_item_id) AS assignment_accounts
       FROM test_items ti WHERE ti.order_id = ? ORDER BY ti.test_item_id`, [orderNum]
    );

    // 如果没有 assignments 记录，尝试从委托方对应的付款方信息中获取业务员
    let fallbackSalesperson = null;
    if (items.length > 0 && (!items[0].assignment_accounts || items[0].assignment_accounts.length === 0)) {
      if (o.commissioner_id) {
        try {
          // 通过 commissioner_id 查询对应的付款方的业务员
          const [[salesperson]] = await pool.query(
            `SELECT u.user_id, u.account, u.name, u.email, u.phone
             FROM commissioners m
             JOIN payers p ON p.payer_id = m.payer_id
             JOIN users u ON u.user_id = p.owner_user_id
             WHERE m.commissioner_id = ? AND m.is_active = 1 AND p.is_active = 1 AND u.is_active = 1
             LIMIT 1`,
            [o.commissioner_id]
          );
          if (salesperson) {
            fallbackSalesperson = salesperson.account;
          }
        } catch (err) {
          console.warn('Failed to get fallback salesperson:', err.message);
        }
      }
    }

    const testItems = items.map(ti => {
      let assignment_accounts = [];
      try {
        if (typeof ti.assignment_accounts === 'string' && ti.assignment_accounts.trim() !== '') {
          assignment_accounts = JSON.parse(ti.assignment_accounts);
        } else if (Array.isArray(ti.assignment_accounts)) {
          assignment_accounts = ti.assignment_accounts;
        } else {
          assignment_accounts = [];
        }
      } catch (err) {
        assignment_accounts = [];
      }
      
      // 如果 assignment_accounts 为空且有 fallbackSalesperson，使用它
      if (assignment_accounts.length === 0 && fallbackSalesperson) {
        assignment_accounts = [fallbackSalesperson];
      }
      
      return {
        sample_name: ti.sample_name || '',
        material: ti.material || '',
        sample_type: ti.sample_type || '',
        original_no: ti.original_no || '',
        test_item: `${ti.category_name || ''}${ti.category_name ? ' - ' : ''}${ti.detail_name || ''}`.trim(),
        test_method: ti.standard_code || '',
        sample_preparation: ti.sample_preparation || '',
        quantity: ti.quantity || 1,
        department_id: ti.department_id || '',
        note: ti.note || '',
        price_id: ti.price_id || null,
        test_code: ti.test_code || null,
        test_condition: ti.detail_name || '',
        price_note: ti.price_note || '',
        discount_rate: ti.discount_rate || null,
        group_id: ti.group_id || null,
        assignment_accounts: assignment_accounts,
        arrival_mode: ti.arrival_mode || '',
        sample_arrival_status: ti.sample_arrival_status || 'arrived',
        service_urgency: ti.service_urgency || 'normal'
      };
    });

    // 4. 读取 reports / sample_handling / sample_requirements 三张表（若存在）
    // reports
    const [[r]] = await pool.query(`SELECT * FROM reports WHERE order_id = ? LIMIT 1`, [orderNum]);
    
    // 安全的 JSON 解析函数
    const safeJsonParse = (value, defaultValue = []) => {
      if (!value) return defaultValue;
      if (Array.isArray(value)) return value; // 如果已经是数组，直接返回
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : defaultValue;
        } catch (e) {
          console.warn('JSON parse error:', e.message, 'for value:', value);
          return defaultValue;
        }
      }
      return defaultValue;
    };
    
    const reportInfo = r ? {
      type: safeJsonParse(r.report_type, []),
      paper_report_shipping_type: r.paper_report_shipping_type ? String(r.paper_report_shipping_type) : '',
      report_additional_info: r.report_additional_info || '',
      header_type: r.header_type ? String(r.header_type) : '',
      header_other: r.header_other || '',
      format_type: r.format_type ? String(r.format_type) : '',
      // 若前端期待 report_seals 在 orderInfo 里，也可以在这里复制过去；此处保留在 reportInfo
      report_seals: safeJsonParse(r.report_seals, [])
    } : {
      type: [],
      paper_report_shipping_type: '',
      report_additional_info: '',
      header_type: '',
      header_other: '',
      format_type: '',
      report_seals: []
    };

    // sample_handling
    const [[sh]] = await pool.query(`SELECT * FROM sample_handling WHERE order_id = ? LIMIT 1`, [orderNum]);
    const sampleHandling = sh ? {
      handling_type: sh.handling_type != null ? String(sh.handling_type) : '',
      return_info: sh.return_info ? safeJsonParse(sh.return_info, null) : null
    } : {
      handling_type: o.arrival_mode === 'delivery' ? '3' : '1',
      return_info: null
    };

    // sample_requirements
    const [[sr]] = await pool.query(`SELECT * FROM sample_requirements WHERE order_id = ? LIMIT 1`, [orderNum]);
    const sampleRequirements = sr ? {
      hazards: safeJsonParse(sr.hazards, []),
      hazardOther: sr.hazard_other || '',
      magnetism: sr.magnetism || '',
      conductivity: sr.conductivity || '',
      breakable: sr.breakable || '',
      brittle: sr.brittle || ''
    } : {
      hazards: [],
      hazardOther: '',
      magnetism: '',
      conductivity: '',
      breakable: '',
      brittle: ''
    };

    // 5. 组合 orderInfo（优先取 orders 表已有字段）
    const orderInfo = {
      sample_shipping_address: null,
      total_price: o.total_price != null ? Number(o.total_price) : null,
      order_num: o.order_id,
      other_requirements: o.note || '',
      subcontracting_not_accepted: o.subcontracting_not_accepted ? Boolean(o.subcontracting_not_accepted) : false,
      report_seals: reportInfo.report_seals || [],
      delivery_days_after_receipt: o.delivery_days_after_receipt != null ? Number(o.delivery_days_after_receipt) : null,
      // arrival fields moved to test_items level
    };

    // vatType 默认为 '1'（不再从reports表读取）
    const vatType = '1';

    // 5. 获取服务方信息（业务员信息）
    let serviceInfo = null;
    
    // 优先从委托方对应的付款方的owner_user_id获取业务员信息
    if (o.commissioner_id) {
      try {
        const [[salesperson]] = await pool.query(
          `SELECT u.user_id, u.account, u.name, u.email, u.phone
           FROM commissioners m
           JOIN payers p ON p.payer_id = m.payer_id
           JOIN users u ON u.user_id = p.owner_user_id
           WHERE m.commissioner_id = ? AND m.is_active = 1 AND p.is_active = 1 AND u.is_active = 1
           LIMIT 1`,
          [o.commissioner_id]
        );
        if (salesperson) {
          serviceInfo = {
            account: salesperson.account,
            name: salesperson.name,
            email: salesperson.email,
            phone: salesperson.phone
          };
        }
      } catch (err) {
        console.warn('Failed to get service info from commissioner:', err.message);
      }
    }
    
    // 如果从付款方没有获取到，尝试从assignment_accounts中查找业务员账号
    if (!serviceInfo && testItems.length > 0 && testItems[0].assignment_accounts && testItems[0].assignment_accounts.length > 0) {
      // 从assignment_accounts中查找业务员账号（YW开头的账号）
      const salesAccount = testItems[0].assignment_accounts.find(acc => acc && acc.includes('YW'));
      if (salesAccount) {
        try {
          const [[salesperson]] = await pool.query(
            `SELECT u.user_id, u.account, u.name, u.email, u.phone
             FROM users u
             WHERE u.account = ? AND u.is_active = 1 LIMIT 1`,
            [salesAccount]
          );
          if (salesperson) {
            serviceInfo = {
              account: salesperson.account,
              name: salesperson.name,
              email: salesperson.email,
              phone: salesperson.phone
            };
          }
        } catch (err) {
          console.warn('Failed to get service info from assignments:', err.message);
        }
      }
    }

    // 6. 返回给前端（结构与前端预填期望一致）
    res.json({
      customer,
      payer,
      testItems,
      reportInfo,
      orderInfo,
      vatType,
      sampleHandling,
      sampleRequirements,
      serviceInfo
    });
  } catch (e) {
    next(e);
  }
});


/**
 * 创建：按照前端 payload 写入 orders/test_items/assignments
 * POST /api/commission
 */
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const payload = req.body;
    const customerId = payload.customerId;
    const paymentId  = payload.paymentId; // payer_id
    const assignmentAccount = payload.assignmentInfo?.account || null;
    const commissionerId = payload.commissionerId || null; // 从前端获取委托方ID

    // 调试：入口与关键顶层参数
    try {
      console.log('[commission][POST] incoming payload summary', {
        customerId,
        paymentId,
        commissionerId,
        hasReportInfo: Boolean(payload.reportInfo),
        testItemsCount: Array.isArray(payload.testItems) ? payload.testItems.length : 0,
        assignmentAccount
      });
    } catch (_) {}

    const reportInfo = payload.reportInfo || {};
    const orderInfo = payload.orderInfo || {};
    const sampleHandling = payload.sampleHandling || {};
    const sampleRequirements = payload.sampleRequirements || {};

    // 从 payers 表获取业务员账号（owner_user_id）
    let businessAccount = null; // 业务员账号，用于设置 current_assignee
    if (paymentId) {
      try {
        const [[payerRow]] = await conn.query(
          `SELECT p.owner_user_id, u.account 
           FROM payers p 
           LEFT JOIN users u ON u.user_id = p.owner_user_id 
           WHERE p.payer_id = ? AND p.is_active = 1 AND (u.is_active = 1 OR u.is_active IS NULL)`,
          [paymentId]
        );
        if (payerRow && payerRow.account) {
          businessAccount = payerRow.account;
        }
        try { console.log('[commission][POST] business account from payer', { paymentId, businessAccount }); } catch (_) {}
      } catch (err) {
        console.warn('[commission][POST] failed to get business account from payer:', err.message);
      }
    }
    
    // 决定 order_id（如果前端有传就校验唯一，不存在则生成 JC + YYMM + seq）
    let order_id = payload?.orderInfo?.order_num || null;

    await conn.beginTransaction();

    if (order_id) {
      // 检查重复
      const [[ex]] = await conn.query(`SELECT order_id FROM orders WHERE order_id = ? FOR UPDATE`, [order_id]);
      if (ex) throw Object.assign(new Error('委托单号已存在'), { status: 400 });
    } else {
      // 生成新单号：JC + yyMM + 4位序号（从0001开始），在事务内使用 FOR UPDATE 锁同月已有最大单号以避免并发冲突
      const now = new Date();
      const yy = String(now.getFullYear()).slice(2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `JC${yy}${mm}`; // e.g. JC2504

      // 查找当前月最大 order_id（加 FOR UPDATE 避免并发）
      // 注意：MySQL 对 varchar 排序能正常比较带相同前缀且数字零填充的字符串
      const [rows] = await conn.query(
        `SELECT order_id FROM orders WHERE order_id LIKE ? ORDER BY order_id DESC LIMIT 1 FOR UPDATE`,
        [`${prefix}%`]
      );

      let nextSeq = 1;
      if (rows && rows[0] && rows[0].order_id) {
        const last = rows[0].order_id;
        const lastSeqStr = last.slice(prefix.length); // 剩下的数字部分
        const lastSeqNum = parseInt(lastSeqStr, 10);
        if (!isNaN(lastSeqNum)) nextSeq = lastSeqNum + 1;
      }
      // 用 4 位序号（如 0001, 0002, ...）
      order_id = `${prefix}${String(nextSeq).padStart(4, '0')}`; // e.g. JC25040001
    }

    // 创建订单（created_by 暂用 assignmentAccount 或 'LX001'）
    const created_by = assignmentAccount || 'LX001';
    try { console.log('[commission][POST] creating order', { order_id, created_by }); } catch (_) {}
    await conn.query(
      `INSERT INTO orders (order_id, customer_id, payer_id, commissioner_id, created_by, is_internal, agreement_note, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_id, customerId, paymentId || null, commissionerId, created_by,
       payload?.orderInfo?.is_internal ? 1 : 0,
       payload?.orderInfo?.agreement_note || null,
       payload?.orderInfo?.other_requirements || null]
    );

    if (orderInfo.total_price || orderInfo.delivery_days_after_receipt || orderInfo.subcontracting_not_accepted !== undefined) {
      await conn.query(
        `UPDATE orders SET total_price = ?, delivery_days_after_receipt = ?, subcontracting_not_accepted = ? WHERE order_id = ?`,
        [
          orderInfo.total_price || null,
          orderInfo.delivery_days_after_receipt || null,
          orderInfo.subcontracting_not_accepted ? 1 : 0,
          order_id
        ]
      );
    }
    // 1) 插入 reports（如果前端传了任何 reportInfo 可写入）
    await conn.query(
      `INSERT INTO reports
        (order_id, report_type, paper_report_shipping_type, report_additional_info, header_type, header_other, format_type, report_seals)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        reportInfo.type ? JSON.stringify(reportInfo.type) : null,
        reportInfo.paper_report_shipping_type || null,
        reportInfo.report_additional_info || null,
        reportInfo.header_type || null,
        reportInfo.header_other || null,
        reportInfo.format_type || null,
        // 若前端把 report_seals 放在 orderInfo.report_seals 或 top-level reportSeals，请替换至正确来源
        (orderInfo.report_seals || payload.reportSeals || JSON.stringify([])) && JSON.stringify(orderInfo.report_seals || payload.reportSeals || [])
      ]
    );

    // 2) 插入 sample_handling
    await conn.query(
      `INSERT INTO sample_handling (order_id, handling_type, return_info) VALUES (?, ?, ?)`,
      [
        order_id,
        sampleHandling.handling_type || null,                       // 前端是 numeric/string 对应 sampleSolutionType
        sampleHandling.return_info ? JSON.stringify(sampleHandling.return_info) : null
      ]
    );

    // 3) 插入 sample_requirements
    await conn.query(
      `INSERT INTO sample_requirements
        (order_id, hazards, hazard_other, magnetism, conductivity, breakable, brittle)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id,
        payload.sampleRequirements && payload.sampleRequirements.hazards ? JSON.stringify(payload.sampleRequirements.hazards) : null,
        payload.sampleRequirements && payload.sampleRequirements.hazardOther ? payload.sampleRequirements.hazardOther : null,
        payload.sampleRequirements && payload.sampleRequirements.magnetism ? payload.sampleRequirements.magnetism : null,
        payload.sampleRequirements && payload.sampleRequirements.conductivity ? payload.sampleRequirements.conductivity : null,
        payload.sampleRequirements && payload.sampleRequirements.breakable ? payload.sampleRequirements.breakable : null,
        payload.sampleRequirements && payload.sampleRequirements.brittle ? payload.sampleRequirements.brittle : null,
      ]
    );

    // 插入 test_items
    for (const item of payload.testItems || []) {
      try {
        console.log('[commission][POST] -> test_item incoming', {
          name: item.test_item,
          price_id: item.price_id,
          test_code: item.test_code,
          department_id: item.department_id,
          group_id: item.group_id,
          quantity: item.quantity
        });
      } catch (_) {}
      const name = (item.test_item || '').trim();
      const parts = name.split(' - ');
      const category_name = (parts[0] || '').trim();
      const detail_name   = (parts.slice(1).join(' - ') || '').trim(); // 允许名称里含 -
      
      // unit_price现在是varchar类型，支持带字符的价格（如"800一件"）
      // 尝试转换为数字用于计算，如果不能转换为数字则保留原字符串
      let unit_price = item.unit_price != null && String(item.unit_price).trim() !== '' ? item.unit_price : null;
      let final_unit_price = unit_price;
      let line_total = null;
      
      // 如果unit_price可以转换为数字，则进行计算
      if (unit_price != null) {
        const numPrice = Number(unit_price);
        if (!isNaN(numPrice)) {
          final_unit_price = numPrice;
          line_total = numPrice && item.quantity ? (numPrice * Number(item.quantity)) : null;
        }
      }

      // 获取price表信息用于判断项目类型
      let priceInfo = null;
      if (item.price_id) {
        const [priceRows] = await conn.query(
          `SELECT test_code, category_name, group_id, is_outsourced, department_id 
           FROM price WHERE price_id = ?`,
          [item.price_id]
        );
        priceInfo = priceRows[0] || null;
      }

      try { console.log('[commission][POST] priceInfo', priceInfo); } catch (_) {}

      // 判断是否为标准项目
      const isStandardProject = priceInfo && 
        priceInfo.test_code && 
        !priceInfo.category_name.includes('其他类别') && 
        priceInfo.group_id;

      // 判断是否为委外项目
      const isOutsourcedProject = priceInfo && priceInfo.is_outsourced;

      // 判断是否为其他类别项目（有department_id但没有group_id）
      const isOtherCategoryProject = priceInfo && 
        priceInfo.category_name.includes('其他类别') && 
        !priceInfo.group_id && 
        priceInfo.department_id;

      try {
        console.log('[commission][POST] project flags', {
          isStandardProject: Boolean(isStandardProject),
          isOutsourcedProject: Boolean(isOutsourcedProject),
          isOtherCategoryProject: Boolean(isOtherCategoryProject),
          assignmentAccount
        });
      } catch (_) {}

      // 先查找负责人信息，用于设置test_items的supervisor_id
      let assignedTo = null;
      let supervisorId = null;
      let testItemSupervisorId = null; // 用于test_items.supervisor_id字段

      // 根据项目类型进行自动分配
      if (isStandardProject) {
        // 标准项目：查找对应group_id的组长（supervisor）
        const [supervisorRows] = await conn.query(
          `SELECT user_id, account, name FROM users 
           WHERE is_active = 1 AND group_id = ? AND group_role = 'supervisor' 
           ORDER BY user_id LIMIT 1`,
          [priceInfo.group_id]
        );
        
        if (supervisorRows.length > 0) {
          assignedTo = supervisorRows[0].account; // assignments.assigned_to = 组长账号
          supervisorId = supervisorRows[0].account; // assignments.supervisor_id = 组长账号
          testItemSupervisorId = supervisorRows[0].account; // test_items.supervisor_id = 组长账号
        }
        try { console.log('[commission][POST] standard supervisor lookup', { group_id: priceInfo.group_id, found: supervisorRows.length, assignedTo }); } catch (_) {}
      } else if (isOutsourcedProject) {
        // 委外项目：查找对应department_id的室主任
        const [deptLeaderRows] = await conn.query(
          `SELECT user_id, account, name FROM users 
           WHERE is_active = 1 AND department_id = ? AND group_role = 'leader' 
           ORDER BY user_id LIMIT 1`,
          [priceInfo.department_id]
        );
        
        if (deptLeaderRows.length > 0) {
          assignedTo = deptLeaderRows[0].account; // assignments.assigned_to = 室主任账号
          supervisorId = deptLeaderRows[0].account; // assignments.supervisor_id = 室主任账号
          testItemSupervisorId = deptLeaderRows[0].account; // test_items.supervisor_id = 室主任账号
        }
        try { console.log('[commission][POST] outsourced leader lookup', { department_id: priceInfo.department_id, found: deptLeaderRows.length, assignedTo }); } catch (_) {}
      } else if (businessAccount) {
        // 兜底：使用业务员作为负责人
        assignedTo = businessAccount; // assignments.assigned_to = 业务员
        supervisorId = null; // 没有上级监督
        try { console.log('[commission][POST] fallback assignedTo from businessAccount', { assignedTo: businessAccount }); } catch (_) {}
      }

      // 插入test_items（包含supervisor_id）
      const insertTestItemSql = `
        INSERT INTO test_items (
          order_id, price_id, category_name, detail_name, test_code, standard_code, department_id, group_id,
          quantity, unit_price, discount_rate, final_unit_price, line_total, is_add_on, is_outsourced, seq_no,
          sample_name, material, sample_type, original_no, sample_preparation, note, price_note,
          arrival_mode, sample_arrival_status, service_urgency, status, supervisor_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

      const [r] = await conn.query(insertTestItemSql, [
        order_id,
        item.price_id || null,
        category_name,
        detail_name,
        item.test_code || null,
        item.test_method || null,
        (priceInfo && priceInfo.department_id) || item.department_id || null,
        (priceInfo && priceInfo.group_id) || item.group_id || null,
        item.quantity || 1,
        unit_price,
        item.discount_rate || null,
        final_unit_price,
        line_total,
        0,
        isOutsourcedProject ? 1 : 0,
        null,
        item.sample_name || null,
        item.material || null,
        item.sample_type || null,
        item.original_no || null,
        item.sample_preparation || null,
        item.note || null,
        item.price_note || null,
        (item.arrival_mode === 'mail'
          ? 'delivery'
          : (item.arrival_mode || (payload?.arrivalInfo?.arrivalMethod === 'mail'
              ? 'delivery'
              : (payload?.arrivalInfo?.arrivalMethod ? 'on_site' : null)))),
        (item.sample_arrival_status === 'arrived' || item.sample_arrival_status === 'not_arrived')
          ? item.sample_arrival_status
          : (payload?.arrivalInfo?.sampleArrived === 'yes' ? 'arrived' : 'not_arrived'),
        item.service_urgency || 'normal',
        'new', // 初始状态为new
        testItemSupervisorId // 负责人ID
      ]);
      const test_item_id = r.insertId;

      try { console.log('[commission][POST] inserted test_item', { test_item_id, order_id, supervisor_id: testItemSupervisorId }); } catch (_) {}

      // 创建分配记录
      // assignments表的created_by固定为开单员KD001
      const assignmentCreator = 'KD001';
      
      if (isStandardProject && assignedTo && businessAccount) {
        // 标准项目：插入两条记录 - 业务员和组长
        // 1. 插入业务员记录（is_active=0，用于预填功能）
        await conn.query(
          `INSERT INTO assignments (test_item_id, assigned_to, supervisor_id, is_active, note, created_by)
           VALUES (?, ?, ?, 0, '业务员', ?)`,
          [test_item_id, businessAccount, assignedTo, assignmentCreator]
        );
        try { console.log('[commission][POST] inserted salesperson assignment', { test_item_id, assignedTo: businessAccount, supervisorId: assignedTo, created_by: assignmentCreator }); } catch (_) {}
        
        // 2. 插入组长记录（is_active=1，作为当前激活的分配）
        await conn.query(
          `INSERT INTO assignments (test_item_id, assigned_to, supervisor_id, is_active, note, created_by)
           VALUES (?, ?, ?, 1, '组长', ?)`,
          [test_item_id, assignedTo, assignedTo, assignmentCreator]
        );
        try { console.log('[commission][POST] inserted supervisor assignment', { test_item_id, assignedTo, supervisorId: assignedTo, created_by: assignmentCreator }); } catch (_) {}
      } else if (assignedTo) {
        // 非标准项目：只插入一条记录
        await conn.query(
          `INSERT INTO assignments (test_item_id, assigned_to, supervisor_id, is_active, note, created_by)
           VALUES (?, ?, ?, 1, NULL, ?)`,
          [test_item_id, assignedTo, supervisorId, assignmentCreator]
        );
        try { console.log('[commission][POST] inserted assignment', { test_item_id, assignedTo, supervisorId, created_by: assignmentCreator }); } catch (_) {}
      }
      
      // 更新test_items状态和当前执行人（始终使用业务员账号作为current_assignee）
      if (businessAccount) {
        await conn.query(
          `UPDATE test_items SET current_assignee = ?, status = ? WHERE test_item_id = ?`, 
          [businessAccount, 'assigned', test_item_id]
        );
        try { console.log('[commission][POST] updated test_item assignee', { test_item_id, current_assignee: businessAccount, status: 'assigned' }); } catch (_) {}
      } else {
        try {
          console.log('[commission][POST] no business account found for current_assignee', {
            test_item_id,
            paymentId
          });
        } catch (_) {}
      }
    }

    await conn.commit();
    try { console.log('[commission][POST] committed', { order_id }); } catch (_) {}
    res.status(201).json({ orderNum: order_id });
  } catch (e) {
    await (conn.rollback().catch(()=>{}));
    const status = e.status || 500;
    try { console.error('[commission][POST] error', { message: e.message, status }); } catch (_) {}
    res.status(status).json({ message: e.message || 'error' });
  } finally {
    conn.release();
  }
});


/**
 * 更新：按照前端 payload 更新 orders/test_items/assignments
 * PUT /api/commission/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const payload = req.body;

    // 1. 检查订单是否存在
    const [[order]] = await pool.query(`SELECT * FROM orders WHERE order_id = ?`, [id]);
    if (!order) return res.status(404).json({ message: 'order not found' });

    // 2. 更新 orders 表
    const updateOrder = [];
    if (payload.total_price !== undefined) updateOrder.push(`total_price = ?`);
    if (payload.delivery_days_after_receipt !== undefined) updateOrder.push(`delivery_days_after_receipt = ?`);
    if (payload.subcontracting_not_accepted !== undefined) updateOrder.push(`subcontracting_not_accepted = ?`);
    if (updateOrder.length > 0) {
      await pool.query(`UPDATE orders SET ${updateOrder.join(', ')} WHERE order_id = ?`, [
        payload.total_price || null,
        payload.delivery_days_after_receipt || null,
        payload.subcontracting_not_accepted ? 1 : 0,
        id
      ]);
    }

    // 3. 更新 reports 表
    if (payload.reportInfo) {
      await pool.query(`UPDATE reports SET report_type = ?, paper_report_shipping_type = ?, report_additional_info = ?, header_type = ?, header_other = ?, format_type = ?, report_seals = ? WHERE order_id = ?`, [
        payload.reportInfo.type ? JSON.stringify(payload.reportInfo.type) : null,
        payload.reportInfo.paper_report_shipping_type || null,
        payload.reportInfo.report_additional_info || null,
        payload.reportInfo.header_type || null,
        payload.reportInfo.header_other || null,
        payload.reportInfo.format_type || null,
        // 若前端把 report_seals 放在 orderInfo.report_seals 或 top-level reportSeals，请替换至正确来源
        (payload.report_seals || payload.reportSeals || JSON.stringify([])) && JSON.stringify(payload.report_seals || payload.reportSeals || []),
        id
      ]);
    }

    // 4. 更新 sample_handling 表
    if (payload.sampleHandling) {
      await pool.query(`UPDATE sample_handling SET handling_type = ?, return_info = ? WHERE order_id = ?`, [
        payload.sampleHandling.handling_type || null,
        payload.sampleHandling.return_info ? JSON.stringify(payload.sampleHandling.return_info) : null,
        id
      ]);
    }

    // 5. 更新 sample_requirements 表
    if (payload.sampleRequirements) {
      await pool.query(`UPDATE sample_requirements SET hazards = ?, hazard_other = ?, magnetism = ?, conductivity = ?, breakable = ?, brittle = ? WHERE order_id = ?`, [
        payload.sampleRequirements.hazards ? JSON.stringify(payload.sampleRequirements.hazards) : null,
        payload.sampleRequirements.hazardOther || null,
        payload.sampleRequirements.magnetism || null,
        payload.sampleRequirements.conductivity || null,
        payload.sampleRequirements.breakable || null,
        payload.sampleRequirements.brittle || null,
        id
      ]);
    }

    // 6. 更新 test_items 表
    if (payload.testItems) {
      for (const item of payload.testItems) {
        const updateTestItem = [];
        if (item.price_id !== undefined) updateTestItem.push(`price_id = ?`);
        if (item.test_code !== undefined) updateTestItem.push(`test_code = ?`);
        if (item.test_method !== undefined) updateTestItem.push(`standard_code = ?`);
        if (item.department_id !== undefined) updateTestItem.push(`department_id = ?`);
        if (item.group_id !== undefined) updateTestItem.push(`group_id = ?`);
        if (item.quantity !== undefined) updateTestItem.push(`quantity = ?`);
        if (item.unit_price !== undefined) updateTestItem.push(`unit_price = ?`);
        if (item.discount_rate !== undefined) updateTestItem.push(`discount_rate = ?`);
        if (item.final_unit_price !== undefined) updateTestItem.push(`final_unit_price = ?`);
        if (item.line_total !== undefined) updateTestItem.push(`line_total = ?`);
        if (item.note !== undefined) updateTestItem.push(`note = ?`);
        if (item.price_note !== undefined) updateTestItem.push(`price_note = ?`);
        if (item.arrival_mode !== undefined) updateTestItem.push(`arrival_mode = ?`);
        if (item.sample_arrival_status !== undefined) updateTestItem.push(`sample_arrival_status = ?`);
        if (item.service_urgency !== undefined) updateTestItem.push(`service_urgency = ?`);
        if (item.status !== undefined) updateTestItem.push(`status = ?`);
        if (item.supervisor_id !== undefined) updateTestItem.push(`supervisor_id = ?`);
        if (updateTestItem.length > 0) {
          await pool.query(`UPDATE test_items SET ${updateTestItem.join(', ')} WHERE test_item_id = ?`, [
            item.price_id || null,
            item.test_code || null,
            item.test_method || null,
            item.department_id || null,
            item.group_id || null,
            item.quantity || 1,
            item.unit_price,
            item.discount_rate || null,
            item.final_unit_price,
            item.line_total,
            item.note || null,
            item.price_note || null,
            item.arrival_mode || null,
            item.sample_arrival_status || null,
            item.service_urgency || 'normal',
            item.status || 'new',
            item.supervisor_id || null,
            item.test_item_id
          ]);
        }
      }
    }

    // 7. 返回更新后的订单信息
    res.json({ message: 'order updated successfully' });
  } catch (e) {
    next(e);
  }
});


/**
 * 删除：按照前端 payload 删除 orders/test_items/assignments
 * DELETE /api/commission/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;

    // 1. 检查订单是否存在
    const [[order]] = await pool.query(`SELECT * FROM orders WHERE order_id = ?`, [id]);
    if (!order) return res.status(404).json({ message: 'order not found' });

    // 2. 删除 orders 表中的记录
    await pool.query(`DELETE FROM orders WHERE order_id = ?`, [id]);

    // 3. 删除 reports 表中的记录
    await pool.query(`DELETE FROM reports WHERE order_id = ?`, [id]);

    // 4. 删除 sample_handling 表中的记录
    await pool.query(`DELETE FROM sample_handling WHERE order_id = ?`, [id]);

    // 5. 删除 sample_requirements 表中的记录
    await pool.query(`DELETE FROM sample_requirements WHERE order_id = ?`, [id]);

    // 6. 删除 test_items 表中的记录
    await pool.query(`DELETE FROM test_items WHERE order_id = ?`, [id]);

    // 7. 返回删除结果
    res.json({ message: 'order deleted successfully' });
  } catch (e) {
    next(e);
  }
});


/**
 * 查询：按照前端 payload 查询 orders/test_items/assignments
 * GET /api/commission/search
 */
router.get('/search', async (req, res, next) => {
  try {
    const payload = req.query;

    // 1. 构建查询条件
    const conditions = [];
    const values = [];
    if (payload.order_id) { conditions.push(`order_id = ?`); values.push(payload.order_id); }
    if (payload.customer_id) { conditions.push(`customer_id = ?`); values.push(payload.customer_id); }
    if (payload.payer_id) { conditions.push(`payer_id = ?`); values.push(payload.payer_id); }
    if (payload.commissioner_id) { conditions.push(`commissioner_id = ?`); values.push(payload.commissioner_id); }
    if (payload.test_item) { conditions.push(`test_item LIKE ?`); values.push(`%${payload.test_item}%`); }
    if (payload.test_code) { conditions.push(`test_code = ?`); values.push(payload.test_code); }
    if (payload.test_method) { conditions.push(`standard_code = ?`); values.push(payload.test_method); }
    if (payload.category_name) { conditions.push(`category_name LIKE ?`); values.push(`%${payload.category_name}%`); }
    if (payload.detail_name) { conditions.push(`detail_name LIKE ?`); values.push(`%${payload.detail_name}%`); }
    if (payload.note) { conditions.push(`note LIKE ?`); values.push(`%${payload.note}%`); }
    if (payload.price_note) { conditions.push(`price_note LIKE ?`); values.push(`%${payload.price_note}%`); }
    if (payload.service_urgency) { conditions.push(`service_urgency = ?`); values.push(payload.service_urgency); }

    const limit = Math.min(Number(payload.limit) || 100, 500);
    const offset = Number(payload.offset) || 0;
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        o.order_id,
        o.customer_id,
        o.payer_id,
        o.commissioner_id,
        o.total_price,
        o.delivery_days_after_receipt,
        o.subcontracting_not_accepted,
        ti.test_item_id,
        ti.test_item,
        ti.test_code,
        ti.standard_code,
        ti.category_name,
        ti.detail_name,
        ti.quantity,
        ti.unit_price,
        ti.discount_rate,
        ti.final_unit_price,
        ti.line_total,
        ti.department_id,
        ti.group_id,
        ti.note,
        ti.price_note,
        ti.arrival_mode,
        ti.sample_arrival_status,
        ti.service_urgency,
        ti.status,
        ti.supervisor_id
      FROM orders o
      JOIN test_items ti ON ti.order_id = o.order_id
      ${whereClause}
      ORDER BY o.created_at DESC, ti.test_item_id DESC
      LIMIT ? OFFSET ?
    `;

    values.push(limit, offset);
    const [rows] = await pool.query(sql, values);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

module.exports = { router };