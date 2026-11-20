import test from 'node:test';
import assert from 'node:assert/strict';
import { levelInfo } from '../src/logic/affection.js';

test('好感度等级边界', () => {
  assert.equal(levelInfo(0).title, '初次见面');
  assert.equal(levelInfo(9).title, '初次见面');
  assert.equal(levelInfo(10).title, '有点熟了');
  assert.equal(levelInfo(29).title, '有点熟了');
  assert.equal(levelInfo(30).title, '好朋友');
  assert.equal(levelInfo(60).title, '形影不离');
  assert.equal(levelInfo(100).title, '灵魂伴侣');
});

test('阶段进度计算', () => {
  assert.equal(levelInfo(5).progress, 0.5);
  assert.equal(levelInfo(20).progress, 0.5);
  assert.equal(levelInfo(100).progress, 1);
  assert.equal(levelInfo(-3).points, 0);
});
