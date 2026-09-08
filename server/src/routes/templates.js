const express = require('express');
const pool = require('../db');
const { generateOrderTemplateBuffer } = require('../services/orderTemplate');
const { generateProcessTemplateBuffer } = require('../services/processTemplate');

const router = express.Router();

// 生成委托单模板
router.post('/generate-order-template', async (req, res) => {
  try {
    const templateData = req.body;
    console.log('收到委托单模板数据，字段数量:', Object.keys(templateData).length);
    
    const report = await generateOrderTemplateBuffer(templateData);
    console.log('文档生成成功，大小:', report.length);

    // 设置响应头（命名：委托单号+客户名称+委托联系人名称）
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const safe = (s) => (typeof s === 'string' ? s.trim() : '');
    const fileName = `${safe(templateData.order_num)}-${safe(templateData.customer_name)}-${safe(templateData.customer_contactName)}.docx`;
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    
    // 发送文档
    console.log('开始发送文档...');
    res.send(report);
    console.log('文档发送完成');
  } catch (error) {
    console.error('生成委托单模板错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ error: '生成委托单模板失败', details: error.message });
  }
});

// 生成流转单模板
router.post('/generate-process-template', async (req, res) => {
  try {
    const flowData = req.body;
    console.log('收到流转单模板数据，字段数量:', Object.keys(flowData).length);
    
    const report = await generateProcessTemplateBuffer(flowData);
    console.log('流转单文档生成成功，大小:', report.length);

    const [[commissioner]] = await pool.query(
      `SELECT m.commissioner_name, m.contact_name
       FROM orders o
       LEFT JOIN commissioners m ON m.commissioner_id = o.commissioner_id
       WHERE o.order_id = ? LIMIT 1`,
      [flowData.order_num]
    );

    // 设置响应头（命名：委托单号-委托方名称-委托联系人名称）
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const safe = (s) => (typeof s === 'string' ? s.trim() : '');
    const fileName = `${safe(flowData.order_num)}-${safe(commissioner?.commissioner_name || flowData.commissioner_name || flowData.customer_name)}-${safe(commissioner?.contact_name || flowData.contact_name || flowData.customer_contactName)}.docx`;
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    
    // 发送文档
    console.log('开始发送流转单文档...');
    res.send(report);
    console.log('流转单文档发送完成');
  } catch (error) {
    console.error('生成流转单模板错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ error: '生成流转单模板失败', details: error.message });
  }
});

module.exports = { router };
