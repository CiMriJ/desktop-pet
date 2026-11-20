import { Menu } from 'electron';

export function showPetMenu(pet, rt, deps) {
  const {
    getConfig, setConfig, feed, tap, pomodoro, resetPosition, openSettings, hidePet, quit,
  } = deps;
  const cfg = getConfig();
  const name = pet === 'yier' ? '一二' : '布布';
  const running = pomodoro.isRunning();
  Menu.buildFromTemplate([
    { label: `摸摸${name}`, click: () => tap(pet, true) },
    { label: '喂点小零食', click: () => feed(pet) },
    { label: running ? '结束专注' : `一起专注 ${cfg.pomodoroWorkMinutes} 分钟`,
      click: () => pomodoro.toggle() },
    { type: 'separator' },
    { label: '锁定位置', type: 'checkbox', checked: cfg.locked,
      click: (item) => setConfig({ locked: item.checked }) },
    { label: '重置位置', click: () => resetPosition(pet) },
    { label: `隐藏${name}`, click: () => hidePet(pet) },
    { type: 'separator' },
    { label: '形象与设置…', click: () => openSettings() },
    { label: '退出', click: () => quit() },
  ]).popup({ window: rt.win });
}
