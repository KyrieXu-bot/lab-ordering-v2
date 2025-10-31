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

    // 如果没有 assignments 记录，尝试从付款方信息中获取业务员
    let fallbackSalesperson = null;
    if (items.length > 0 && (!items[0].assignment_accounts || items[0].assignment_accounts.length === 0)) {
      if (customer && customer.customer_id) {
        try {
          // 优先从当前订单的付款方获取业务员，如果没有则从客户的所有付款方中获取
          let salespersonQuery;
          let queryParams;
          
          if (o.payer_id) {
            // 如果有具体的付款方ID，优先使用该付款方的业务员
            salespersonQuery = `SELECT u.user_id, u.account, u.name, u.email, u.phone
                               FROM payers p
                               JOIN users u ON u.user_id = p.owner_user_id
                               WHERE p.payer_id = ? AND u.is_active = 1`;
            queryParams = [o.payer_id];
          } else {
            // 否则从客户的所有付款方中获取第一个有业务员的
            salespersonQuery = `SELECT u.user_id, u.account, u.name, u.email, u.phone
                               FROM payers p
                               JOIN users u ON u.user_id = p.owner_user_id
                               WHERE p.customer_id = ? AND u.is_active = 1
                               ORDER BY p.payer_id LIMIT 1`;
            queryParams = [customer.customer_id];
          }
          
          const [[salesperson]] = await pool.query(salespersonQuery, queryParams);
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
        group_id: ti.group_id || null,
        assignment_accounts: assignment_accounts,
        arrival_mode: ti.arrival_mode || '',
        sample_arrival_status: ti.sample_arrival_status || 'arrived'
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
      service_type: '1',
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
    
    // 优先从付款方的owner_user_id获取业务员信息
    if (payer && payer.payment_id) {
      try {
        const [[salesperson]] = await pool.query(
          `SELECT u.user_id, u.account, u.name, u.email, u.phone
           FROM payers p
           JOIN users u ON u.user_id = p.owner_user_id
           WHERE p.payer_id = ? AND u.is_active = 1 LIMIT 1`,
          [payer.payment_id]
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
        console.warn('Failed to get service info from payer:', err.message);
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
      } else if (assignmentAccount) {
        // 兜底：使用业务员作为负责人
        assignedTo = assignmentAccount; // assignments.assigned_to = 业务员
        supervisorId = null; // 没有上级监督
        try { console.log('[commission][POST] fallback assignedTo from assignmentAccount', { assignedTo }); } catch (_) {}
      }

      // 插入test_items（包含supervisor_id）
      const [r] = await conn.query(
        `INSERT INTO test_items
         (order_id, price_id, category_name, detail_name, test_code, standard_code, department_id, group_id,
          quantity, unit_price, discount_rate, final_unit_price, line_total, is_add_on, is_outsourced, seq_no,
          sample_name, material, sample_type, original_no, sample_preparation, note, price_note,
          arrival_mode, sample_arrival_status, status, supervisor_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
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
          null,
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
          'new', // 初始状态为new
          testItemSupervisorId // 负责人ID
        ]
      );
      const test_item_id = r.insertId;

      try { console.log('[commission][POST] inserted test_item', { test_item_id, order_id, supervisor_id: testItemSupervisorId }); } catch (_) {}

      // 创建分配记录
      // assignments表的created_by固定为开单员KD001
      const assignmentCreator = 'KD001';
      
      if (isStandardProject && assignedTo && assignmentAccount) {
        // 标准项目：插入两条记录 - 业务员和组长
        // 1. 插入业务员记录（is_active=0，用于预填功能）
        await conn.query(
          `INSERT INTO assignments (test_item_id, assigned_to, supervisor_id, is_active, note, created_by)
           VALUES (?, ?, ?, 0, '业务员', ?)`,
          [test_item_id, assignmentAccount, assignedTo, assignmentCreator]
        );
        try { console.log('[commission][POST] inserted salesperson assignment', { test_item_id, assignedTo: assignmentAccount, supervisorId: assignedTo, created_by: assignmentCreator }); } catch (_) {}
        
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
      
      // 更新test_items状态和当前执行人（始终使用业务员作为current_assignee）
      if (isStandardProject && assignedTo && assignmentAccount) {
        // 标准项目：使用业务员作为current_assignee
        const currentAssignee = assignmentAccount;
        await conn.query(
          `UPDATE test_items SET current_assignee = ?, status = ? WHERE test_item_id = ?`, 
          [currentAssignee, 'assigned', test_item_id]
        );
        try { console.log('[commission][POST] updated test_item assignee (standard)', { test_item_id, current_assignee: currentAssignee, status: 'assigned', assignmentAccount, assignedTo }); } catch (_) {}
      } else if (assignedTo) {
        // 非标准项目：使用负责人作为current_assignee
        const currentAssignee = assignmentAccount || assignedTo;
        await conn.query(
          `UPDATE test_items SET current_assignee = ?, status = ? WHERE test_item_id = ?`, 
          [currentAssignee, 'assigned', test_item_id]
        );
        try { console.log('[commission][POST] updated test_item assignee (non-standard)', { test_item_id, current_assignee: currentAssignee, status: 'assigned', assignmentAccount, assignedTo }); } catch (_) {}
      } else {
        try {
          console.log('[commission][POST] no assignee decided', {
            test_item_id,
            reason: 'no standard/outsourced leader found and no assignmentAccount',
            flags: { isStandardProject: Boolean(isStandardProject), isOutsourcedProject: Boolean(isOutsourcedProject) },
            assignmentAccount
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

module.exports = { router };
