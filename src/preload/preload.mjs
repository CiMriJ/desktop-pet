import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc.js';

function subscribe(channel, callback) {
  const handler = (_event, data) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('petAPI', {
  getConfig: () => ipcRenderer.invoke(IPC.GET_CONFIG),
  setConfig: (partial) => ipcRenderer.invoke(IPC.SET_CONFIG, partial),
  getAssets: () => ipcRenderer.invoke(IPC.GET_ASSETS),
  getAssetSources: () => ipcRenderer.invoke(IPC.GET_ASSET_SOURCES),
  getStatus: () => ipcRenderer.invoke(IPC.STATUS_GET),
  switchImage: (pet, state) => ipcRenderer.invoke(IPC.SWITCH_IMAGE, { pet, state }),
  restoreImage: (pet, state) => ipcRenderer.invoke(IPC.RESTORE_IMAGE, { pet, state }),
  restoreAll: () => ipcRenderer.invoke(IPC.RESTORE_ALL),
  openSettings: () => ipcRenderer.send(IPC.OPEN_SETTINGS),
  resetPositions: () => ipcRenderer.invoke(IPC.RESET_POSITIONS),
  testReminder: (kind) => ipcRenderer.invoke(IPC.TEST_REMINDER, kind),

  pomodoro: {
    get: () => ipcRenderer.invoke(IPC.POMODORO_GET),
    start: () => ipcRenderer.invoke(IPC.POMODORO_START),
    stop: () => ipcRenderer.invoke(IPC.POMODORO_STOP),
  },

  onConfigChanged: (callback) => subscribe(IPC.CONFIG_CHANGED, callback),
  onAssetsChanged: (callback) => subscribe(IPC.ASSETS_CHANGED, callback),
  onPomodoro: (callback) => subscribe(IPC.POMODORO_STATE, callback),

  pet: {
    ready: (pet) => ipcRenderer.invoke(IPC.PET_READY, pet),
    dragStart: (pet) => ipcRenderer.send(IPC.DRAG_START, { pet }),
    dragEnd: (pet) => ipcRenderer.send(IPC.DRAG_END, { pet }),
    hitRect: (pet, rect) => ipcRenderer.send(IPC.HIT_RECT, { pet, rect }),
    contextMenu: (pet) => ipcRenderer.send(IPC.CONTEXT_MENU, { pet }),
    tap: (pet) => ipcRenderer.invoke(IPC.TAP, { pet }),
    state: (pet, state) => ipcRenderer.send(IPC.PET_EVENT, { pet, type: 'state', state }),
    onCommand: (callback) => subscribe(IPC.PET_COMMAND, callback),
  },
});
