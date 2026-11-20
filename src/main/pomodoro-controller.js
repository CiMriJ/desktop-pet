import {
  PHASE, createState, formatRemaining, progress, remainingMs, startPhase, tick,
} from '../logic/pomodoro.js';

export class PomodoroController {
  constructor({ getConfig, onUpdate, onFinish }) {
    this.getConfig = getConfig;
    this.onUpdate = onUpdate;
    this.onFinish = onFinish;
    this.state = createState();
    this.timer = null;
  }

  isWorking() {
    return this.state.phase === PHASE.WORK;
  }

  isRunning() {
    return this.state.phase !== PHASE.IDLE;
  }

  snapshot() {
    const now = Date.now();
    const remaining = remainingMs(this.state, now);
    return {
      phase: this.state.phase,
      running: this.state.phase !== PHASE.IDLE,
      remainingMs: remaining,
      totalMs: this.state.totalMs,
      progress: progress(this.state, now),
      label: formatRemaining(remaining),
    };
  }

  start() {
    const cfg = this.getConfig();
    this.state = startPhase(PHASE.WORK, cfg.pomodoroWorkMinutes, Date.now());
    this.ensureTimer();
    this.emit(true);
    return this.snapshot();
  }

  stop() {
    this.clearTimer();
    this.state = createState();
    this.emit(true);
    return this.snapshot();
  }

  toggle() {
    return this.isRunning() ? this.stop() : this.start();
  }

  ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => this.step(), 500);
  }

  clearTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  step() {
    const now = Date.now();
    const result = tick(this.state, now);
    if (result.finished) {
      this.state = result.state;
      if (result.finished === PHASE.WORK) {
        const cfg = this.getConfig();
        this.state = startPhase(PHASE.BREAK, cfg.pomodoroBreakMinutes, now);
        this.onFinish(PHASE.WORK, cfg.pomodoroBreakMinutes);
      } else {
        this.onFinish(PHASE.BREAK, 0);
        this.clearTimer();
      }
    }
    this.emit();
  }

  emit(force = false) {
    const snap = this.snapshot();
    // 500ms 的 tick 里有一半是重复内容（徽章只显示到秒），跳过无变化的广播，
    // 少一半 IPC 和渲染层/托盘的无效重绘。
    const key = `${snap.phase}|${snap.label}|${Math.round(snap.progress * 50)}`;
    if (!force && key === this.lastKey) return;
    this.lastKey = key;
    this.onUpdate(snap);
  }

  destroy() {
    this.clearTimer();
  }
}
