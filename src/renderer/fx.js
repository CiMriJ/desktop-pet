let audioCtx = null;

function context() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(ac, freq, startAt, duration, gain = 0.05) {
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0.0001, startAt);
  env.gain.exponentialRampToValueAtTime(gain, startAt + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(env);
  env.connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.03);
}

// 不依赖音频文件：用 Web Audio 合成柔和的提示音。
export function playSound(kind) {
  try {
    const ac = context();
    const t0 = ac.currentTime + 0.01;
    if (kind === 'hour') {
      [523.25, 659.25, 783.99].forEach((f, i) => tone(ac, f, t0 + i * 0.12, 0.26));
    } else if (kind === 'done') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, t0 + i * 0.1, 0.32));
    } else {
      [659.25, 880].forEach((f, i) => tone(ac, f, t0 + i * 0.11, 0.22));
    }
  } catch {
    // 音频设备不可用时静默
  }
}

const HEART_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 21s-7-4.6-9.2-9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.2 6C19 16.4 12 21 12 21z"/></svg>';
const COOKIE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="9" fill="#d9a05b"/><circle cx="9" cy="9" r="1.4" fill="#7a4a22"/><circle cx="14" cy="10" r="1.2" fill="#7a4a22"/><circle cx="11" cy="14" r="1.3" fill="#7a4a22"/><circle cx="15" cy="15" r="1" fill="#7a4a22"/></svg>';

function spawnParticle(container, className, html, dxRange, life = 1500) {
  const particle = document.createElement('span');
  particle.className = `particle ${className}`;
  particle.style.setProperty('--dx', `${(Math.random() - 0.5) * dxRange}px`);
  particle.style.setProperty('--rot', `${(Math.random() - 0.5) * 60}deg`);
  particle.style.animationDelay = `${Math.random() * 0.2}s`;
  particle.innerHTML = html;
  container.appendChild(particle);
  setTimeout(() => particle.remove(), life);
}

export function spawnHearts(container, count = 3) {
  for (let i = 0; i < count; i += 1) spawnParticle(container, 'heart', HEART_SVG, 80);
}

export function spawnFood(container) {
  spawnParticle(container, 'food', COOKIE_SVG, 20, 1800);
}
