import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveTwoTier } from '../logic/two-tier-resolver.js';
import { userPetsRoot, PETS, STATES } from './user-assets.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BUILTIN_ROOT = join(__dirname, '../../assets/pets');

// 换图后递增版本号，URL 变化既能绕过 <img> 缓存，又不会每次推送配置都生成新 URL。
let assetVersion = 0;

export function bumpAssets() {
  assetVersion += 1;
}

function userUrl(pet, state, ext) {
  const abs = join(userPetsRoot(), pet, `${state}.${ext}`);
  return `${pathToFileURL(abs).href}?v=${assetVersion}`;
}

function builtinUrl(pet, state, ext) {
  return `../../assets/pets/${pet}/${state}.${ext}`;
}

function resolveOne(pet, state) {
  const userHas = (ext) => existsSync(join(userPetsRoot(), pet, `${state}.${ext}`));
  const builtinHas = (ext) => existsSync(join(BUILTIN_ROOT, pet, `${state}.${ext}`));
  const r = resolveTwoTier(pet, state, userHas, builtinHas);
  if (r.type !== 'image') return { type: 'svg', pet, state };
  const url = r.source === 'user' ? userUrl(pet, state, r.ext) : builtinUrl(pet, state, r.ext);
  return { type: 'image', path: url, source: r.source };
}

export function assetMapFor(pet) {
  const map = {};
  for (const state of STATES) {
    const r = resolveOne(pet, state);
    map[state] = r.type === 'image'
      ? { type: 'image', path: r.path }
      : { type: 'svg', pet, state };
  }
  return map;
}

export function buildAssetMap() {
  const map = {};
  for (const pet of PETS) map[pet] = assetMapFor(pet);
  return map;
}

export function getAssetSources() {
  const out = {};
  for (const pet of PETS) {
    out[pet] = {};
    for (const state of STATES) {
      const r = resolveOne(pet, state);
      out[pet][state] = r.type === 'image'
        ? { source: r.source, path: r.path }
        : { source: 'none', path: null };
    }
  }
  return out;
}
