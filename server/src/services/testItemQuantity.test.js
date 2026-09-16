const test = require('node:test');
const assert = require('node:assert/strict');
const { extractIntegerQuantity } = require('./testItemQuantity');

test('正式开单数量从业务填写内容中提取第一个正整数', () => {
  assert.equal(extractIntegerQuantity('2个小时'), 2);
  assert.equal(extractIntegerQuantity('共 12 件'), 12);
  assert.equal(extractIntegerQuantity('３份'), 3);
  assert.equal(extractIntegerQuantity(8), 8);
  assert.equal(extractIntegerQuantity('未填写'), null);
  assert.equal(extractIntegerQuantity('0.5小时'), null);
});
