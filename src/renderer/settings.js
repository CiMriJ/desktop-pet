const api = window.petAPI;

import { levelInfo } from '../logic/affection.js';

const PET_NAMES = { yier: '一二', bubu: '布布' };
const ASSET_STATES = [
  ['idle', '待机'],
  ['walk', '走路'],
  ['poke', '戳一下'],
  ['drag', '被拖拽'],
  ['notify', '提醒'],
  ['sleep', '睡觉'],
];

let config = null;
let sources = null;
let status = null;
let activePet = 'yier';
let toastTimer = null;

const $ = (id) => document.getElementById(id);

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function readValue(input) {
  if (input.type === 'checkbox') return input.checked;
  if (input.dataset.type === 'number') return Number(input.value);
  return input.value;
}

function syncForm() {
  if (!config) return;
  for (const input of document.querySelectorAll('[data-key]')) {
    const key = input.dataset.key;
    if (!(key in config)) continue;
    if (input.type === 'checkbox') input.checked = !!config[key];
    else input.value = String(config[key]);
  }
  $('scaleValue').textContent = `${Math.round(config.scale * 100)}%`;
  $('autoLaunchHint').textContent = status && status.packaged
    ? '登录 Windows 后自动运行'
    : '开发模式下不生效，打包后可用';
}

function bindConfigInputs() {
  const push = debounce(async (partial) => {
    try {
      config = await api.setConfig(partial);
      syncForm();
      renderAffection();
    } catch (err) {
      toast('保存失败，请重试');
    }
  }, 120);

  for (const input of document.querySelectorAll('[data-key]')) {
    const eventName = input.type === 'range' ? 'input' : 'change';
    input.addEventListener(eventName, () => {
      if (input.dataset.key === 'scale') {
        $('scaleValue').textContent = `${Math.round(Number(input.value) * 100)}%`;
      }
      push({ [input.dataset.key]: readValue(input) });
    });
  }
}

function fillHourSelects() {
  for (const id of ['quietStart', 'quietEnd']) {
    const select = document.querySelector(`[data-key="${id}"]`);
    if (!select) continue;
    select.innerHTML = '';
    for (let hour = 0; hour < 24; hour += 1) {
      const option = document.createElement('option');
      option.value = String(hour);
      option.textContent = `${String(hour).padStart(2, '0')}:00`;
      select.appendChild(option);
    }
  }
}

function renderAssets() {
  if (!sources) return;
  const list = $('assetList');
  list.innerHTML = '';
  for (const [state, label] of ASSET_STATES) {
    const info = sources[activePet] && sources[activePet][state];
    const row = document.createElement('div');
    row.className = 'asset-row';

    const preview = document.createElement('div');
    preview.className = 'preview';
    if (info && info.path) {
      const img = document.createElement('img');
      img.src = info.path;
      img.alt = label;
      img.onerror = () => {
        preview.innerHTML = '<span class="empty">加载失败</span>';
      };
      preview.appendChild(img);
    } else {
      preview.innerHTML = '<span class="empty">默认</span>';
    }

    const meta = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'asset-name';
    name.textContent = label;
    const source = document.createElement('div');
    source.className = 'asset-source';
    source.textContent = !info || info.source === 'none'
      ? '矢量兜底形象'
      : info.source === 'user' ? '自定义图片' : '内置图片';
    meta.appendChild(name);
    meta.appendChild(source);

    const actions = document.createElement('div');
    actions.className = 'asset-actions';
    const replace = document.createElement('button');
    replace.type = 'button';
    replace.textContent = '更换';
    replace.addEventListener('click', () => replaceAsset(activePet, state));
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.textContent = '恢复';
    restore.disabled = !info || info.source !== 'user';
    restore.addEventListener('click', () => restoreAsset(activePet, state));
    actions.appendChild(replace);
    actions.appendChild(restore);

    row.appendChild(preview);
    row.appendChild(meta);
    row.appendChild(actions);
    list.appendChild(row);
  }

  const level = status && status.levels ? status.levels[activePet] : null;
  $('affectionText').textContent = level ? `${level.title} · ${level.points}` : '';
}

async function replaceAsset(pet, state) {
  try {
    const result = await api.switchImage(pet, state);
    if (!result || result.canceled) return;
    if (!result.ok) {
      toast(result.error || '换图失败');
      return;
    }
    sources = result.sources || await api.getAssetSources();
    renderAssets();
    toast('已更新，立即生效');
  } catch {
    toast('换图失败');
  }
}

async function restoreAsset(pet, state) {
  const result = await api.restoreImage(pet, state);
  if (result && result.ok) {
    sources = result.sources || await api.getAssetSources();
    renderAssets();
    toast('已恢复内置图片');
  }
}

function renderPomodoro() {
  if (!status || !status.pomodoro) return;
  const snap = status.pomodoro;
  $('pomoTime').textContent = snap.running ? snap.label : '--:--';
  $('pomoBar').style.width = `${Math.round((snap.progress || 0) * 100)}%`;
  $('pomoPhase').textContent = snap.phase === 'work'
    ? '专注中，宠物会安静陪着你'
    : snap.phase === 'break' ? '休息中，起来活动一下' : '未开始';
  const button = $('pomoToggle');
  button.textContent = snap.running ? '停止' : '开始专注';
  button.classList.toggle('primary', !snap.running);
}

function renderAffection() {
  if (!config) return;
  for (const pet of ['yier', 'bubu']) {
    const info = levelInfo(config.affection[pet] || 0);
    $(`aff-${pet}-title`).textContent = info.title;
    $(`aff-${pet}-points`).textContent = String(info.points);
    $(`aff-${pet}-bar`).style.width = `${Math.round((info.progress || 0) * 100)}%`;
  }
  const level = levelInfo(config.affection[activePet] || 0);
  $('affectionText').textContent = `${level.title} · ${level.points}`;
}

function switchTab(name) {
  for (const btn of document.querySelectorAll('.tabs button')) {
    btn.classList.toggle('active', btn.dataset.tab === name);
  }
  for (const section of document.querySelectorAll('.tab')) {
    section.classList.toggle('active', section.id === `tab-${name}`);
  }
}

function bindActions() {
  for (const btn of document.querySelectorAll('.tabs button')) {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      if (btn.dataset.tab === 'general') refreshStatus();
    });
  }

  for (const btn of document.querySelectorAll('.pet-switch button')) {
    btn.addEventListener('click', () => {
      activePet = btn.dataset.pet;
      for (const other of document.querySelectorAll('.pet-switch button')) {
        other.classList.toggle('active', other === btn);
      }
      renderAssets();
      renderAffection();
    });
  }

  $('restoreAll').addEventListener('click', async () => {
    if (!window.confirm('恢复全部内置形象？已导入的自定义图片会被删除。')) return;
    const result = await api.restoreAll();
    if (result && result.ok) {
      sources = result.sources || await api.getAssetSources();
      renderAssets();
      toast('已全部恢复默认');
    }
  });

  $('testWater').addEventListener('click', async () => {
    const r = await api.testReminder('water');
    toast(r && r.ok ? '已发送喝水提醒' : (r && r.error) || '当前没有显示中的宠物');
  });
  $('testRest').addEventListener('click', async () => {
    const r = await api.testReminder('rest');
    toast(r && r.ok ? '已发送久坐提醒' : (r && r.error) || '当前没有显示中的宠物');
  });

  $('resetPositions').addEventListener('click', async () => {
    await api.resetPositions();
    toast('已把宠物放回右下角');
  });

  $('pomoToggle').addEventListener('click', async () => {
    if (!status) return;
    const snap = status.pomodoro && status.pomodoro.running
      ? await api.pomodoro.stop()
      : await api.pomodoro.start();
    status.pomodoro = snap;
    renderPomodoro();
  });
}

async function refreshStatus() {
  try {
    status = await api.getStatus();
    $('version').textContent = `v${status.version}`;
    $('autoLaunchHint').textContent = status.packaged
      ? '登录 Windows 后自动运行'
      : '开发模式下不生效，打包后可用';
    renderPomodoro();
    renderAffection();
  } catch {
    // 状态读取失败不影响其它设置
  }
}

async function init() {
  try {
    [config, sources, status] = await Promise.all([
      api.getConfig(),
      api.getAssetSources(),
      api.getStatus(),
    ]);
    $('version').textContent = `v${status.version}`;
    fillHourSelects();
    syncForm();
    bindConfigInputs();
    bindActions();
    renderAssets();
    renderPomodoro();
    renderAffection();

    api.onConfigChanged((next) => {
      config = next;
      syncForm();
      renderAffection();
    });
    api.onPomodoro((snap) => {
      if (status) status.pomodoro = snap;
      renderPomodoro();
    });
    api.onAssetsChanged(async () => {
      sources = await api.getAssetSources();
      renderAssets();
    });
  } catch (err) {
    console.error('[settings] 初始化失败', err);
  }
}

init();
