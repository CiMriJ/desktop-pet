export const PHASE = Object.freeze({ IDLE: 'idle', WORK: 'work', BREAK: 'break' });

export function createState() {
  return { phase: PHASE.IDLE, endAt: 0, totalMs: 0 };
}

export function startPhase(phase, minutes, now) {
  const totalMs = Math.max(1, minutes) * 60 * 1000;
  return { phase, endAt: now + totalMs, totalMs };
}

export function remainingMs(state, now) {
  if (!state || state.phase === PHASE.IDLE) return 0;
  return Math.max(0, state.endAt - now);
}

export function progress(state, now) {
  if (!state || state.phase === PHASE.IDLE || state.totalMs <= 0) return 0;
  const used = state.totalMs - remainingMs(state, now);
  return Math.min(1, Math.max(0, used / state.totalMs));
}

// 到点则返回 finished=phase，并把 state 置回 idle；调用方决定下一阶段。
export function tick(state, now) {
  if (!state || state.phase === PHASE.IDLE || now < state.endAt) {
    return { state, finished: null };
  }
  return { state: createState(), finished: state.phase };
}

export function formatRemaining(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
