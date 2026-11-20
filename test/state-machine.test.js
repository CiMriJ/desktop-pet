import test from 'node:test';
import assert from 'node:assert/strict';
import { STATES, transition } from '../src/logic/state-machine.js';

test('拖拽优先于其他事件', () => {
  assert.equal(transition(STATES.IDLE, 'GRAB'), STATES.DRAG);
  assert.equal(transition(STATES.NOTIFY, 'GRAB'), STATES.DRAG);
  assert.equal(transition(STATES.DRAG, 'POKE'), STATES.DRAG);
  assert.equal(transition(STATES.DRAG, 'DROP'), STATES.IDLE);
});

test('瞬态结束后回到待机', () => {
  assert.equal(transition(STATES.IDLE, 'POKE'), STATES.POKE);
  assert.equal(transition(STATES.POKE, 'DONE'), STATES.IDLE);
  assert.equal(transition(STATES.SLEEP, 'WAKE'), STATES.IDLE);
  assert.equal(transition(STATES.IDLE, 'SLEEP'), STATES.SLEEP);
});

test('未知事件保持原状态', () => {
  assert.equal(transition(STATES.IDLE, 'SOMETHING'), STATES.IDLE);
});
