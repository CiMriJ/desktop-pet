import { STATES } from '../logic/state-machine.js';
import { greetingKind } from '../logic/lines.js';
import { pickLine } from '../logic/lines.js';
import { buildPetElement, renderPetInner } from './pet-view.js';
import { attachDrag } from './drag.js';
import { playSound, spawnFood, spawnHearts } from './fx.js';

const api = window.petAPI;
const PET_SIZE = 140;

export function createPetApp(pet) {
  const stage = document.getElementById('stage');
  const el = buildPetElement(pet);
  stage.appendChild(el);

  const inner = el.querySelector('.inner');
  const bubble = el.querySelector('.bubble');
  const clockEl = el.querySelector('.clock');
  const badge = el.querySelector('.badge');
  const fx = el.querySelector('.fx');

  let config = null;
  let assets = {};
  let state = STATES.IDLE;
  let sleeping = false;
  let locked = false;
  let dragging = false;
  let axisDir = 1;
  let bubbleTimer = null;
  let revertTimer = null;
  const bubbleQueue = [];
  let drag = null;

  const ASSET_STATE = {
    idle: 'idle',
    walk: 'walk',
    poke: 'poke',
    drag: 'drag',
    notify: 'notify',
    sleep: 'sleep',
    eat: 'poke',
    celebrate: 'notify',
  };

  function assetFor(visualState) {
    const key = ASSET_STATE[visualState] || 'idle';
    return assets[key] || { type: 'svg', pet, state: key };
  }

  function renderInner() {
    inner.innerHTML = renderPetInner(assetFor(state));
    inner.classList.toggle('dir-left', axisDir < 0);
  }

  // 预热各状态图片，避免第一次切换状态时出现空白帧
  function preloadAssets() {
    for (const asset of Object.values(assets)) {
      if (asset && asset.type === 'image' && asset.path) {
        const img = new window.Image();
        img.src = asset.path;
      }
    }
  }

  function playIfEnabled(kind) {
    if (config && config.soundEnabled) playSound(kind);
  }

  function setState(next, { duration = 0 } = {}) {
    state = next;
    el.dataset.state = next;
    renderInner();
    clearTimeout(revertTimer);
    if (duration > 0) {
      revertTimer = setTimeout(() => setState(STATES.IDLE), duration);
    }
    api.pet.state(pet, next);
  }

  function showNextBubble() {
    const item = bubbleQueue.shift();
    if (!item) {
      bubbleTimer = null;
      return;
    }
    bubble.textContent = item.text;
    bubble.classList.add('show');
    bubbleTimer = setTimeout(() => {
      bubble.classList.remove('show');
      bubbleTimer = setTimeout(showNextBubble, 220);
    }, item.ms);
  }

  function say(text, ms = 3200) {
    if (!text) return;
    if (bubbleQueue.length > 4) bubbleQueue.shift();
    bubbleQueue.push({ text, ms });
    if (!bubbleTimer) showNextBubble();
  }

  function applyConfig(cfg) {
    if (!cfg) return;
    config = cfg;
    locked = !!cfg.locked;
    document.documentElement.style.setProperty('--pet-size', `${Math.round(PET_SIZE * cfg.scale)}px`);
    clockEl.classList.toggle('hidden', !cfg.showClock);
    updateClock();
    reportHitRect();
  }

  // 把宠物的实际矩形告诉主进程：是否可点击 / 可拖拽由主进程按这个矩形判断。
  function reportHitRect() {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      api.pet.hitRect(pet, { x: r.left, y: r.top, w: r.width, h: r.height });
    }
  }

  function updateClock() {
    if (!config || !config.showClock) return;
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const text = `${hh}:${mm} ${d.getMonth() + 1}/${d.getDate()}`;
    // 只在文字真的变了才写 DOM，避免透明窗口每分钟白重绘一次
    if (clockEl.textContent !== text) clockEl.textContent = text;
  }

  function applyPomodoro(snapshot) {
    if (!snapshot || !snapshot.running) {
      badge.classList.add('hidden');
      return;
    }
    badge.classList.remove('hidden');
    badge.classList.toggle('break', snapshot.phase === 'break');
    badge.querySelector('.phase').textContent = snapshot.phase === 'work' ? '专注' : '休息';
    badge.querySelector('.time').textContent = snapshot.label || '';
    badge.querySelector('b').style.width = `${Math.round((snapshot.progress || 0) * 100)}%`;
  }

  function poke(text) {
    if (sleeping) {
      wake();
      return;
    }
    setState(STATES.POKE, { duration: 700 });
    say(text || pickLine(pet, 'poke'), 2200);
    spawnHearts(fx, 2);
  }

  function wake(text = '') {
    sleeping = false;
    setState(STATES.IDLE);
    say(text || pickLine(pet, 'wake'), 2800);
    spawnHearts(fx, 1);
  }

  function feed(text = '') {
    sleeping = false;
    setState(STATES.EAT, { duration: 2600 });
    say(text || pickLine(pet, 'feed'), 2600);
    spawnFood(fx);
  }

  function celebrate(text = '', sound = 'done') {
    sleeping = false;
    setState(STATES.CELEBRATE, { duration: 2600 });
    if (text) say(text, 3000);
    spawnHearts(fx, 9);
    playIfEnabled(sound);
  }

  function notify(text, sound = 'reminder') {
    sleeping = false;
    setState(STATES.NOTIFY, { duration: 4400 });
    say(text, 4200);
    playIfEnabled(sound);
  }

  function handleCommand(cmd) {
    if (!cmd || typeof cmd !== 'object') return;
    switch (cmd.type) {
      case 'state':
        if (cmd.state === STATES.WALK) {
          axisDir = cmd.dir === -1 ? -1 : 1;
          setState(STATES.WALK);
          clearTimeout(revertTimer);
          revertTimer = setTimeout(() => setState(STATES.IDLE), 8000);
        } else if (cmd.state === STATES.SLEEP) {
          sleeping = true;
          setState(STATES.SLEEP);
        } else if (cmd.state === STATES.IDLE) {
          sleeping = false;
          setState(STATES.IDLE);
        } else {
          setState(cmd.state);
        }
        break;
      case 'wake':
        wake(cmd.text);
        break;
      case 'notify':
        notify(cmd.text, cmd.sound);
        break;
      case 'poke':
        poke(cmd.text);
        break;
      case 'feed':
        feed(cmd.text);
        break;
      case 'celebrate':
        celebrate(cmd.text, cmd.sound);
        break;
      case 'config':
        applyConfig(cmd.config);
        break;
      case 'pomodoro':
        applyPomodoro(cmd.snapshot);
        break;
      default:
        break;
    }
  }

  function setupInteractions() {
    drag = attachDrag(el, {
      isLocked: () => locked,
      onLocked: () => say('位置被锁住啦，右键可以解锁~', 2200),
      onBegin: () => {
        // 按下就让主进程开始跟随光标，单击时窗口不会移动
        api.pet.dragStart(pet);
      },
      onMoveStart: () => {
        dragging = true;
        setState(STATES.DRAG);
      },
      onTap: () => {
        tapSelf();
      },
      onEnd: (wasMoved) => {
        dragging = false;
        api.pet.dragEnd(pet);
        if (wasMoved) setState(STATES.IDLE);
      },
    });

    el.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      api.pet.contextMenu(pet);
    });
  }

  async function tapSelf() {
    if (sleeping) {
      wake();
      return;
    }
    poke();
    try {
      const result = await api.pet.tap(pet);
      if (result && result.levelUp) {
        setState(STATES.CELEBRATE, { duration: 2400 });
        say(pickLine(pet, 'love'), 3000);
        spawnHearts(fx, 8);
        playIfEnabled('done');
      }
    } catch {
      // 忽略交互链路异常，宠物动画不受影响
    }
  }

  function scheduleChatter() {
    setTimeout(() => {
      if (config && state === STATES.IDLE && !sleeping && !dragging) {
        say(pickLine(pet, 'idle'), 2800);
      }
      scheduleChatter();
    }, 45000 + Math.random() * 45000);
  }

  async function init() {
    api.pet.onCommand(handleCommand);

    const ready = await api.pet.ready(pet);
    if (!ready) {
      console.error('[pet] 初始化失败：没有拿到配置');
      return;
    }
    assets = ready.assets || {};
    preloadAssets();
    applyConfig(ready.config);
    setState(STATES.IDLE);

    setupInteractions();
    reportHitRect();
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(reportHitRect).observe(el);
    }
    setInterval(updateClock, 10000);
    updateClock();

    try {
      applyPomodoro(await api.pomodoro.get());
    } catch {
      applyPomodoro(null);
    }

    api.onAssetsChanged(async () => {
      try {
        const next = await api.pet.ready(pet);
        if (next) {
          assets = next.assets || {};
          preloadAssets();
          renderInner();
        }
      } catch {
        // 换图失败时保持旧素材
      }
    });

    scheduleChatter();
    setTimeout(() => {
      const kind = greetingKind(new Date());
      say(pickLine(pet, kind), 3000);
    }, 900);
  }

  init().catch((err) => console.error('[pet] 初始化异常', err));
}
