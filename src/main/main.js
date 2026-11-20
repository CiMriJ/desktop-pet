import { app, dialog, ipcMain, powerMonitor, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { PetManager } from './pet-manager.js';
import { PomodoroController } from './pomodoro-controller.js';
import { createScheduler } from './scheduler.js';
import { createTray } from './tray.js';
import { loadConfig, saveConfig } from './config-store.js';
import { assetMapFor, buildAssetMap, bumpAssets, getAssetSources } from './asset-store.js';
import { getSettingsWindow, openSettingsWindow } from './settings-window.js';
import {
  importUserImage, removeAllUserImages, removeUserImage, sniffImageFile,
} from './user-assets.js';
import { showPetMenu } from './context-menu.js';
import { pickLine } from '../logic/lines.js';
import { levelInfo } from '../logic/affection.js';
import { PHASE } from '../logic/pomodoro.js';
import { IPC } from '../shared/ipc.js';
import { setupSmoke } from './smoke.js';

const PET_IDS = new Set(['yier', 'bubu']);
const ASSET_STATES = new Set(['idle', 'walk', 'poke', 'drag', 'notify', 'sleep']);
const TAP_COOLDOWN_MS = 900;
const FEED_GAIN = 5;
const IS_SMOKE = process.argv.includes('--smoke-test');
const DEBUG = process.env.PET_DEBUG === '1';

function debugLog(...args) {
  if (!DEBUG) return;
  try {
    fs.appendFileSync(
      path.join(app.getPath('userData'), 'pet-debug.log'),
      `${new Date().toISOString()} ${args.join(' ')}\n`,
    );
  } catch {
    // 调试日志失败不影响运行
  }
}

let config = null;
let manager = null;
let trayCtl = null;
let scheduler = null;
let pomodoro = null;

const lastTapAt = new Map();

function petName(pet) {
  return pet === 'yier' ? '一二' : '布布';
}

function isPetWindow(pet, event) {
  const rt = manager.get(pet);
  return !!rt && rt.win.webContents === event.sender;
}

function applyAutoLaunch(enabled) {
  if (!app.isPackaged) return; // 开发模式下别把 electron.exe 写进开机启动
  try {
    app.setLoginItemSettings({ openAtLogin: !!enabled, path: process.execPath });
  } catch (err) {
    console.error('[auto-launch] 设置失败', err);
  }
}

function notifySettingsConfig() {
  const win = getSettingsWindow();
  if (win) win.webContents.send(IPC.CONFIG_CHANGED, config);
}

function applyConfig(partial) {
  config = saveConfig(partial || {});
  if (partial && 'autoLaunch' in partial) applyAutoLaunch(config.autoLaunch);
  manager.applyConfig(config);
  if (trayCtl) trayCtl.update();
  notifySettingsConfig();
  return config;
}

function notifyAssetsChanged() {
  for (const win of manager.windows()) {
    if (!win.isDestroyed()) win.webContents.send(IPC.ASSETS_CHANGED);
  }
  const settings = getSettingsWindow();
  if (settings) settings.webContents.send(IPC.ASSETS_CHANGED);
}

function addAffection(pet, amount) {
  const before = config.affection[pet] || 0;
  const after = Math.min(9999, before + amount);
  config = saveConfig({ affection: { ...config.affection, [pet]: after } });
  notifySettingsConfig();
  return {
    before,
    after,
    levelUp: levelInfo(after).level > levelInfo(before).level,
    level: levelInfo(after),
  };
}

function tapPet(pet, fromMenu = false) {
  const now = Date.now();
  if (now - (lastTapAt.get(pet) || 0) < TAP_COOLDOWN_MS) {
    return { affection: config.affection[pet], levelUp: false, level: levelInfo(config.affection[pet]) };
  }
  lastTapAt.set(pet, now);
  const result = addAffection(pet, 1);
  if (fromMenu) {
    manager.poke(pet, pickLine(pet, 'poke'));
    if (result.levelUp) manager.celebrate(pet, pickLine(pet, 'love'));
  }
  return { affection: result.after, levelUp: result.levelUp, level: result.level };
}

function feedPet(pet) {
  addAffection(pet, FEED_GAIN);
  manager.feed(pet);
}

function pickVisiblePet() {
  const pets = manager.visiblePets();
  return pets.length > 0 ? pets[Math.floor(Math.random() * pets.length)] : null;
}

function registerIpc() {
  ipcMain.handle(IPC.GET_CONFIG, () => config);
  ipcMain.handle(IPC.SET_CONFIG, (_event, partial) => applyConfig(partial));

  ipcMain.handle(IPC.GET_ASSETS, () => buildAssetMap());
  ipcMain.handle(IPC.GET_ASSET_SOURCES, () => getAssetSources());

  ipcMain.handle(IPC.SWITCH_IMAGE, async (_event, payload) => {
    const { pet, state } = payload || {};
    if (!PET_IDS.has(pet) || !ASSET_STATES.has(state)) return { ok: false, error: '参数无效' };
    const parent = getSettingsWindow();
    const res = await dialog.showOpenDialog(parent || undefined, {
      title: `为${petName(pet)}选择「${state}」图片`,
      filters: [{ name: '图片', extensions: ['png', 'gif'] }],
      properties: ['openFile'],
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false, canceled: true };
    const src = res.filePaths[0];
    if (!sniffImageFile(src)) return { ok: false, error: '文件不是有效的 PNG/GIF 图片' };
    const r = importUserImage(pet, state, src);
    if (!r.ok) return r;
    bumpAssets();
    notifyAssetsChanged();
    return { ok: true, sources: getAssetSources() };
  });

  ipcMain.handle(IPC.RESTORE_IMAGE, (_event, payload) => {
    const { pet, state } = payload || {};
    if (!PET_IDS.has(pet) || !ASSET_STATES.has(state)) return { ok: false, error: '参数无效' };
    removeUserImage(pet, state);
    bumpAssets();
    notifyAssetsChanged();
    return { ok: true, sources: getAssetSources() };
  });

  ipcMain.handle(IPC.RESTORE_ALL, () => {
    removeAllUserImages();
    bumpAssets();
    notifyAssetsChanged();
    return { ok: true, sources: getAssetSources() };
  });

  ipcMain.on(IPC.OPEN_SETTINGS, () => openSettingsWindow());

  ipcMain.handle(IPC.PET_READY, (event, pet) => {
    if (!PET_IDS.has(pet) || !isPetWindow(pet, event)) return null;
    return { config, assets: assetMapFor(pet) };
  });

  ipcMain.on(IPC.PET_EVENT, (event, payload) => {
    const { pet, type, state } = payload || {};
    if (!PET_IDS.has(pet) || !isPetWindow(pet, event)) return;
    if (type === 'state') manager.handleState(pet, state);
  });

  ipcMain.on(IPC.DRAG_START, (event, payload) => {
    const { pet } = payload || {};
    debugLog('drag-start', pet, JSON.stringify(manager.get(pet)?.win.getBounds()), 'cursor', JSON.stringify(screen.getCursorScreenPoint()));
    if (PET_IDS.has(pet) && isPetWindow(pet, event)) manager.startDrag(pet);
  });
  ipcMain.on(IPC.DRAG_END, (event, payload) => {
    const { pet } = payload || {};
    debugLog('drag-end', pet, JSON.stringify(manager.get(pet)?.win.getBounds()));
    if (PET_IDS.has(pet) && isPetWindow(pet, event)) manager.endDrag(pet);
  });
  // 拖拽过程中的位置完全由主进程按光标跟随，渲染层不再上报坐标
  ipcMain.on(IPC.HIT_RECT, (event, payload) => {
    const { pet, rect } = payload || {};
    if (!PET_IDS.has(pet) || !isPetWindow(pet, event)) return;
    manager.setHitRect(pet, rect);
    debugLog('hit-rect', pet, JSON.stringify(rect));
  });
  ipcMain.on(IPC.CONTEXT_MENU, (event, payload) => {
    const { pet } = payload || {};
    if (!PET_IDS.has(pet) || !isPetWindow(pet, event)) return;
    const rt = manager.get(pet);
    showPetMenu(pet, rt, {
      getConfig: () => config,
      setConfig: (partial) => applyConfig(partial),
      feed: (id) => feedPet(id),
      tap: (id) => tapPet(id, true),
      pomodoro: {
        isRunning: () => pomodoro.isRunning(),
        toggle: () => (pomodoro.isRunning() ? pomodoro.stop() : (manager.wakeAll(), pomodoro.start())),
      },
      resetPosition: () => manager.resetPositions(),
      openSettings: () => openSettingsWindow(),
      hidePet: (id) => applyConfig(id === 'yier' ? { showYier: false } : { showBubu: false }),
      quit: () => app.quit(),
    });
  });

  ipcMain.handle(IPC.TAP, (event, payload) => {
    const { pet } = payload || {};
    debugLog('tap', pet);
    if (!PET_IDS.has(pet) || !isPetWindow(pet, event)) return { affection: 0, levelUp: false };
    return tapPet(pet, false);
  });

  ipcMain.handle(IPC.POMODORO_GET, () => pomodoro.snapshot());
  ipcMain.handle(IPC.POMODORO_START, () => {
    manager.wakeAll();
    return pomodoro.start();
  });
  ipcMain.handle(IPC.POMODORO_STOP, () => pomodoro.stop());

  ipcMain.handle(IPC.RESET_POSITIONS, () => {
    manager.resetPositions();
    return { ok: true };
  });

  ipcMain.handle(IPC.TEST_REMINDER, (_event, kind) => scheduler.test(kind));

  ipcMain.handle(IPC.STATUS_GET, () => ({
    pomodoro: pomodoro.snapshot(),
    affection: config.affection,
    levels: { yier: levelInfo(config.affection.yier), bubu: levelInfo(config.affection.bubu) },
    version: app.getVersion(),
    packaged: app.isPackaged,
  }));
}

function init() {
  app.setAppUserModelId('com.yierbubu.desktop-pet');
  config = loadConfig();
  applyAutoLaunch(config.autoLaunch);

  pomodoro = new PomodoroController({
    getConfig: () => config,
    onUpdate: (snapshot) => {
      if (manager) manager.updatePomodoro(snapshot);
      if (trayCtl) trayCtl.update();
      const settings = getSettingsWindow();
      if (settings) settings.webContents.send(IPC.POMODORO_STATE, snapshot);
    },
    onFinish: (phase, breakMinutes) => {
      const pet = pickVisiblePet();
      if (!pet) return;
      if (phase === PHASE.WORK) {
        manager.celebrate(pet, `专注完成！休息 ${breakMinutes} 分钟吧`, 'done');
      } else {
        manager.notify(pet, pickLine(pet, 'breakEnd'), 'done');
      }
    },
  });

  manager = new PetManager({
    getConfig: () => config,
    persistConfig: (partial) => { config = saveConfig(partial); },
    isFocusing: () => pomodoro.isWorking(),
  });

  registerIpc();

  trayCtl = createTray({
    getConfig: () => config,
    setConfig: (partial) => applyConfig(partial),
    openSettings: () => openSettingsWindow(),
    resetPositions: () => manager.resetPositions(),
    quit: () => app.quit(),
    pomodoro: {
      snapshot: () => pomodoro.snapshot(),
      toggle: () => (pomodoro.isRunning() ? pomodoro.stop() : (manager.wakeAll(), pomodoro.start())),
    },
  });

  scheduler = createScheduler({
    getConfig: () => config,
    persistConfig: (patch) => { config = saveConfig(patch); },
    notify: (pet, text, sound) => manager.notify(pet, text, sound),
    chime: (pet, text) => manager.notify(pet, text, 'hour'),
    idleSeconds: () => powerMonitor.getSystemIdleTime(),
    setSleeping: (pet, sleeping) => manager.setSleeping(pet, sleeping),
    visiblePets: () => manager.visiblePets(),
    isFocusing: () => pomodoro.isWorking(),
  });

  manager.start();
  scheduler.start();
  for (const pet of PET_IDS) {
    const rt = manager.get(pet);
    if (rt) debugLog('bounds', pet, JSON.stringify(rt.win.getBounds()), 'visible', rt.win.isVisible());
  }
  if (DEBUG) {
    const d = screen.getPrimaryDisplay();
    console.log('[dbg] display', JSON.stringify({ scale: d.scaleFactor, bounds: d.bounds, work: d.workArea }));
  }

  powerMonitor.on('resume', () => {
    scheduler.resetTimers();
    manager.wakeAll();
  });

  if (IS_SMOKE) {
    for (const win of manager.windows()) {
      win.webContents.on('console-message', (_event, level, message) => {
        console.log(`[renderer:${level}]`, message);
      });
    }
    setupSmoke({ manager, openSettingsWindow });
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (app.isReady()) openSettingsWindow();
  });
  app.whenReady().then(init).catch((err) => {
    console.error('[startup] 初始化失败', err);
  });
}

// 关掉设置窗口不等于退出，靠托盘菜单退出
app.on('window-all-closed', () => {});
app.on('before-quit', () => {
  if (pomodoro) pomodoro.destroy();
  if (scheduler) scheduler.stop();
  if (manager) manager.destroy();
});
