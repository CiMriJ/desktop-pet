import { cpSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const STAGE = join(ROOT, '.stage');
const DIST = join(ROOT, 'dist');
const OUT = join(DIST, 'app.asar');

// 只把运行需要的东西打进 asar：源码 + 素材 + package.json。
// 绝不把 node_modules（electron 开发依赖）打进去。
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });
for (const name of ['package.json', 'src', 'assets']) {
  cpSync(join(ROOT, name), join(STAGE, name), { recursive: true });
}

mkdirSync(DIST, { recursive: true });
rmSync(OUT, { force: true });

const quote = (value) => `"${value}"`;
const result = spawnSync(
  `npx --yes @electron/asar pack ${quote(STAGE)} ${quote(OUT)}`,
  { shell: true, stdio: 'inherit', cwd: ROOT },
);

rmSync(STAGE, { recursive: true, force: true });

if (result.status !== 0) {
  console.error('打包失败：npx @electron/asar 返回', result.status);
  process.exit(result.status || 1);
}

console.log(`已生成 ${OUT}（${(statSync(OUT).size / 1024).toFixed(1)} KB）`);
