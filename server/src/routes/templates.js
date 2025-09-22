const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const router = express.Router();

// 生成委托单模板
router.post('/generate-order-template', async (req, res) => {
  try {
    const templateData = req.body;
    console.log('收到委托单模板数据，字段数量:', Object.keys(templateData).length);
    
    // 模板文件路径
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'order_template.docx');
    console.log('模板文件路径:', templatePath);
    
    // 检查模板文件是否存在
    try {
      await fs.access(templatePath);
      console.log('模板文件存在');
    } catch (error) {
      console.error('模板文件不存在:', error);
      return res.status(404).json({ error: '委托单模板文件不存在' });
    }

    // 读取模板文件
    console.log('开始读取模板文件...');
    const templateBuffer = await fs.readFile(templatePath);
    console.log('模板文件大小:', templateBuffer.length);
    
    if (templateBuffer.length === 0) {
      throw new Error('模板文件为空');
    }
    
    // 生成文档
    console.log('开始创建PizZip...');
    const zip = new PizZip(templateBuffer);
    console.log('PizZip创建成功');
    
    console.log('开始创建Docxtemplater...');
    const doc = new Docxtemplater(zip);
    console.log('Docxtemplater创建成功');
    
    // 设置数据
    console.log('开始设置数据...');
    doc.setData(templateData);
    console.log('数据设置成功');
    
    // 渲染文档
    console.log('开始渲染文档...');
    try {
      doc.render();
      console.log('文档渲染成功');
    } catch (renderError) {
      console.error('文档渲染失败:', renderError);
      throw new Error(`文档渲染失败: ${renderError.message}`);
    }
    
    // 生成最终文档
    console.log('开始生成最终文档...');
    const report = doc.getZip().generate({ type: 'nodebuffer' });
    console.log('文档生成成功，大小:', report.length);

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const fileName = `委托单模板_${templateData.order_num || 'template'}.docx`;
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
    
    // 模板文件路径
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'process_template.docx');
    console.log('流转单模板文件路径:', templatePath);
    
    // 检查模板文件是否存在
    try {
      await fs.access(templatePath);
      console.log('流转单模板文件存在');
    } catch (error) {
      console.error('流转单模板文件不存在:', error);
      return res.status(404).json({ error: '流转单模板文件不存在' });
    }

    // 读取模板文件
    console.log('开始读取流转单模板文件...');
    const templateBuffer = await fs.readFile(templatePath);
    console.log('流转单模板文件大小:', templateBuffer.length);
    
    if (templateBuffer.length === 0) {
      throw new Error('流转单模板文件为空');
    }
    
    // 生成文档
    console.log('开始创建流转单PizZip...');
    const zip = new PizZip(templateBuffer);
    console.log('流转单PizZip创建成功');
    
    console.log('开始创建流转单Docxtemplater...');
    const doc = new Docxtemplater(zip);
    console.log('流转单Docxtemplater创建成功');
    
    // 设置数据
    console.log('开始设置流转单数据...');
    doc.setData(flowData);
    console.log('流转单数据设置成功');
    
    // 渲染文档
    console.log('开始渲染流转单文档...');
    try {
      doc.render();
      console.log('流转单文档渲染成功');
    } catch (renderError) {
      console.error('流转单文档渲染失败:', renderError);
      throw new Error(`流转单文档渲染失败: ${renderError.message}`);
    }
    
    // 生成最终文档
    console.log('开始生成最终流转单文档...');
    const report = doc.getZip().generate({ type: 'nodebuffer' });
    console.log('流转单文档生成成功，大小:', report.length);

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const fileName = `流转单模板_${flowData.order_num || 'template'}.docx`;
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
