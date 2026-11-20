import test from 'node:test';
import assert from 'node:assert/strict';
import { decideChime, isDue, isQuietHours, hourKey } from '../src/logic/reminder.js';

const base = { quietHoursEnabled: true, quietStart: 22, quietEnd: 8 };

test('isDue 按分钟判断', () => {
  const now = 1_000_000_000;
  assert.equal(isDue(now - 44 * 60 * 1000, 45, now), false);
  assert.equal(isDue(now - 45 * 60 * 1000, 45, now), true);
});

test('免打扰时段支持跨零点', () => {
  const at = (h) => isQuietHours(base, new Date(2026, 0, 1, h, 0, 0));
  assert.equal(at(22), true);
  assert.equal(at(23), true);
  assert.equal(at(3), true);
  assert.equal(at(7), true);
  assert.equal(at(8), false);
  assert.equal(at(15), false);
  assert.equal(isQuietHours({ ...base, quietHoursEnabled: false }, new Date(2026, 0, 1, 23)), false);
  assert.equal(isQuietHours({ ...base, quietStart: 8, quietEnd: 8 }, new Date(2026, 0, 1, 8)), false);
});

test('整点报时改为检测跨小时，不再要求恰好 0 分 0 秒', () => {
  const at = new Date(2026, 10, 17, 10, 1, 5);
  const first = decideChime('2026-11-17-9', at);
  assert.equal(first.fire, true);
  assert.equal(first.key, '2026-11-17-10');

  const sameHour = decideChime(first.key, new Date(2026, 10, 17, 10, 30, 0));
  assert.equal(sameHour.fire, false);

  const lateWake = decideChime('2026-11-17-10', new Date(2026, 10, 17, 11, 40, 0));
  assert.equal(lateWake.fire, false);
  assert.equal(lateWake.key, '2026-11-17-11');
});

test('hourKey 包含日期避免跨天误判', () => {
  assert.equal(hourKey(new Date(2026, 0, 2, 9, 0, 0)), '2026-1-2-9');
});
