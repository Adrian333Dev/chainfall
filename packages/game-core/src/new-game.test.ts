import { describe, it, expect } from 'vitest';
import { PLAYER, COUNTDOWN_VALUE } from '@chainfall/protocol';
import { newGame } from './index';

function countValues(arr: number[], value: number): number {
  return arr.filter((v) => v === value).length;
}

describe('newGame', () => {
  it('bag + queue composition: 8, 10, 10, 8 of 1, 2, 3, 4 and total 36', () => {
    const state = newGame({ seed: 42, startingPlayer: PLAYER.BLUE });
    const all = [...state.queue, ...state.bag];
    expect(all).toHaveLength(36);
    expect(countValues(all, COUNTDOWN_VALUE.ONE)).toBe(8);
    expect(countValues(all, COUNTDOWN_VALUE.TWO)).toBe(10);
    expect(countValues(all, COUNTDOWN_VALUE.THREE)).toBe(10);
    expect(countValues(all, COUNTDOWN_VALUE.FOUR)).toBe(8);
  });

  it('queue length 8 and bag length 28 with default config', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.RED });
    expect(state.queue).toHaveLength(8);
    expect(state.bag).toHaveLength(28);
  });

  it('same seed produces deep-equal state', () => {
    const state1 = newGame({ seed: 123, startingPlayer: PLAYER.BLUE });
    const state2 = newGame({ seed: 123, startingPlayer: PLAYER.BLUE });
    expect(state1).toEqual(state2);
  });

  it('different seeds produce different queue or bag order', () => {
    const state1 = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const state2 = newGame({ seed: 2, startingPlayer: PLAYER.BLUE });
    expect(state1.queue).not.toEqual(state2.queue);
  });

  it('config merge: override boardSize and cardsEnabled', () => {
    const state = newGame({
      seed: 0,
      startingPlayer: PLAYER.BLUE,
      config: { boardSize: 4, cardsEnabled: false },
    });
    expect(state.config.boardSize).toBe(4);
    expect(state.config.cardsEnabled).toBe(false);
    expect(state.board).toHaveLength(4);
    expect(state.board[0]).toHaveLength(4);
    expect(state.cards.enabled).toBe(false);
  });

  it('does not mutate frozen config override', () => {
    const configOverride = Object.freeze({ boardSize: 4 });
    expect(() => {
      newGame({
        seed: 0,
        startingPlayer: PLAYER.BLUE,
        config: configOverride,
      });
    }).not.toThrow();
  });
});
