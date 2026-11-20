import { app } from 'electron';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { sniffImage } from '../logic/image-validate.js';

const PETS = ['yier', 'bubu'];
const STATES = ['idle', 'walk', 'poke', 'drag', 'notify', 'sleep'];

export function userPetsRoot() {
  return join(app.getPath('userData'), 'pets');
}

function petDir(pet) {
  return join(userPetsRoot(), pet);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// 只读文件头就够判断真实格式，避免把改了后缀的坏图复制进来。
export function sniffImageFile(path) {
  let fd = null;
  try {
    fd = openSync(path, 'r');
    const buf = Buffer.alloc(8);
    const read = readSync(fd, buf, 0, 8, 0);
    return sniffImage(buf.subarray(0, read));
  } catch {
    return null;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

export function removeUserImage(pet, state) {
  for (const ext of ['png', 'gif']) {
    const p = join(petDir(pet), `${state}.${ext}`);
    if (existsSync(p)) rmSync(p, { force: true });
  }
}

export function importUserImage(pet, state, srcPath) {
  try {
    const ext = sniffImageFile(srcPath);
    if (!ext) return { ok: false, error: '文件不是有效的 PNG/GIF 图片' };
    ensureDir(petDir(pet));
    removeUserImage(pet, state);
    copyFileSync(srcPath, join(petDir(pet), `${state}.${ext}`));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

export function removeAllUserImages() {
  try {
    const root = userPetsRoot();
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

export { PETS, STATES };
