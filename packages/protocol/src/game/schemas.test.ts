import { describe, it, expect } from 'vitest';
import { Coord, GameAction } from './schemas';
import { CARD_ID, GAME_ACTION_TYPE } from './constants';

describe('GameAction', () => {
  it("parses { type: 'take-turn' }", () => {
    const result = GameAction.safeParse({ type: GAME_ACTION_TYPE.TAKE_TURN });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data).toEqual({ type: GAME_ACTION_TYPE.TAKE_TURN });
  });

  it('parses take-turn with placement', () => {
    const result = GameAction.safeParse({
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 0, col: 1 } },
    });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data.placement).toEqual({ at: { row: 0, col: 1 } });
  });

  it.each([
    { id: CARD_ID.REINFORCE, target: { row: 0, col: 0 } },
    { id: CARD_ID.ACCELERATE, target: { row: 1, col: 1 } },
    { id: CARD_ID.FORTIFY, target: { row: 2, col: 0 } },
    { id: CARD_ID.SHOCKWAVE },
    { id: CARD_ID.TRANSPLANT, a: { row: 0, col: 0 }, b: { row: 1, col: 1 } },
    { id: CARD_ID.SABOTAGE, target: { row: 0, col: 2 } },
    { id: CARD_ID.FIREWALL, target: { row: 3, col: 3 } },
    { id: CARD_ID.SCAVENGE },
  ] as const)('parses take-turn with card %s', (card) => {
    const result = GameAction.safeParse({
      type: GAME_ACTION_TYPE.TAKE_TURN,
      card,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.card).toEqual(card);
  });

  it('rejects unknown fields (strict)', () => {
    const result = GameAction.safeParse({
      type: GAME_ACTION_TYPE.TAKE_TURN,
      extra: 'not-allowed',
    });
    expect(result.success).toBe(false);
  });
});

describe('Coord', () => {
  it('rejects non-integer row', () => {
    expect(Coord.safeParse({ row: 1.5, col: 0 }).success).toBe(false);
  });

  it('rejects negative coords', () => {
    expect(Coord.safeParse({ row: -1, col: 0 }).success).toBe(false);
    expect(Coord.safeParse({ row: 0, col: -1 }).success).toBe(false);
  });

  it('accepts nonnegative integers within board', () => {
    expect(Coord.safeParse({ row: 0, col: 0 }).success).toBe(true);
    expect(Coord.safeParse({ row: 5, col: 3 }).success).toBe(true);
  });

  it('rejects coords out of board bounds', () => {
    expect(Coord.safeParse({ row: 6, col: 0 }).success).toBe(false);
    expect(Coord.safeParse({ row: 0, col: 6 }).success).toBe(false);
  });
});
