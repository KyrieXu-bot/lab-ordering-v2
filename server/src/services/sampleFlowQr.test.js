const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSampleFlowScanUrl, calculateQrPlacement, createSampleFlowToken, sampleFlowTokenPersistencePlan } = require('./sampleFlowQr');

const MM_TO_POINTS = 72 / 25.4;

test('二维码在纵向和横向 A4 页面均位于页眉任务编号左侧', () => {
  const portrait = calculateQrPlacement(210 * MM_TO_POINTS, 297 * MM_TO_POINTS);
  const landscapeFirst = calculateQrPlacement(297 * MM_TO_POINTS, 210 * MM_TO_POINTS, {
    isFirstLandscapePage: true
  });
  const landscapeContinuation = calculateQrPlacement(297 * MM_TO_POINTS, 210 * MM_TO_POINTS);

  for (const placement of [portrait, landscapeFirst, landscapeContinuation]) {
    assert.equal(placement.size, 15 * MM_TO_POINTS);
    assert.ok(placement.x > 0);
    assert.ok(placement.y > 0);
  }

  assert.ok(Math.abs((297 * MM_TO_POINTS - portrait.y - portrait.size) - (7 * MM_TO_POINTS)) < 0.001);
  assert.ok(Math.abs((210 * MM_TO_POINTS - landscapeFirst.y - landscapeFirst.size) - (7 * MM_TO_POINTS)) < 0.001);
  assert.ok(Math.abs((210 * MM_TO_POINTS - landscapeContinuation.y - landscapeContinuation.size) - (7 * MM_TO_POINTS)) < 0.001);
  assert.ok(Math.abs(portrait.x - (210 - 56 - 15) * MM_TO_POINTS) < 0.001);
  assert.ok(Math.abs(landscapeFirst.x - (297 - 71 - 15) * MM_TO_POINTS) < 0.001);
  assert.ok(Math.abs(landscapeContinuation.x - (297 - 86 - 15) * MM_TO_POINTS) < 0.001);
});

test('加测或修改 PDF 复用原申请二维码但不向后续申请重复写入唯一 token', () => {
  assert.deepEqual(sampleFlowTokenPersistencePlan(22, 22, null), {
    writeCurrentToken: true,
    writeBaseToken: false
  });
  assert.deepEqual(sampleFlowTokenPersistencePlan(22, 27, 'SF_existing'), {
    writeCurrentToken: false,
    writeBaseToken: false
  });
  assert.deepEqual(sampleFlowTokenPersistencePlan(22, 27, null), {
    writeCurrentToken: false,
    writeBaseToken: true
  });
});

test('样品流转 token 使用统一的 SF 随机格式', () => {
  const first = createSampleFlowToken();
  const second = createSampleFlowToken();
  assert.match(first, /^SF_[A-Za-z0-9_-]{24}$/);
  assert.match(second, /^SF_[A-Za-z0-9_-]{24}$/);
  assert.notEqual(first, second);
  assert.match(buildSampleFlowScanUrl(first), new RegExp(`token=${first}$`));
});
