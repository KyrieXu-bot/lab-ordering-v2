const express = require('express');
const { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell } = require('docx');
const router = express.Router();

function para(text){ return new Paragraph({ children: [ new TextRun(String(text||'')) ] }); }
function head(text){ return new Paragraph({ text: String(text||''), heading: HeadingLevel.HEADING_2 }); }

router.post('/commission', async (req, res, next) => {
  try {
    const d = req.body || {};
    const doc = new Document({ sections: [{
      properties: {},
      children: [
        head("检测委托合同 / Testing Application Contract"),
        para(`委托单号: ${d.order_num || ''}`),
        para(`客户: ${d.customer_name || ''}`),
        para(`付款方: ${d.payer_name || ''}`),
        para("—— 报告要求 ——"),
        para(`类型: ${(d.reportContent1Symbol==='☑'?'图片汇总 ':'')}${(d.reportContent2Symbol==='☑'?'中文报告 ':'')}${(d.reportContent3Symbol==='☑'?'英文报告 ':'')}`),
        para(`纸质寄送: ${(d.paperReportType1Symbol==='☑'?'到委托方 ':'')}${(d.paperReportType2Symbol==='☑'?'到付款方 ':'')}${(d.paperReportType3Symbol==='☑'?'其他 ':'')}`),
        head("检测项目"),
        new Table({
          rows: [
            new TableRow({ children: ['序号','项目','方法','数量','备注'].map(t => new TableCell({ children: [para(t)] })) }),
            ...(d.testItems||[]).map(it => new TableRow({ children: [
              new TableCell({ children: [para(it.idx||'')] }),
              new TableCell({ children: [para(it.test_item||'')] }),
              new TableCell({ children: [para(it.test_method||'')] }),
              new TableCell({ children: [para(it.quantity||'')] }),
              new TableCell({ children: [para(it.note||'')] }),
            ] }))
          ]
        }),
        head("重要说明"),
        para(d.other_requirements || '')
      ]
    }]});

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=commission.docx');
    res.send(buffer);
  } catch (e) { next(e); }
});

router.post('/sample-flow', async (req, res, next) => {
  try {
    const d = req.body || {};
    const doc = new Document({ sections: [{
      properties: {},
      children: [
        head("样品流转单 / Sample Flow"),
        para(`委托单号: ${d.order_num || ''}`),
        para(`收样日期: ${d.sampleReceivedDate || ''}`),
        para(`实验室: 力学${d.showMechanicsTable?'☑':'☐'}  显微${d.showMicroTable?'☑':'☐'}  物化${d.showPhyschemTable?'☑':'☐'}`),
        head("项目列表"),
        ...['mechanicsItems','microItems','physchemItems','machiningItems'].flatMap(key => {
          const list = d[key]||[];
          if (!list.length) return [];
          return [
            para(`— ${key} —`),
            new Table({
              rows: [
                new TableRow({ children: ['序号','样品号','项目','方法','数量','备注'].map(t => new TableCell({ children: [para(t)] })) }),
                ...list.map(it => new TableRow({ children: [
                  new TableCell({ children: [para(it.idx||'')] }),
                  new TableCell({ children: [para(it.sample_code||'')] }),
                  new TableCell({ children: [para(it.test_item||'')] }),
                  new TableCell({ children: [para(it.method||'')] }),
                  new TableCell({ children: [para(it.quantity||'')] }),
                  new TableCell({ children: [para(it.note||'')] }),
                ] }))
              ]
            })
          ];
        })
      ]
    }]});

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=sample-flow.docx');
    res.send(buffer);
  } catch (e) { next(e); }
});

module.exports = { router };
