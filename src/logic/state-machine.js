export const STATES = Object.freeze({
  IDLE: 'idle',
  WALK: 'walk',
  POKE: 'poke',
  DRAG: 'drag',
  NOTIFY: 'notify',
  SLEEP: 'sleep',
  EAT: 'eat',
  CELEBRATE: 'celebrate',
});

export const TRANSIENT = Object.freeze([
  STATES.POKE, STATES.NOTIFY, STATES.EAT, STATES.CELEBRATE,
]);

const EVENT_TARGET = {
  POKE: STATES.POKE,
  WALK: STATES.WALK,
  SLEEP: STATES.SLEEP,
  NOTIFY: STATES.NOTIFY,
  EAT: STATES.EAT,
  CELEBRATE: STATES.CELEBRATE,
  IDLE: STATES.IDLE,
};

export function canInterrupt(state) {
  return state !== STATES.DRAG;
}

export function transition(state, event) {
  if (event === 'GRAB') return STATES.DRAG;
  if (event === 'DROP' || event === 'DONE' || event === 'WAKE') return STATES.IDLE;
  if (!canInterrupt(state)) return state;
  return EVENT_TARGET[event] || state;
}

export function isTransient(state) {
  return TRANSIENT.includes(state);
}
