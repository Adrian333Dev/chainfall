import { BOARD_CELL_TYPE, COUNTDOWN_VALUE } from '@chainfall/protocol';
import type { GameState } from '@chainfall/protocol';

/**
 * Asserts core invariants that must hold after newGame and after every applyAction.
 * Throws if any invariant is violated.
 */
export function assertCoreInvariants(state: GameState): void {
  const { config, board, queue, bag } = state;
  const boardSize = config.boardSize;

  if (board.length !== boardSize) {
    throw new Error(
      `Invariant: board.length (${board.length}) !== config.boardSize (${boardSize})`,
    );
  }

  const tileIds = new Set<number>();
  const wallIds = new Set<number>();

  for (let r = 0; r < board.length; r++) {
    const row = board[r]!;
    if (row.length !== boardSize) {
      throw new Error(
        `Invariant: board[${r}].length (${row.length}) !== config.boardSize (${boardSize})`,
      );
    }
    for (let c = 0; c < row.length; c++) {
      const cell = row[c]!;
      if (cell.type === BOARD_CELL_TYPE.TILE) {
        const { tile } = cell;
        if (tile.countdown < 0) {
          throw new Error(
            `Invariant: tile ${tile.id} has negative countdown ${tile.countdown}`,
          );
        }
        if (tile.countdown === 0) {
          throw new Error(
            `Invariant: tile ${tile.id} has countdown 0 (should be removed by detonation)`,
          );
        }
        if (tileIds.has(tile.id)) {
          throw new Error(`Invariant: duplicate tile id ${tile.id} on board`);
        }
        tileIds.add(tile.id);
      } else if (cell.type === BOARD_CELL_TYPE.WALL) {
        const { wall } = cell;
        if (wall.ttl < 0) {
          throw new Error(
            `Invariant: wall ${wall.id} has negative ttl ${wall.ttl}`,
          );
        }
        if (wallIds.has(wall.id)) {
          throw new Error(`Invariant: duplicate wall id ${wall.id} on board`);
        }
        wallIds.add(wall.id);
      }
    }
  }

  const validCountdowns = [
    COUNTDOWN_VALUE.ONE,
    COUNTDOWN_VALUE.TWO,
    COUNTDOWN_VALUE.THREE,
    COUNTDOWN_VALUE.FOUR,
  ];
  for (const v of queue) {
    if (!validCountdowns.includes(v)) {
      throw new Error(
        `Invariant: queue contains invalid value ${v} (expected 1..4)`,
      );
    }
  }
  for (const v of bag) {
    if (!validCountdowns.includes(v)) {
      throw new Error(
        `Invariant: bag contains invalid value ${v} (expected 1..4)`,
      );
    }
  }
}
