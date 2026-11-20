import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHASE, createState, formatRemaining, progress, remainingMs, startPhase, tick,
} from '../src/logic/pomodoro.js';

test('开始专注后倒计时正确', () => {
  const now = 1000;
  const state = startPhase(PHASE.WORK, 25, now);
  assert.equal(state.phase, PHASE.WORK);
  assert.equal(remainingMs(state, now), 25 * 60 * 1000);
  assert.equal(remainingMs(state, now + 60 * 1000), 24 * 60 * 1000);
  assert.equal(progress(state, now + 12.5 * 60 * 1000), 0.5);
});

test('到点后 tick 返回完成的阶段并清空状态', () => {
  const state = startPhase(PHASE.WORK, 1, 0);
  const early = tick(state, 1000);
  assert.equal(early.finished, null);
  const done = tick(state, 60 * 1000);
  assert.equal(done.finished, PHASE.WORK);
  assert.equal(done.state.phase, PHASE.IDLE);
});

test('空闲状态不会误触发', () => {
  const state = createState();
  assert.equal(tick(state, Date.now()).finished, null);
  assert.equal(remainingMs(state, Date.now()), 0);
  assert.equal(progress(state, Date.now()), 0);
});

test('剩余时间格式化', () => {
  assert.equal(formatRemaining(0), '00:00');
  assert.equal(formatRemaining(65 * 1000), '01:05');
  assert.equal(formatRemaining(-5000), '00:00');
});
