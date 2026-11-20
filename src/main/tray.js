import { Menu, Tray, app, nativeImage } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export function createTray({
  getConfig, setConfig, openSettings, resetPositions, quit, pomodoro,
}) {
  let icon = nativeImage.createFromPath(join(__dirname, '../../assets/tray.png'));
  if (icon.isEmpty()) {
    // 兜底：托盘图标绝不能再是空白，否则用户找不到设置和退出入口
    icon = nativeImage.createFromPath(join(__dirname, '../../assets/pets/yier/poke.png'))
      .resize({ width: 16, height: 16 });
  }
  const tray = new Tray(icon);
  let lastSignature = '';

  function snapshotSignature(cfg) {
    const p = pomodoro.snapshot();
    const bucket = p.running ? Math.ceil(p.remainingMs / 5000) : 0;
    return JSON.stringify([
      cfg.showYier, cfg.showBubu, cfg.waterReminderEnabled, cfg.waterReminderMinutes,
      cfg.restReminderEnabled, cfg.restReminderMinutes, cfg.chimeEnabled, cfg.quietHoursEnabled,
      cfg.showClock, cfg.soundEnabled, cfg.locked, cfg.alwaysOnTop, cfg.autoLaunch,
      p.phase, bucket,
    ]);
  }

  function buildMenu(cfg) {
    const p = pomodoro.snapshot();
    const pomoLabel = p.running
      ? `${p.phase === 'work' ? '专注中' : '休息中'} ${p.label} · 点击停止`
      : `开始专注 ${cfg.pomodoroWorkMinutes} 分钟`;
    return Menu.buildFromTemplate([
      { label: '一二 & 布布', enabled: false },
      { type: 'separator' },
      { label: '显示一二', type: 'checkbox', checked: cfg.showYier,
        click: (item) => setConfig({ showYier: item.checked }) },
      { label: '显示布布', type: 'checkbox', checked: cfg.showBubu,
        click: (item) => setConfig({ showBubu: item.checked }) },
      { type: 'separator' },
      { label: pomoLabel, click: () => pomodoro.toggle() },
      { type: 'separator' },
      { label: '喝水提醒', type: 'checkbox', checked: cfg.waterReminderEnabled,
        click: (item) => setConfig({ waterReminderEnabled: item.checked }) },
      { label: '喝水间隔', submenu: [30, 45, 60, 90, 120].map((m) => ({
        label: `${m} 分钟`, type: 'radio', checked: cfg.waterReminderMinutes === m,
        click: () => setConfig({ waterReminderMinutes: m }),
      })) },
      { label: '休息提醒', type: 'checkbox', checked: cfg.restReminderEnabled,
        click: (item) => setConfig({ restReminderEnabled: item.checked }) },
      { label: '休息间隔', submenu: [30, 45, 60, 90, 120].map((m) => ({
        label: `${m} 分钟`, type: 'radio', checked: cfg.restReminderMinutes === m,
        click: () => setConfig({ restReminderMinutes: m }),
      })) },
      { label: '整点报时', type: 'checkbox', checked: cfg.chimeEnabled,
        click: (item) => setConfig({ chimeEnabled: item.checked }) },
      { label: '免打扰时段', type: 'checkbox', checked: cfg.quietHoursEnabled,
        click: (item) => setConfig({ quietHoursEnabled: item.checked }) },
      { type: 'separator' },
      { label: '显示时间', type: 'checkbox', checked: cfg.showClock,
        click: (item) => setConfig({ showClock: item.checked }) },
      { label: '提示音', type: 'checkbox', checked: cfg.soundEnabled,
        click: (item) => setConfig({ soundEnabled: item.checked }) },
      { label: '锁定位置', type: 'checkbox', checked: cfg.locked,
        click: (item) => setConfig({ locked: item.checked }) },
      { label: '始终置顶', type: 'checkbox', checked: cfg.alwaysOnTop,
        click: (item) => setConfig({ alwaysOnTop: item.checked }) },
      { label: '开机自启', type: 'checkbox', checked: cfg.autoLaunch,
        click: (item) => setConfig({ autoLaunch: item.checked }) },
      { type: 'separator' },
      { label: '重置位置', click: () => resetPositions() },
      { label: '形象与设置…', click: () => openSettings() },
      { type: 'separator' },
      { label: '退出', click: () => quit() },
    ]);
  }

  function update() {
    const cfg = getConfig();
    const signature = snapshotSignature(cfg);
    if (signature !== lastSignature) {
      lastSignature = signature;
      tray.setContextMenu(buildMenu(cfg));
    }
    const p = pomodoro.snapshot();
    tray.setToolTip(p.running
      ? `一二 & 布布 · ${p.phase === 'work' ? '专注' : '休息'} ${p.label}`
      : `桌面宠物 一二 & 布布 v${app.getVersion()}`);
  }

  // 右键/单击会弹出菜单，双击直接打开设置，避免和菜单抢左键。
  tray.on('double-click', () => openSettings());
  update();

  return { tray, update };
}
