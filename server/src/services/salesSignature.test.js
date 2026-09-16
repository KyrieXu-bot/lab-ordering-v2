const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeUserId,
  isPngBuffer,
  signaturePathForUser,
  syncRequestSalesperson
} = require('./salesSignature');

test('电子签名路径只接受安全的 user_id', () => {
  assert.equal(normalizeUserId('YW0001'), 'YW0001');
  assert.equal(normalizeUserId(' JC_0089 '), 'JC_0089');
  assert.equal(normalizeUserId('../YW0001'), null);
  assert.equal(normalizeUserId('YW0001.png'), null);
  assert.match(signaturePathForUser('YW0001'), /electronic-signatures[\\/]YW0001\.png$/);
});

test('业务员签名只接受内容真实为 PNG 的文件', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
  assert.equal(isPngBuffer(png), true);
  assert.equal(isPngBuffer(jpeg), false);
});

test('申请中的服务方和签名身份由 payer.owner_user_id 覆盖', async () => {
  const queries = [];
  const database = {
    async query(sql, params) {
      queries.push({ sql, params });
      return [[{
        user_id: 'YW0008',
        account: 'sales-8',
        name: '正确联系人',
        email: 'sales8@example.com',
        phone: '13800000008'
      }]];
    }
  };
  const payload = {
    commissionData: { paymentId: 42 },
    templateData: {
      sales_user_id: 'YW9999',
      sales_name: '错误联系人',
      sales_signature_date: '2000-01-01'
    },
    formSnapshot: { formData: { salesPerson: 'wrong-account' } }
  };

  const result = await syncRequestSalesperson(database, payload, { refreshSignatureDate: true });

  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].params, [42]);
  assert.match(queries[0].sql, /p\.owner_user_id/);
  assert.equal(result.user_id, 'YW0008');
  assert.equal(payload.templateData.sales_user_id, 'YW0008');
  assert.equal(payload.templateData.sales_name, '正确联系人');
  assert.match(payload.templateData.sales_signature_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(payload.formSnapshot.salesUserId, 'YW0008');
  assert.equal(payload.formSnapshot.formData.salesPerson, 'sales-8');
});
