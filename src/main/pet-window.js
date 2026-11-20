import { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 每只宠物一个固定尺寸的小窗口：宠物贴底居中，上方留气泡/时钟的空间。
export const LAYOUT = Object.freeze({
  width: 260,
  height: 300,
  pet: 140,
});

export function createPetWindow(pet) {
  const win = new BrowserWindow({
    width: LAYOUT.width,
    height: LAYOUT.height,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    // 必须可聚焦：Windows 上 focusable:false（WS_EX_NOACTIVATE）会导致
    // 透明置顶窗口收不到鼠标按下事件，表现就是完全点不到、拖不动。
    focusable: true,
    acceptFirstMouse: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // ESM preload 需要关闭 sandbox；渲染层仍然隔离，且没有 Node 权限。
      sandbox: false,
      // 保持默认的 backgroundThrottling：窗口被遮挡（比如全屏游戏/视频）时
      // Chromium 会自动降频，不再强制空转。
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  // 不传 forward：命中判定由主进程轮询光标完成，不需要把 mousemove 转发给页面。
  win.setIgnoreMouseEvents(true);
  win.loadFile(join(__dirname, '../renderer/index.html'), { query: { pet } });

  const show = () => {
    if (win.isDestroyed() || win.isVisible()) return;
    win.showInactive();
  };

  win.once('ready-to-show', show);
  win.webContents.once('did-finish-load', show);
  // 兜底：某些机器上透明窗口的 ready-to-show 不来，延迟后强制显示
  setTimeout(show, 900);
  setTimeout(() => {
    if (win.isDestroyed() || win.isVisible()) return;
    win.show();
    if (process.env.PET_DEBUG === '1') console.log('[dbg] force-show', pet, win.isVisible());
  }, 2000);
  return win;
}
