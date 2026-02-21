import type { ValueOf } from '@chainfall/protocol';

export const GAME_ERROR_CODE = {
  NOT_IMPLEMENTED: 'not-implemented',
  GAME_ENDED: 'game-ended',
  INVALID_ACTION: 'invalid-action',
  ILLEGAL_ACTION: 'illegal-action',
} as const;
export type GameErrorCode = ValueOf<typeof GAME_ERROR_CODE>;

export interface IGameError {
  code: GameErrorCode;
  message?: string;
}
