export const PETS = Object.freeze(['yier', 'bubu']);

// version 2：位置改为「宠物中心点」的屏幕坐标，窗口尺寸/缩放变化都不会把宠物甩出屏幕。
export const DEFAULT_CONFIG = Object.freeze({
  version: 2,
  showYier: true,
  showBubu: true,
  scale: 1,
  alwaysOnTop: true,
  locked: false,
  soundEnabled: true,
  showClock: true,
  waterReminderEnabled: true,
  waterReminderMinutes: 45,
  restReminderEnabled: true,
  restReminderMinutes: 60,
  chimeEnabled: true,
  quietHoursEnabled: false,
  quietStart: 22,
  quietEnd: 8,
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  autoLaunch: false,
  yierPos: null,
  bubuPos: null,
  affection: { yier: 0, bubu: 0 },
  lastWaterAt: 0,
  lastRestAt: 0,
  lastChimeKey: '',
});

const BOOL_KEYS = [
  'showYier', 'showBubu', 'alwaysOnTop', 'locked', 'soundEnabled', 'showClock',
  'waterReminderEnabled', 'restReminderEnabled', 'chimeEnabled',
  'quietHoursEnabled', 'autoLaunch',
];

function clampNumber(value, min, max, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function clampInt(value, min, max, fallback) {
  return Math.round(clampNumber(value, min, max, fallback));
}

function sanitizePosition(pos) {
  if (!pos || typeof pos !== 'object') return null;
  const { x, y } = pos;
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (Math.abs(x) > 200000 || Math.abs(y) > 200000) return null;
  return { x: Math.round(x), y: Math.round(y) };
}

function sanitizeAffection(value) {
  const src = value && typeof value === 'object' ? value : {};
  const out = {};
  for (const pet of PETS) out[pet] = clampInt(src[pet], 0, 9999, 0);
  return out;
}

function sanitizeTimestamp(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

export function mergeConfig(partial) {
  const src = partial && typeof partial === 'object' ? partial : {};
  const out = { ...DEFAULT_CONFIG, affection: { ...DEFAULT_CONFIG.affection } };

  for (const key of BOOL_KEYS) {
    if (key in src) out[key] = !!src[key];
  }

  out.scale = Math.round(clampNumber(src.scale, 0.7, 1.5, DEFAULT_CONFIG.scale) * 100) / 100;
  out.waterReminderMinutes = clampInt(src.waterReminderMinutes, 5, 240, DEFAULT_CONFIG.waterReminderMinutes);
  out.restReminderMinutes = clampInt(src.restReminderMinutes, 5, 240, DEFAULT_CONFIG.restReminderMinutes);
  out.quietStart = clampInt(src.quietStart, 0, 23, DEFAULT_CONFIG.quietStart);
  out.quietEnd = clampInt(src.quietEnd, 0, 23, DEFAULT_CONFIG.quietEnd);
  out.pomodoroWorkMinutes = clampInt(src.pomodoroWorkMinutes, 5, 120, DEFAULT_CONFIG.pomodoroWorkMinutes);
  out.pomodoroBreakMinutes = clampInt(src.pomodoroBreakMinutes, 1, 60, DEFAULT_CONFIG.pomodoroBreakMinutes);

  // v1 的位置是「全屏窗口内宠物左上角」，与 v2 的窗口坐标不兼容，升级时直接重置为默认位置。
  const isLegacy = src.version !== 2;
  out.yierPos = isLegacy ? null : sanitizePosition(src.yierPos);
  out.bubuPos = isLegacy ? null : sanitizePosition(src.bubuPos);

  out.affection = sanitizeAffection(src.affection);
  out.lastWaterAt = sanitizeTimestamp(src.lastWaterAt);
  out.lastRestAt = sanitizeTimestamp(src.lastRestAt);
  out.lastChimeKey = typeof src.lastChimeKey === 'string' ? src.lastChimeKey.slice(0, 40) : '';

  out.version = 2;
  return out;
}

export function parseConfig(text) {
  if (!text || typeof text !== 'string') return { ...DEFAULT_CONFIG };
  try {
    return mergeConfig(JSON.parse(text));
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
