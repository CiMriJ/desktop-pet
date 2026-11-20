export function isDue(lastTimestamp, intervalMinutes, now) {
  return now - lastTimestamp >= intervalMinutes * 60 * 1000;
}

export function nextDueTimestamp(lastTimestamp, intervalMinutes) {
  return lastTimestamp + intervalMinutes * 60 * 1000;
}

// 免打扰时段；start === end 视为不生效，避免「整天静音」这种误配置。
export function isQuietHours(cfg, date) {
  if (!cfg || !cfg.quietHoursEnabled) return false;
  const start = cfg.quietStart;
  const end = cfg.quietEnd;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start === end) return false;
  const hour = date.getHours();
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function hourKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
}

// 整点报时：不再要求「恰好 0 分 0 秒」，而是检测小时是否跨过。
// 只在整点后 2 分钟内补报，避免电脑休眠几小时后醒来连报好几声。
export function decideChime(lastKey, date) {
  const key = hourKey(date);
  if (key === lastKey) return { key, fire: false };
  return { key, fire: date.getMinutes() <= 2 };
}
