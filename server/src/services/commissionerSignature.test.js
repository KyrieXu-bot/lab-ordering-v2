const test = require('node:test');
const assert = require('node:assert/strict');
const {
  commissionerSignaturePath,
  isPngBuffer,
  normalizeCommissionerId
} = require('./commissionerSignature');

test('委托方签名文件严格使用 commissioner_id.png', () => {
  assert.equal(normalizeCommissionerId('133'), '133');
  assert.match(commissionerSignaturePath('133'), /commissioner-signatures[\\/]133\.png$/);
  assert.equal(normalizeCommissionerId('../133'), null);
  assert.equal(commissionerSignaturePath('../133'), null);
});

test('签名上传只接受真实 PNG 文件头', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
  assert.equal(isPngBuffer(png), true);
  assert.equal(isPngBuffer(Buffer.from('not a png')), false);
});
