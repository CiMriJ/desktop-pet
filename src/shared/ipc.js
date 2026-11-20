// 主进程 / preload / 渲染层共用的 IPC 通道名。只在这一处定义，避免多处字符串漂移。
export const IPC = Object.freeze({
  GET_CONFIG: 'config:get',
  SET_CONFIG: 'config:set',
  CONFIG_CHANGED: 'config:changed',

  GET_ASSETS: 'assets:get',
  GET_ASSET_SOURCES: 'assets:sources',
  SWITCH_IMAGE: 'assets:switch',
  RESTORE_IMAGE: 'assets:restore',
  RESTORE_ALL: 'assets:restore-all',
  ASSETS_CHANGED: 'assets:changed',

  OPEN_SETTINGS: 'win:open-settings',
  RESET_POSITIONS: 'pet:reset-positions',
  STATUS_GET: 'status:get',
  TEST_REMINDER: 'reminder:test',

  PET_READY: 'pet:ready',
  PET_COMMAND: 'pet:command',
  PET_EVENT: 'pet:event',
  DRAG_START: 'pet:drag-start',
  DRAG_END: 'pet:drag-end',
  HIT_RECT: 'pet:hit-rect',
  CONTEXT_MENU: 'pet:context-menu',
  TAP: 'pet:tap',
  FEED: 'pet:feed',

  POMODORO_GET: 'pomodoro:get',
  POMODORO_START: 'pomodoro:start',
  POMODORO_STOP: 'pomodoro:stop',
  POMODORO_STATE: 'pomodoro:state',

  REMINDER: 'pet:reminder',
  CHIME: 'pet:chime',
});
