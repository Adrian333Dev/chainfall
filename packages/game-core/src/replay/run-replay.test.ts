import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { GameAction, BOARD_CELL_TYPE } from '@chainfall/protocol';
import { runReplay, assertCoreInvariants } from './index';
import { newGame } from '../index';

const FIXTURES_DIR = join(process.cwd(), 'src', '__fixtures__', 'replays');

interface IFixture {
  name: string;
  seed: number;
  startingPlayer: 'blue' | 'red';
  config?: Record<string, unknown>;
  actions: unknown[];
  expected?: {
    finalState: unknown;
    eventsByAction: unknown[][];
  };
}

function loadFixture(name: string): IFixture {
  const path = join(FIXTURES_DIR, `${name}.json`);
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as IFixture;
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

describe('M1.8 — Golden replays', () => {
  const fixtureNames = [
    'placement-basic',
    'detonation-single-wave',
    'detonation-chain-trigger',
    'end-mercy',
    'end-tie-break',
    'cards-integration',
  ];

  for (const name of fixtureNames) {
    it(`${name}: runs replay, satisfies invariants, matches expected, deterministic`, () => {
      const path = join(FIXTURES_DIR, `${name}.json`);
      const fixture = loadFixture(name);
      const actions = fixture.actions.map((a) => GameAction.parse(a));
      const runArgs = {
        seed: fixture.seed,
        startingPlayer: fixture.startingPlayer,
        actions,
        config: fixture.config as Parameters<typeof runReplay>[0]['config'],
      };

      const result1 = runReplay(runArgs, {
        onAfterStep: assertCoreInvariants,
      });

      if (!fixture.expected) {
        const updated = {
          ...fixture,
          expected: {
            finalState: result1.finalState,
            eventsByAction: result1.eventsByAction,
          },
        };
        writeFileSync(path, JSON.stringify(updated, null, 2) + '\n');
        expect.fail(
          `Fixture "${name}" had no expected; file updated. Re-run tests.`,
        );
      }

      expect(fixture.expected).toBeDefined();
      expect(deepEqual(result1.finalState, fixture.expected!.finalState)).toBe(
        true,
      );
      expect(
        deepEqual(result1.eventsByAction, fixture.expected!.eventsByAction),
      ).toBe(true);

      const result2 = runReplay(runArgs);
      expect(deepEqual(result1.finalState, result2.finalState)).toBe(true);
      expect(
        deepEqual(result1.eventsByAction, result2.eventsByAction),
      ).toBe(true);
    });
  }
});

describe('M1.8 — Invariants', () => {
  it('throws on negative tile countdown', () => {
    const state = newGame({ seed: 1, startingPlayer: 'blue' });
    const badState = JSON.parse(JSON.stringify(state)) as typeof state;
    (badState.board[0]![0] as { type: string; tile: { id: number; owner: string; countdown: number } }) = {
      type: BOARD_CELL_TYPE.TILE,
      tile: { id: 1, owner: 'blue', countdown: -1 },
    };
    expect(() => assertCoreInvariants(badState)).toThrow(/negative countdown/);
  });
});
