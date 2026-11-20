import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { mergeConfig, parseConfig } from '../logic/config.js';

let cached = null;

function configPath() {
  return join(app.getPath('userData'), 'config.json');
}

export function loadConfig() {
  try {
    const p = configPath();
    if (!existsSync(p)) {
      cached = parseConfig(null);
      return cached;
    }
    cached = parseConfig(readFileSync(p, 'utf-8'));
    return cached;
  } catch {
    cached = parseConfig(null);
    return cached;
  }
}

export function getConfig() {
  return cached || loadConfig();
}

// 原子写入：先写临时文件再替换，避免断电/崩溃时把配置写坏。
export function saveConfig(partial) {
  const next = mergeConfig({ ...getConfig(), ...(partial || {}) });
  cached = next;
  const target = configPath();
  try {
    mkdirSync(dirname(target), { recursive: true });
    const tmp = `${target}.tmp`;
    writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf-8');
    renameSync(tmp, target);
  } catch (err) {
    console.error('[config] 保存失败', err);
  }
  return next;
}
