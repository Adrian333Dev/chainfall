import type { ValueOf } from '../type-helpers';

export const PROTOCOL_VERSION = 1;
export type ProtocolVersion = typeof PROTOCOL_VERSION;

export const PLAYER = {
  BLUE: 'blue',
  RED: 'red',
} as const;
export type Player = ValueOf<typeof PLAYER>;

export const CARD_ID = {
  REINFORCE: 'reinforce',
  ACCELERATE: 'accelerate',
  FORTIFY: 'fortify',
  SHOCKWAVE: 'shockwave',
  TRANSPLANT: 'transplant',
  SABOTAGE: 'sabotage',
  FIREWALL: 'firewall',
  SCAVENGE: 'scavenge',
} as const;
export type CardId = ValueOf<typeof CARD_ID>;

export const BOARD_CELL_TYPE = {
  EMPTY: 'empty',
  TILE: 'tile',
  WALL: 'wall',
} as const;
export type BoardCellType = ValueOf<typeof BOARD_CELL_TYPE>;

export const GAME_STATUS_TYPE = {
  IN_PROGRESS: 'in-progress',
  ENDED: 'ended',
} as const;
export type GameStatusType = ValueOf<typeof GAME_STATUS_TYPE>;

export const END_REASON = {
  STANDARD: 'standard',
  MERCY: 'mercy',
  TIE: 'tie',
} as const;
export type EndReason = ValueOf<typeof END_REASON>;

export const GAME_EVENT_TYPE = {
  TURN_STARTED: 'turn-started',
  CARD_PLAYED: 'card-played',
  TILE_PLACED: 'tile-placed',
  TICK_RESOLVED: 'tick-resolved',
  WAVE_RESOLVED: 'wave-resolved',
  SCORE_CHANGED: 'score-changed',
  GAME_ENDED: 'game-ended',
} as const;
export type GameEventType = ValueOf<typeof GAME_EVENT_TYPE>;

export const GAME_ACTION_TYPE = {
  TAKE_TURN: 'take-turn',
} as const;
export type GameActionType = ValueOf<typeof GAME_ACTION_TYPE>;

export const COUNTDOWN_VALUE = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
} as const;
export type CountdownValue = ValueOf<typeof COUNTDOWN_VALUE>;

export const DEFAULT_GAME_CONFIG = {
  boardSize: 6,
  queueSize: 8,
  cardsEnabled: true,
  maxCardsPerTurn: 1,
  maxCardsPerGame: 4,
  mercyRule: true,
  mercyLead: 8,
  diagonalExplosions: false,
} as const;
