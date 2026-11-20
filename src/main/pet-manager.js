import { screen } from 'electron';
import { createPetWindow, LAYOUT } from './pet-window.js';
import { pickLine } from '../logic/lines.js';
import { STATES } from '../logic/state-machine.js';
import { IPC } from '../shared/ipc.js';

const PETS = ['yier', 'bubu'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function petHalf(cfg) {
  return (LAYOUT.pet * cfg.scale) / 2;
}

export class PetManager {
  constructor({ getConfig, persistConfig, isFocusing }) {
    this.getConfig = getConfig;
    this.persistConfig = persistConfig;
    this.isFocusing = isFocusing || (() => false);
    this.pets = new Map();
    this.lastConfig = null;
    this.hoverTimer = null;
  }

  start() {
    this.lastConfig = this.getConfig();
    for (const pet of PETS) {
      if (this.isVisible(pet, this.lastConfig)) this.ensure(pet);
    }
    this.startHoverWatch();
  }

  // ---------- 命中判定（点击穿透） ----------

  // 由主进程轮询系统光标来判断「鼠标是否在宠物身上」。
  // 不再依赖窗口转发 mousemove：转发一旦失效，窗口会一直处于穿透状态，
  // 表现就是「完全点不到、拖不动」。
  // 用 setTimeout 自调度而不是固定 20ms：没有宠物时几乎不占 CPU。
  startHoverWatch() {
    if (this.hoverTimer) return;
    const loop = () => {
      this.hoverTimer = null;
      const delay = this.updateHover();
      this.hoverTimer = setTimeout(loop, delay);
    };
    this.hoverTimer = setTimeout(loop, 40);
  }

  // 返回下一次轮询间隔。有宠物时固定 30ms：再慢就会在鼠标快速划过时
  // 错过第一次点击（窗口还没切成可交互，点击会穿透到桌面）。
  updateHover() {
    if (this.pets.size === 0) return 500;
    const point = screen.getCursorScreenPoint();
    for (const rt of this.pets.values()) {
      if (rt.win.isDestroyed()) continue;
      if (rt.dragging) {
        // 拖拽中必须保持可交互，保证能收到松手事件
        this.applyPassthrough(rt, false);
        continue;
      }
      // 注意：不要用 isVisible() 做前置判断——透明置顶窗口在部分机器上
      // 明明已经显示，isVisible() 仍然返回 false，会导致整个命中判定被跳过。
      if (!rt.hitRect) continue;
      const b = rt.win.getBounds();
      const r = rt.hitRect;
      const pad = 8;
      const x1 = b.x + r.x - pad;
      const y1 = b.y + r.y - pad;
      const x2 = b.x + r.x + r.w + pad;
      const y2 = b.y + r.y + r.h + pad;
      const inside = point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2;
      if (inside) {
        this.applyPassthrough(rt, false);
        continue;
      }
      // 已经离开一段距离才切回穿透，避免在边缘反复切换
      const far = point.x < x1 - 12 || point.x > x2 + 12 || point.y < y1 - 12 || point.y > y2 + 12;
      if (far) this.applyPassthrough(rt, true);
    }
    return 30;
  }

  setHitRect(pet, rect) {
    const rt = this.pets.get(pet);
    if (!rt || !rect) return;
    const nums = [rect.x, rect.y, rect.w, rect.h];
    if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return;
    if (rect.w <= 0 || rect.h <= 0) return;
    rt.hitRect = {
      x: clamp(rect.x, 0, LAYOUT.width),
      y: clamp(rect.y, 0, LAYOUT.height),
      w: Math.min(rect.w, LAYOUT.width),
      h: Math.min(rect.h, LAYOUT.height),
    };
  }

  applyPassthrough(rt, ignore) {
    if (!rt || rt.win.isDestroyed()) return;
    const next = !!ignore;
    if (rt.ignore === next) return;
    rt.ignore = next;
    rt.win.setIgnoreMouseEvents(next);
  }

  isVisible(pet, cfg = this.getConfig()) {
    return pet === 'yier' ? cfg.showYier : cfg.showBubu;
  }

  visiblePets(cfg = this.getConfig()) {
    return PETS.filter((pet) => this.isVisible(pet, cfg));
  }

  get(pet) {
    return this.pets.get(pet) || null;
  }

  windows() {
    return [...this.pets.values()].map((rt) => rt.win);
  }

  ensure(pet) {
    const existing = this.pets.get(pet);
    if (existing) return existing;

    const cfg = this.getConfig();
    const rt = {
      pet,
      win: createPetWindow(pet),
      center: { x: 0, y: 0 },
      state: STATES.IDLE,
      sleeping: false,
      dragging: false,
      ignore: true,
      // 渲染层上报的宠物实际矩形（窗口内 CSS 像素），用于主进程做命中判定
      hitRect: null,
    };
    rt.center = this.initialCenter(pet, cfg);
    this.pets.set(pet, rt);
    this.placeWindow(rt, cfg);

    rt.win.on('closed', () => {
      if (rt.dragTimer) clearInterval(rt.dragTimer);
      rt.dragTimer = null;
      this.pets.delete(pet);
    });
    return rt;
  }

  initialCenter(pet, cfg) {
    const stored = pet === 'yier' ? cfg.yierPos : cfg.bubuPos;
    const display = stored ? screen.getDisplayNearestPoint(stored) : screen.getPrimaryDisplay();
    const area = display.workArea;
    const half = petHalf(cfg);
    const floorY = area.y + area.height - half;
    if (stored) {
      return {
        x: Math.round(clamp(stored.x, area.x + half * 0.5, area.x + area.width - half * 0.5)),
        y: Math.round(clamp(stored.y, area.y + half, area.y + area.height - half)),
      };
    }
    const fromRight = pet === 'yier' ? 150 : 350;
    return {
      x: Math.round(clamp(area.x + area.width - fromRight, area.x + half, area.x + area.width - half)),
      y: Math.round(floorY),
    };
  }

  placeWindow(rt, cfg = this.getConfig()) {
    if (!rt || rt.win.isDestroyed()) return;
    const half = petHalf(cfg);
    const x = Math.round(rt.center.x - LAYOUT.width / 2);
    const y = Math.round(rt.center.y - (LAYOUT.height - half));
    rt.win.setPosition(x, y, false);
  }

  applyConfig(next) {
    const prev = this.lastConfig;
    const scaleChanged = !!prev && prev.scale !== next.scale;
    this.lastConfig = next;

    for (const pet of PETS) {
      const visible = this.isVisible(pet, next);
      const rt = this.pets.get(pet);
      if (visible) {
        const target = rt || this.ensure(pet);
        if (!target.win.isVisible()) target.win.showInactive();
        target.win.setAlwaysOnTop(!!next.alwaysOnTop, 'screen-saver');
        if (scaleChanged) {
          const half = petHalf(next);
          const display = screen.getDisplayNearestPoint(target.center);
          const area = display.workArea;
          target.center.x = Math.round(clamp(target.center.x, area.x + half * 0.5, area.x + area.width - half * 0.5));
          target.center.y = Math.round(clamp(target.center.y, area.y + half, area.y + area.height - half));
          this.placeWindow(target, next);
        }
        this.send(target, { type: 'config', config: next });
      } else if (rt) {
        rt.dragging = false;
        rt.win.hide();
        rt.win.setAlwaysOnTop(false);
      }
    }
    if (scaleChanged) this.persistPositions();
  }

  send(rt, command) {
    if (!rt || rt.win.isDestroyed()) return;
    rt.win.webContents.send(IPC.PET_COMMAND, command);
  }

  setState(rt, state, extra = {}) {
    if (!rt) return;
    rt.state = state;
    this.send(rt, { type: 'state', state, ...extra });
  }

  handleState(pet, state) {
    const rt = this.pets.get(pet);
    if (!rt || !Object.values(STATES).includes(state)) return;
    rt.state = state;
    // 渲染层自己醒来（比如点击睡眠中的宠物）时，同步清掉主进程的睡眠标记，
    // 避免空闲检测再补发一次「醒来」台词。
    if (state !== STATES.SLEEP) rt.sleeping = false;
  }

  // ---------- 拖拽 ----------

  startDrag(pet) {
    const rt = this.pets.get(pet);
    if (!rt) return;
    rt.dragging = true;
    // 记录按下瞬间的光标与窗口位置，之后完全由主进程按光标位移跟随窗口
    rt.dragAnchor = {
      cursor: screen.getCursorScreenPoint(),
      win: rt.win.getPosition(),
    };
    if (rt.dragTimer) clearInterval(rt.dragTimer);
    rt.dragTimer = setInterval(() => {
      const cur = this.pets.get(pet);
      if (!cur || !cur.dragging || cur.win.isDestroyed()) {
        if (cur && cur.dragTimer) {
          clearInterval(cur.dragTimer);
          cur.dragTimer = null;
        }
        return;
      }
      const now = screen.getCursorScreenPoint();
      cur.win.setPosition(
        cur.dragAnchor.win[0] + now.x - cur.dragAnchor.cursor.x,
        cur.dragAnchor.win[1] + now.y - cur.dragAnchor.cursor.y,
        false,
      );
    }, 16);
    rt.win.setIgnoreMouseEvents(false);
    rt.ignore = false;
  }

  endDrag(pet) {
    const rt = this.pets.get(pet);
    if (!rt || !rt.dragging) return;
    rt.dragging = false;
    if (rt.dragTimer) {
      clearInterval(rt.dragTimer);
      rt.dragTimer = null;
    }
    const cfg = this.getConfig();
    const half = petHalf(cfg);
    const bounds = rt.win.getBounds();
    const display = screen.getDisplayNearestPoint({
      x: Math.round(bounds.x + LAYOUT.width / 2),
      y: Math.round(bounds.y + LAYOUT.height - half),
    });
    const area = display.workArea;
    // 松手后原地固定，只把越界的部分拉回屏幕内
    const next = {
      x: Math.round(clamp(bounds.x + LAYOUT.width / 2, area.x + half, area.x + area.width - half)),
      y: Math.round(clamp(bounds.y + LAYOUT.height - half, area.y + half, area.y + area.height - half)),
    };
    // 只是点了一下（位置没变）：不重排、不写盘
    if (Math.abs(next.x - rt.center.x) < 1 && Math.abs(next.y - rt.center.y) < 1) {
      rt.center = next;
      if (rt.state === STATES.DRAG) this.setState(rt, STATES.IDLE);
      return;
    }
    rt.center = next;
    this.placeWindow(rt, cfg);
    if (rt.state === STATES.DRAG) this.setState(rt, STATES.IDLE);
    this.persistPositions();
  }

  // ---------- 空闲睡眠 ----------

  setSleeping(pet, sleeping) {
    const rt = this.pets.get(pet);
    if (!rt || rt.sleeping === sleeping) return;
    rt.sleeping = sleeping;
    if (sleeping) {
      this.setState(rt, STATES.SLEEP);
    } else {
      this.send(rt, { type: 'wake', text: pickLine(pet, 'wake') });
      rt.state = STATES.IDLE;
    }
  }

  wakeAll() {
    for (const pet of PETS) this.setSleeping(pet, false);
  }

  // ---------- 对外动作 ----------

  notifyAny(text, sound = 'reminder') {
    const pets = this.visiblePets();
    if (pets.length === 0) return;
    const pet = pets[Math.floor(Math.random() * pets.length)];
    this.notify(pet, text, sound);
  }

  notify(pet, text, sound = 'reminder') {
    const rt = this.pets.get(pet);
    if (!rt || !rt.win.isVisible()) return;
    if (rt.sleeping) this.setSleeping(pet, false);
    rt.state = STATES.NOTIFY;
    this.send(rt, { type: 'notify', text, sound });
  }

  feed(pet) {
    const rt = this.pets.get(pet);
    if (!rt) return;
    rt.state = STATES.EAT;
    this.send(rt, { type: 'feed', text: pickLine(pet, 'feed') });
  }

  poke(pet, text = '') {
    const rt = this.pets.get(pet);
    if (!rt) return;
    rt.state = STATES.POKE;
    this.send(rt, { type: 'poke', text });
  }

  celebrate(pet, text = '', sound = 'done') {
    const rt = this.pets.get(pet);
    if (!rt) return;
    rt.state = STATES.CELEBRATE;
    this.send(rt, { type: 'celebrate', text, sound });
  }

  updatePomodoro(snapshot) {
    for (const rt of this.pets.values()) {
      if (!rt.win.isDestroyed()) this.send(rt, { type: 'pomodoro', snapshot });
    }
  }

  resetPositions() {
    const cfg = this.getConfig();
    for (const pet of PETS) {
      const rt = this.pets.get(pet);
      if (!rt) continue;
      rt.center = this.initialCenter(pet, { ...cfg, yierPos: null, bubuPos: null });
      this.placeWindow(rt, cfg);
      this.setState(rt, STATES.IDLE);
    }
    this.persistPositions();
  }

  persistPositions() {
    const partial = {};
    for (const [pet, rt] of this.pets) {
      partial[pet === 'yier' ? 'yierPos' : 'bubuPos'] = {
        x: Math.round(rt.center.x),
        y: Math.round(rt.center.y),
      };
    }
    if (Object.keys(partial).length > 0) this.persistConfig(partial);
  }

  destroy() {
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
    this.hoverTimer = null;
    for (const rt of this.pets.values()) {
      if (rt.dragTimer) clearInterval(rt.dragTimer);
      rt.dragTimer = null;
      if (!rt.win.isDestroyed()) rt.win.destroy();
    }
    this.pets.clear();
  }
}
