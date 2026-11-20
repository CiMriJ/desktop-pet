import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, mergeConfig } from '../src/logic/config.js';

test('默认配置保持完整', () => {
  const cfg = mergeConfig({});
  assert.equal(cfg.version, 2);
  assert.equal(cfg.scale, 1);
  assert.equal(cfg.waterReminderMinutes, 45);
  assert.equal(cfg.pomodoroWorkMinutes, 25);
  assert.deepEqual(cfg.affection, { yier: 0, bubu: 0 });
});

test('数值会被夹到安全范围', () => {
  const cfg = mergeConfig({
    scale: 9,
    waterReminderMinutes: 1,
    restReminderMinutes: 999,
    pomodoroWorkMinutes: 0,
    pomodoroBreakMinutes: 999,
    quietStart: 99,
  });
  assert.equal(cfg.scale, 1.5);
  assert.equal(cfg.waterReminderMinutes, 5);
  assert.equal(cfg.restReminderMinutes, 240);
  assert.equal(cfg.pomodoroWorkMinutes, 5);
  assert.equal(cfg.pomodoroBreakMinutes, 60);
  assert.equal(cfg.quietStart, 23);
});

test('v1 的坐标语义不同，升级时重置位置', () => {
  const cfg = mergeConfig({ yierPos: { x: 100, y: 100 }, bubuPos: { x: 200, y: 200 } });
  assert.equal(cfg.yierPos, null);
  assert.equal(cfg.bubuPos, null);
});

test('v2 坐标和好感度会保留', () => {
  const cfg = mergeConfig({
    version: 2,
    yierPos: { x: 120.4, y: 700.6 },
    bubuPos: { x: 'bad', y: 1 },
    affection: { yier: 34, bubu: -5 },
  });
  assert.deepEqual(cfg.yierPos, { x: 120, y: 701 });
  assert.equal(cfg.bubuPos, null);
  assert.deepEqual(cfg.affection, { yier: 34, bubu: 0 });
});

test('布尔值和未知字段被安全处理', () => {
  const cfg = mergeConfig({ showYier: 0, soundEnabled: 'yes', unknownKey: 'x' });
  assert.equal(cfg.showYier, false);
  assert.equal(cfg.soundEnabled, true);
  assert.equal('unknownKey' in cfg, false);
  assert.equal(cfg.version, DEFAULT_CONFIG.version);
});
