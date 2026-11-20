import { app } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// 仅用于打包后的冒烟验收：依次触发提醒 / 睡眠 / 专注，截图后自动退出。
export function setupSmoke({ manager, openSettingsWindow }) {
  const outDir = process.env.SMOKE_OUT || join(process.cwd(), 'smoke-out');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function shot(pet, name) {
    const rt = manager.get(pet);
    if (!rt || rt.win.isDestroyed()) return;
    const image = await rt.win.webContents.capturePage();
    writeFileSync(join(outDir, `${name}.png`), image.toPNG());
  }

  const run = async () => {
    mkdirSync(outDir, { recursive: true });

    await wait(3200);
    await shot('yier', 'pet-idle-yier');
    await shot('bubu', 'pet-idle-bubu');

    manager.notify('yier', '喝水时间到啦，起来动一动～', null);
    manager.setSleeping('bubu', true);
    await wait(1400);
    await shot('yier', 'pet-notify');
    await shot('bubu', 'pet-sleep');

    manager.wakeAll();
    manager.updatePomodoro({ running: true, phase: 'work', progress: 0.35, label: '17:30' });
    await wait(1800);
    await shot('yier', 'pet-focus');

    const settings = openSettingsWindow();
    if (settings.webContents.isLoading()) {
      await new Promise((resolve) => settings.webContents.once('did-finish-load', resolve));
    }
    await wait(1200);
    const image = await settings.webContents.capturePage();
    writeFileSync(join(outDir, 'settings.png'), image.toPNG());

    console.log('[smoke] ok', outDir);
    app.exit(0);
  };

  run().catch((err) => {
    console.error('[smoke] failed', err);
    app.exit(1);
  });

  setTimeout(() => {
    console.error('[smoke] timeout');
    app.exit(2);
  }, 25000);
}
