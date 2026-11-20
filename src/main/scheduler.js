import { decideChime, isDue, isQuietHours } from '../logic/reminder.js';
import { pickLine } from '../logic/lines.js';

const TICK_MS = 15000;
const SLEEP_AFTER_SECONDS = 5 * 60; // 系统空闲 5 分钟后宠物睡觉
const STALE_MS = 2 * 60 * 60 * 1000; // 关机/休眠超过 2 小时，不补发提醒

export function createScheduler({
  getConfig,
  persistConfig,
  notify,
  chime,
  idleSeconds,
  setSleeping,
  visiblePets,
  isFocusing,
}) {
  let timer = null;

  function pickTarget() {
    const pets = visiblePets();
    if (pets.length === 0) return null;
    return pets[Math.floor(Math.random() * pets.length)];
  }

  function reminderPatch(lastAt, enabled, minutes, now) {
    if (!enabled) return null;
    if (!lastAt) return { next: now, fire: false };
    const interval = minutes * 60 * 1000;
    if (now - lastAt > Math.max(interval * 3, STALE_MS)) {
      return { next: now, fire: false };
    }
    if (isDue(lastAt, minutes, now)) return { next: now, fire: true };
    return null;
  }

  function tick() {
    const cfg = getConfig();
    const now = Date.now();
    const date = new Date();
    const quiet = isQuietHours(cfg, date);
    const patch = {};

    const water = reminderPatch(cfg.lastWaterAt, cfg.waterReminderEnabled, cfg.waterReminderMinutes, now);
    if (water) {
      patch.lastWaterAt = water.next;
      if (water.fire && !quiet) {
        const pet = pickTarget();
        if (pet) notify(pet, pickLine(pet, 'water'), 'reminder');
      }
    }

    const rest = reminderPatch(cfg.lastRestAt, cfg.restReminderEnabled, cfg.restReminderMinutes, now);
    if (rest) {
      patch.lastRestAt = rest.next;
      if (rest.fire && !quiet) {
        const pet = pickTarget();
        if (pet) notify(pet, pickLine(pet, 'rest'), 'reminder');
      }
    }

    if (cfg.chimeEnabled) {
      const decision = decideChime(cfg.lastChimeKey, date);
      if (decision.key !== cfg.lastChimeKey) patch.lastChimeKey = decision.key;
      if (decision.fire && !quiet) {
        const pet = pickTarget();
        if (pet) chime(pet, pickLine(pet, 'chime', Math.random, { hour: date.getHours() }));
      }
    }

    if (Object.keys(patch).length > 0) persistConfig(patch);

    try {
      const shouldSleep = idleSeconds() >= SLEEP_AFTER_SECONDS && !isFocusing();
      for (const pet of visiblePets()) setSleeping(pet, shouldSleep);
    } catch {
      // powerMonitor 在某些环境不可用时忽略空闲检测
    }
  }

  function test(kind) {
    const pet = pickTarget();
    if (!pet) return { ok: false, error: '当前没有显示中的宠物' };
    if (kind === 'rest') notify(pet, pickLine(pet, 'rest'), 'reminder');
    else if (kind === 'chime') chime(pet, pickLine(pet, 'chime', Math.random, { hour: new Date().getHours() }));
    else notify(pet, pickLine(pet, 'water'), 'reminder');
    return { ok: true };
  }

  function start() {
    tick();
    timer = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  // 系统从休眠恢复：重置计时，避免醒来一次弹好几条提醒
  function resetTimers() {
    const now = Date.now();
    persistConfig({ lastWaterAt: now, lastRestAt: now, lastChimeKey: '' });
  }

  return { start, stop, test, resetTimers, tick };
}
