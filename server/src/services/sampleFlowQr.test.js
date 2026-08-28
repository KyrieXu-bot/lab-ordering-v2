const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateQrPlacement } = require('./sampleFlowQr');

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
