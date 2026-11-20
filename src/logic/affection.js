const LEVELS = Object.freeze([
  { min: 0, title: '初次见面' },
  { min: 10, title: '有点熟了' },
  { min: 30, title: '好朋友' },
  { min: 60, title: '形影不离' },
  { min: 100, title: '灵魂伴侣' },
]);

export function levelIndex(points) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (points >= LEVELS[i].min) idx = i;
  }
  return idx;
}

export function levelInfo(points) {
  const value = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  const index = levelIndex(value);
  const current = LEVELS[index];
  const next = LEVELS[index + 1] || null;
  const span = next ? next.min - current.min : 0;
  const progress = next ? Math.min(1, (value - current.min) / span) : 1;
  return { level: index + 1, title: current.title, points: value, next, progress };
}

export { LEVELS };
