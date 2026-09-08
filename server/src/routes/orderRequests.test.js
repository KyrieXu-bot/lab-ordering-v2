const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFlowDocumentFilename, reviewerOrderBySql, linkExistingRequirementsToAddedTests } = require('./orderRequests');

test('流转单按正式单号、commissioners 委托方名称和联系人命名', () => {
  assert.equal(
    buildFlowDocumentFilename('JC2609001', '南京集萃材料', '张三'),
    'JC2609001-南京集萃材料-张三.docx'
  );
  assert.equal(
    buildFlowDocumentFilename('JC/2609001', '委托:方', '张/三'),
    'JC_2609001-委托_方-张_三.docx'
  );
});

test('开单员申请队列将无正式单号申请置前，其余按正式单号升序', () => {
  const sql = reviewerOrderBySql('DISPLAY_ORDER_ID');
  assert.match(sql, /DISPLAY_ORDER_ID IS NULL/);
  assert.match(sql, /DISPLAY_ORDER_ID ASC/);
  assert.doesNotMatch(sql, /DISPLAY_ORDER_ID DESC/);
});

test('加测项目继承原委托单在 LIMS 中仍有效的需求单附件', async () => {
  const inserts = [];
  const connection = {
    async query(sql, params) {
      if (sql.includes('FROM order_request_files f')) {
        assert.deepEqual(params, ['ORDER001', 55, 'ORDER001']);
        assert.match(sql, /EXISTS \(/);
        return [[{
          original_filename: '测试需求.docx',
          stored_path: 'order-request-attachments/1/requirement.docx',
          created_by: 'YW001'
        }]];
      }
      if (sql.includes('INSERT INTO project_files')) {
        inserts.push(params);
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  await linkExistingRequirementsToAddedTests(connection, 'ORDER001', [101, 102], 55);
  assert.equal(inserts.length, 2);
  assert.deepEqual(inserts.map((params) => params[3]), [101, 102]);
  assert.ok(inserts.every((params) => params[2] === 'ORDER001'));
});
