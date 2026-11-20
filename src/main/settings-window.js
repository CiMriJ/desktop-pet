import { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
let settingsWin = null;

export function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return settingsWin;
  }
  settingsWin = new BrowserWindow({
    width: 760,
    height: 780,
    minWidth: 680,
    minHeight: 620,
    title: '一二 & 布布 · 设置',
    icon: join(__dirname, '../../assets/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  settingsWin.loadFile(join(__dirname, '../renderer/settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
  return settingsWin;
}

export function getSettingsWindow() {
  return settingsWin && !settingsWin.isDestroyed() ? settingsWin : null;
}
