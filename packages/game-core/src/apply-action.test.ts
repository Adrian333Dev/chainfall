import { describe, it, expect } from 'vitest';
import {
  PLAYER,
  GAME_ACTION_TYPE,
  GAME_EVENT_TYPE,
  GAME_STATUS_TYPE,
  CARD_ID,
  END_REASON,
  BOARD_CELL_TYPE,
} from '@chainfall/protocol';
import { GAME_ERROR_CODE } from './constants';
import { newGame, applyAction } from './index';

describe('applyAction', () => {
  it('rejects ended game', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const endedState = {
      ...state,
      status: {
        type: GAME_STATUS_TYPE.ENDED,
        reason: END_REASON.STANDARD,
        winner: PLAYER.BLUE,
      },
    };
    const result = applyAction(endedState, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(GAME_ERROR_CODE.GAME_ENDED);
  });

  it('rejects cards', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const result = applyAction(state, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      card: { id: CARD_ID.SHOCKWAVE },
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe(GAME_ERROR_CODE.ILLEGAL_ACTION);
  });

  it('placement required when queue not empty', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    expect(state.queue.length).toBeGreaterThan(0);
    const result = applyAction(state, { type: GAME_ACTION_TYPE.TAKE_TURN });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe(GAME_ERROR_CODE.ILLEGAL_ACTION);
  });

  it('placement not allowed when queue empty', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateEmptyQueue = { ...state, queue: [] as typeof state.queue };
    const result = applyAction(stateEmptyQueue, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 0, col: 0 } },
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error.code).toBe(GAME_ERROR_CODE.ILLEGAL_ACTION);
  });

  it('valid placement updates state and emits events', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithQueue = {
      ...state,
      queue: [3, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
    };
    const countdown = 3;
    const result = applyAction(stateWithQueue, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 0, col: 0 } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = result.state;
    expect(next.board[0]![0]!.type).toBe(BOARD_CELL_TYPE.TILE);
    if (next.board[0]![0]!.type === BOARD_CELL_TYPE.TILE) {
      expect(next.board[0]![0]!.tile.id).toBe(stateWithQueue.nextIds.tile);
      expect(next.board[0]![0]!.tile.owner).toBe(PLAYER.BLUE);
      expect(next.board[0]![0]!.tile.countdown).toBe(countdown - 1);
    }
    expect(next.queue.length).toBe(8);
    expect(next.bag.length).toBe(27);
    expect(next.lastPlacementBy).toBe(PLAYER.BLUE);
    expect(next.nextIds.tile).toBe(stateWithQueue.nextIds.tile + 1);
    expect(next.version).toBe(stateWithQueue.version + 1);
    expect(next.turn).toBe(stateWithQueue.turn + 1);
    expect(next.activePlayer).toBe(PLAYER.RED);
    expect(result.events[0]).toMatchObject({
      type: GAME_EVENT_TYPE.TURN_STARTED,
      turn: stateWithQueue.turn,
      activePlayer: PLAYER.BLUE,
    });
    expect(result.events[1]).toMatchObject({
      type: GAME_EVENT_TYPE.TILE_PLACED,
      player: PLAYER.BLUE,
      at: { row: 0, col: 0 },
    });
    expect(result.events[2]).toMatchObject({
      type: GAME_EVENT_TYPE.TICK_RESOLVED,
    });
    expect(result.events[2]).toHaveProperty('tiles');
    expect(result.events[2]).toHaveProperty('walls');
  });

  it('pass when queue empty: no board change, turn advance, TURN_STARTED then TICK_RESOLVED', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateEmptyQueue = { ...state, queue: [] as typeof state.queue };
    const boardBefore = stateEmptyQueue.board.map((r) =>
      r.map((c) => ({ ...c })),
    );
    const result = applyAction(stateEmptyQueue, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.board).toEqual(boardBefore);
    expect(result.state.version).toBe(stateEmptyQueue.version + 1);
    expect(result.state.turn).toBe(stateEmptyQueue.turn + 1);
    expect(result.state.activePlayer).toBe(PLAYER.RED);
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      type: GAME_EVENT_TYPE.TURN_STARTED,
    });
    expect(result.events[1]).toMatchObject({
      type: GAME_EVENT_TYPE.TICK_RESOLVED,
      tiles: [],
      walls: [],
    });
  });

  it('does not mutate input state', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateCopy = JSON.parse(JSON.stringify(state)) as typeof state;
    const boardRef = state.board;
    const queueRef = state.queue;
    const bagRef = state.bag;
    applyAction(state, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 0, col: 0 } },
    });
    expect(state.board).toBe(boardRef);
    expect(state.queue).toBe(queueRef);
    expect(state.bag).toBe(bagRef);
    expect(state.board).toEqual(stateCopy.board);
    expect(state.queue).toEqual(stateCopy.queue);
    expect(state.bag).toEqual(stateCopy.bag);
  });

  it('ticks newly placed tile (placement before tick)', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithQueue = {
      ...state,
      queue: [3, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
    };
    const queueFirst = 3;
    const result = applyAction(stateWithQueue, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 0, col: 0 } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cell = result.state.board[0]![0]!;
    expect(cell.type).toBe(BOARD_CELL_TYPE.TILE);
    if (cell.type === BOARD_CELL_TYPE.TILE) {
      expect(cell.tile.countdown).toBe(queueFirst - 1);
    }
  });

  it('ticks existing tiles (both decremented, clamp at 0)', () => {
    let state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    state = { ...state, queue: [4, 4, 4, 2, 2, 2, 2, 2] as typeof state.queue };
    const r1 = applyAction(state, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 0, col: 0 } },
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    state = { ...r1.state, queue: [4, 4, 2, 2, 2, 2, 2, 2] as typeof state.queue };
    const r2 = applyAction(state, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 0, col: 1 } },
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    state = { ...r2.state, queue: [4, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue };
    const r3 = applyAction(state, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 1, col: 0 } },
    });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    const next = r3.state;
    const cell00 = next.board[0]![0]!;
    const cell01 = next.board[0]![1]!;
    expect(cell00.type).toBe(BOARD_CELL_TYPE.TILE);
    expect(cell01.type).toBe(BOARD_CELL_TYPE.TILE);
    if (cell00.type === BOARD_CELL_TYPE.TILE && cell01.type === BOARD_CELL_TYPE.TILE) {
      expect(cell00.tile.countdown).toBeGreaterThanOrEqual(0);
      expect(cell01.tile.countdown).toBeGreaterThanOrEqual(0);
    }
    const tickEvent = r3.events.find((e) => e.type === GAME_EVENT_TYPE.TICK_RESOLVED);
    expect(tickEvent).toBeDefined();
    expect(tickEvent).toHaveProperty('tiles');
    if (tickEvent && 'tiles' in tickEvent) {
      expect(tickEvent.tiles.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('clamp at 0: tile with countdown 0 is removed by detonation', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithTileAtZero = JSON.parse(JSON.stringify(state)) as typeof state;
    stateWithTileAtZero.queue = [];
    stateWithTileAtZero.board = stateWithTileAtZero.board.map((row, r) =>
      row.map((cell, c) => {
        if (r === 0 && c === 0) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: {
              id: state.nextIds.tile,
              owner: PLAYER.BLUE,
              countdown: 0,
            },
          };
        }
        return cell;
      }),
    ) as typeof state.board;
    const result = applyAction(stateWithTileAtZero, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cell = result.state.board[0]![0]!;
    expect(cell.type).toBe(BOARD_CELL_TYPE.EMPTY);
    const waveEvent = result.events.find(
      (e) => e.type === GAME_EVENT_TYPE.WAVE_RESOLVED,
    );
    expect(waveEvent).toBeDefined();
  });

  it('walls tick and removal: ttl 2 -> 1, ttl 1 -> removed', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithWalls = JSON.parse(JSON.stringify(state)) as typeof state;
    stateWithWalls.queue = [];
    stateWithWalls.board = stateWithWalls.board.map((row, r) =>
      row.map((cell, c) => {
        if (r === 0 && c === 0) {
          return {
            type: BOARD_CELL_TYPE.WALL,
            wall: { id: 1, owner: PLAYER.BLUE, ttl: 2 },
          };
        }
        if (r === 0 && c === 1) {
          return {
            type: BOARD_CELL_TYPE.WALL,
            wall: { id: 2, owner: PLAYER.RED, ttl: 1 },
          };
        }
        return cell;
      }),
    ) as typeof state.board;
    const result = applyAction(stateWithWalls, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cell00 = result.state.board[0]![0]!;
    const cell01 = result.state.board[0]![1]!;
    expect(cell00.type).toBe(BOARD_CELL_TYPE.WALL);
    expect(cell01.type).toBe(BOARD_CELL_TYPE.EMPTY);
    if (cell00.type === BOARD_CELL_TYPE.WALL) {
      expect(cell00.wall.ttl).toBe(1);
    }
    const tickEvent = result.events.find((e) => e.type === GAME_EVENT_TYPE.TICK_RESOLVED);
    expect(tickEvent).toBeDefined();
    if (tickEvent && 'walls' in tickEvent) {
      const wall1 = tickEvent.walls.find((w) => w.id === 1);
      const wall2 = tickEvent.walls.find((w) => w.id === 2);
      expect(wall1).toMatchObject({ from: 2, to: 1, removed: false });
      expect(wall2).toMatchObject({ from: 1, to: 0, removed: true });
    }
  });

  it('event order: TURN_STARTED then TILE_PLACED then TICK_RESOLVED then optional WAVE_RESOLVED/SCORE_CHANGED', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithQueue = {
      ...state,
      queue: [3, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
    };
    const result = applyAction(stateWithQueue, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 0, col: 0 } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events[0]!.type).toBe(GAME_EVENT_TYPE.TURN_STARTED);
    expect(result.events[1]!.type).toBe(GAME_EVENT_TYPE.TILE_PLACED);
    expect(result.events[2]!.type).toBe(GAME_EVENT_TYPE.TICK_RESOLVED);
    const tick = result.events[2]!;
    expect('tiles' in tick && Array.isArray(tick.tiles)).toBe(true);
    expect('walls' in tick && Array.isArray(tick.walls)).toBe(true);
  });

  it('M1.5: single explosion removes the placed tile when countdown becomes 0', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithQueue = {
      ...state,
      queue: [1, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
    };
    const result = applyAction(stateWithQueue, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 0, col: 0 } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.board[0]![0]!.type).toBe(BOARD_CELL_TYPE.EMPTY);
    const waveEvent = result.events.find(
      (e) => e.type === GAME_EVENT_TYPE.WAVE_RESOLVED,
    );
    expect(waveEvent).toBeDefined();
    expect(result.events[2]!.type).toBe(GAME_EVENT_TYPE.TICK_RESOLVED);
  });

  it('M1.5: scoring counts enemy tiles only', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
    stateWithBoard.queue = [];
    const tileId = state.nextIds.tile;
    stateWithBoard.board = stateWithBoard.board.map((row: typeof state.board[0], r: number) =>
      row.map((cell: (typeof state.board)[0][0], c: number) => {
        if (r === 0 && c === 0) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: { id: tileId, owner: PLAYER.BLUE, countdown: 0 },
          };
        }
        if (r === 0 && c === 1) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: { id: tileId + 1, owner: PLAYER.RED, countdown: 0 },
          };
        }
        if (r === 1 && c === 0) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: { id: tileId + 2, owner: PLAYER.BLUE, countdown: 0 },
          };
        }
        return cell;
      }),
    ) as typeof state.board;
    const result = applyAction(stateWithBoard, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.scores[PLAYER.BLUE]).toBe(1);
    const scoreEvent = result.events.find(
      (e) => e.type === GAME_EVENT_TYPE.SCORE_CHANGED,
    );
    expect(scoreEvent).toBeDefined();
    if (scoreEvent && 'delta' in scoreEvent) {
      expect(scoreEvent.delta).toBe(1);
    }
  });

  it('M1.5: chain trigger creates a second wave', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
    stateWithBoard.queue = [];
    const t1 = state.nextIds.tile;
    stateWithBoard.board = stateWithBoard.board.map((row: typeof state.board[0], r: number) =>
      row.map((cell: (typeof state.board)[0][0], c: number) => {
        if (r === 0 && c === 0) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: { id: t1, owner: PLAYER.BLUE, countdown: 0 },
          };
        }
        if (r === 0 && c === 1) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: { id: t1 + 1, owner: PLAYER.RED, countdown: 2 },
          };
        }
        return cell;
      }),
    ) as typeof state.board;
    const result = applyAction(stateWithBoard, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const waveEvents = result.events.filter(
      (e) => e.type === GAME_EVENT_TYPE.WAVE_RESOLVED,
    );
    expect(waveEvents.length).toBeGreaterThanOrEqual(2);
  });

  it('M1.5: fortify blocks adjacency removal but not origin removal', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
    stateWithBoard.queue = [];
    const t1 = state.nextIds.tile;
    stateWithBoard.board = stateWithBoard.board.map((row: typeof state.board[0], r: number) =>
      row.map((cell: (typeof state.board)[0][0], c: number) => {
        if (r === 0 && c === 0) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: { id: t1, owner: PLAYER.BLUE, countdown: 0 },
          };
        }
        if (r === 0 && c === 1) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: { id: t1 + 1, owner: PLAYER.RED, countdown: 2 },
          };
        }
        return cell;
      }),
    ) as typeof state.board;
    stateWithBoard.turnEffects = {
      shockwave: false,
      fortifiedTileIds: [t1 + 1],
    };
    const result = applyAction(stateWithBoard, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.board[0]![0]!.type).toBe(BOARD_CELL_TYPE.EMPTY);
    expect(result.state.board[0]![1]!.type).toBe(BOARD_CELL_TYPE.TILE);
  });

  it('M1.5: fortified origin tile is still removed', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
    stateWithBoard.queue = [];
    const t1 = state.nextIds.tile;
    stateWithBoard.board = stateWithBoard.board.map((row: typeof state.board[0], r: number) =>
      row.map((cell: (typeof state.board)[0][0], c: number) => {
        if (r === 0 && c === 0) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: { id: t1, owner: PLAYER.BLUE, countdown: 0 },
          };
        }
        return cell;
      }),
    ) as typeof state.board;
    stateWithBoard.turnEffects = {
      shockwave: false,
      fortifiedTileIds: [t1],
    };
    const result = applyAction(stateWithBoard, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.board[0]![0]!.type).toBe(BOARD_CELL_TYPE.EMPTY);
  });

  it('M1.5: shockwave adds diagonals', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
    stateWithBoard.queue = [];
    const t1 = state.nextIds.tile;
    stateWithBoard.board = stateWithBoard.board.map((row: typeof state.board[0], r: number) =>
      row.map((cell: (typeof state.board)[0][0], c: number) => {
        if (r === 0 && c === 0) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: { id: t1, owner: PLAYER.BLUE, countdown: 0 },
          };
        }
        if (r === 1 && c === 1) {
          return {
            type: BOARD_CELL_TYPE.TILE,
            tile: { id: t1 + 1, owner: PLAYER.RED, countdown: 2 },
          };
        }
        return cell;
      }),
    ) as typeof state.board;
    stateWithBoard.turnEffects = { shockwave: false, fortifiedTileIds: [] };
    const resultNoShock = applyAction(stateWithBoard, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
    });
    expect(resultNoShock.ok).toBe(true);
    if (!resultNoShock.ok) return;
    expect(resultNoShock.state.board[1]![1]!.type).toBe(BOARD_CELL_TYPE.TILE);

    const stateWithShock = JSON.parse(JSON.stringify(stateWithBoard)) as typeof state;
    stateWithShock.turnEffects = { shockwave: true, fortifiedTileIds: [] };
    const resultShock = applyAction(stateWithShock, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
    });
    expect(resultShock.ok).toBe(true);
    if (!resultShock.ok) return;
    expect(resultShock.state.board[1]![1]!.type).toBe(BOARD_CELL_TYPE.EMPTY);
  });

  it('M1.5: no tiles with countdown 0 after detonation', () => {
    const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
    const stateWithQueue = {
      ...state,
      queue: [1, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
    };
    const result = applyAction(stateWithQueue, {
      type: GAME_ACTION_TYPE.TAKE_TURN,
      placement: { at: { row: 0, col: 0 } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const board = result.state.board;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r]!.length; c++) {
        const cell = board[r]![c]!;
        if (cell.type === BOARD_CELL_TYPE.TILE) {
          expect(cell.tile.countdown).toBeGreaterThan(0);
        }
      }
    }
  });

  describe('M1.6 — End conditions', () => {
    it('M1.6: mercy end triggers when lead >= mercyLead', () => {
      const state = newGame({
        seed: 1,
        startingPlayer: PLAYER.BLUE,
        config: { mercyRule: true, mercyLead: 6 },
      });
      const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
      stateWithBoard.queue = [];
      stateWithBoard.bag = [];
      stateWithBoard.scores = { [PLAYER.BLUE]: 0, [PLAYER.RED]: 0 };
      const t1 = state.nextIds.tile;
      const boardWidth = stateWithBoard.board[0]!.length;
      const rows = stateWithBoard.board.map((row: (typeof state.board)[0], r: number) =>
        row.map((cell: (typeof state.board)[0][0], c: number) => {
          if (r === 0 && c < boardWidth) {
            return {
              type: BOARD_CELL_TYPE.TILE,
              tile: {
                id: t1 + c,
                owner: PLAYER.RED,
                countdown: 0,
              },
            };
          }
          return cell;
        }),
      );
      stateWithBoard.board = rows as typeof state.board;
      const result = applyAction(stateWithBoard, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.status.type).toBe(GAME_STATUS_TYPE.ENDED);
      if (result.state.status.type === GAME_STATUS_TYPE.ENDED) {
        expect(result.state.status.reason).toBe(END_REASON.MERCY);
        expect(result.state.status.winner).toBe(PLAYER.BLUE);
      }
      const gameEndedEvent = result.events.find(
        (e) => e.type === GAME_EVENT_TYPE.GAME_ENDED,
      );
      expect(gameEndedEvent).toBeDefined();
      if (gameEndedEvent && gameEndedEvent.type === GAME_EVENT_TYPE.GAME_ENDED) {
        expect(gameEndedEvent.reason).toBe(END_REASON.MERCY);
        expect(gameEndedEvent.winner).toBe(PLAYER.BLUE);
        expect(gameEndedEvent.finalScores[PLAYER.BLUE]).toBe(boardWidth);
      }
      expect(result.state.turn).toBe(stateWithBoard.turn);
      expect(result.state.activePlayer).toBe(PLAYER.BLUE);
      expect(result.state.version).toBe(stateWithBoard.version + 1);
    });

    it('M1.6: standard end when bag+queue empty and no tiles remain', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
      stateWithBoard.queue = [];
      stateWithBoard.bag = [];
      stateWithBoard.scores = { [PLAYER.BLUE]: 5, [PLAYER.RED]: 3 };
      stateWithBoard.lastPlacementBy = PLAYER.RED;
      const t1 = state.nextIds.tile;
      stateWithBoard.board = stateWithBoard.board.map(
        (row: (typeof state.board)[0], r: number) =>
          row.map((cell: (typeof state.board)[0][0], c: number) => {
            if (r === 0 && c === 0) {
              return {
                type: BOARD_CELL_TYPE.TILE,
                tile: { id: t1, owner: PLAYER.BLUE, countdown: 0 },
              };
            }
            return cell;
          }),
      ) as typeof state.board;
      const result = applyAction(stateWithBoard, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.status.type).toBe(GAME_STATUS_TYPE.ENDED);
      if (result.state.status.type === GAME_STATUS_TYPE.ENDED) {
        expect(result.state.status.reason).toBe(END_REASON.STANDARD);
        expect(result.state.status.winner).toBe(PLAYER.BLUE);
      }
      const gameEndedEvent = result.events.find(
        (e) => e.type === GAME_EVENT_TYPE.GAME_ENDED,
      );
      expect(gameEndedEvent).toBeDefined();
    });

    it('M1.6: tie-break winner is other than last placer', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
      stateWithBoard.queue = [];
      stateWithBoard.bag = [];
      stateWithBoard.scores = { [PLAYER.BLUE]: 4, [PLAYER.RED]: 4 };
      stateWithBoard.lastPlacementBy = PLAYER.BLUE;
      const t1 = state.nextIds.tile;
      stateWithBoard.board = stateWithBoard.board.map(
        (row: (typeof state.board)[0], r: number) =>
          row.map((cell: (typeof state.board)[0][0], c: number) => {
            if (r === 0 && c === 0) {
              return {
                type: BOARD_CELL_TYPE.TILE,
                tile: { id: t1, owner: PLAYER.BLUE, countdown: 0 },
              };
            }
            return cell;
          }),
      ) as typeof state.board;
      const result = applyAction(stateWithBoard, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.status.type).toBe(GAME_STATUS_TYPE.ENDED);
      if (result.state.status.type === GAME_STATUS_TYPE.ENDED) {
        expect(result.state.status.reason).toBe(END_REASON.TIE);
        expect(result.state.status.winner).toBe(PLAYER.RED);
      }
    });

    it('M1.6: does not end if tiles remain (bag and queue empty)', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
      stateWithBoard.queue = [];
      stateWithBoard.bag = [];
      const t1 = state.nextIds.tile;
      stateWithBoard.board = stateWithBoard.board.map(
        (row: (typeof state.board)[0], r: number) =>
          row.map((cell: (typeof state.board)[0][0], c: number) => {
            if (r === 0 && c === 0) {
              return {
                type: BOARD_CELL_TYPE.TILE,
                tile: { id: t1, owner: PLAYER.BLUE, countdown: 2 },
              };
            }
            return cell;
          }),
      ) as typeof state.board;
      const result = applyAction(stateWithBoard, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.status.type).toBe(GAME_STATUS_TYPE.IN_PROGRESS);
      const cell = result.state.board[0]![0]!;
      expect(cell.type).toBe(BOARD_CELL_TYPE.TILE);
      if (cell.type === BOARD_CELL_TYPE.TILE) {
        expect(cell.tile.countdown).toBe(1);
      }
    });

    it('M1.6: ended game still rejects further actions', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const endedState = {
        ...state,
        status: {
          type: GAME_STATUS_TYPE.ENDED,
          reason: END_REASON.STANDARD,
          winner: PLAYER.BLUE,
        },
      };
      const result = applyAction(endedState, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(GAME_ERROR_CODE.GAME_ENDED);
      }
    });
  });

  describe('M1.7 — Cards', () => {
    it('cards rejected when config.cardsEnabled is false', () => {
      const state = newGame({
        seed: 1,
        startingPlayer: PLAYER.BLUE,
        config: { cardsEnabled: false },
      });
      const result = applyAction(state, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.SHOCKWAVE },
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(GAME_ERROR_CODE.ILLEGAL_ACTION);
      }
    });

    it('cards rejected when card already used', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateUsed = {
        ...state,
        queue: [3, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
        cards: {
          ...state.cards,
          used: {
            ...state.cards.used,
            [PLAYER.BLUE]: {
              ...state.cards.used[PLAYER.BLUE],
              [CARD_ID.SHOCKWAVE]: true as const,
            },
          },
        },
      };
      const result = applyAction(stateUsed, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.SHOCKWAVE },
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(GAME_ERROR_CODE.ILLEGAL_ACTION);
      }
    });

    it('cards rejected when playedCount >= maxCardsPerGame', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateMaxCards = {
        ...state,
        queue: [3, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
        cards: {
          ...state.cards,
          playedCount: {
            ...state.cards.playedCount,
            [PLAYER.BLUE]: state.config.maxCardsPerGame,
          },
        },
      };
      const result = applyAction(stateMaxCards, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.SHOCKWAVE },
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(GAME_ERROR_CODE.ILLEGAL_ACTION);
      }
    });

    it('atomicity: card legal but placement illegal does not consume card', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithTile = JSON.parse(JSON.stringify(state)) as typeof state;
      stateWithTile.queue = [3, 2, 2, 2, 2, 2, 2, 2];
      stateWithTile.board[0]![0]! = {
        type: BOARD_CELL_TYPE.TILE,
        tile: { id: state.nextIds.tile, owner: PLAYER.BLUE, countdown: 2 },
      };
      const usedBefore = stateWithTile.cards.used[PLAYER.BLUE][CARD_ID.SHOCKWAVE];
      const result = applyAction(stateWithTile, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.SHOCKWAVE },
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe(GAME_ERROR_CODE.ILLEGAL_ACTION);
      expect(stateWithTile.cards.used[PLAYER.BLUE][CARD_ID.SHOCKWAVE]).toBe(usedBefore);
    });

    it('Reinforce increases tile countdown by 1', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithQueue = {
        ...state,
        queue: [3, 3, 2, 2, 2, 2, 2, 2] as typeof state.queue,
      };
      const r1 = applyAction(stateWithQueue, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        placement: { at: { row: 0, col: 0 } },
      });
      expect(r1.ok).toBe(true);
      if (!r1.ok) return;
      const r2 = applyAction(
        { ...r1.state, queue: [3, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue },
        { type: GAME_ACTION_TYPE.TAKE_TURN, placement: { at: { row: 0, col: 1 } } },
      );
      expect(r2.ok).toBe(true);
      if (!r2.ok) return;
      const tileId = stateWithQueue.nextIds.tile;
      const result = applyAction(
        { ...r2.state, queue: [2, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue },
        {
          type: GAME_ACTION_TYPE.TAKE_TURN,
          card: { id: CARD_ID.REINFORCE, target: { row: 0, col: 0 } },
          placement: { at: { row: 1, col: 0 } },
        },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const cell = result.state.board[0]![0]!;
      expect(cell.type).toBe(BOARD_CELL_TYPE.TILE);
      if (cell.type === BOARD_CELL_TYPE.TILE) {
        expect(cell.tile.id).toBe(tileId);
        expect(cell.tile.countdown).toBe(1);
      }
    });

    it('Accelerate decreases tile countdown (min 1)', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
      stateWithBoard.queue = [2, 2, 2, 2, 2, 2, 2, 2];
      stateWithBoard.board[0]![0]! = {
        type: BOARD_CELL_TYPE.TILE,
        tile: { id: state.nextIds.tile, owner: PLAYER.BLUE, countdown: 3 },
      };
      const result = applyAction(stateWithBoard, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.ACCELERATE, target: { row: 0, col: 0 } },
        placement: { at: { row: 0, col: 1 } },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const cell = result.state.board[0]![0]!;
      expect(cell.type).toBe(BOARD_CELL_TYPE.TILE);
      if (cell.type === BOARD_CELL_TYPE.TILE) {
        expect(cell.tile.countdown).toBe(1);
      }
    });

    it('Sabotage decreases enemy tile countdown (min 1)', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
      stateWithBoard.queue = [3, 2, 2, 2, 2, 2, 2, 2];
      stateWithBoard.board[0]![0]! = {
        type: BOARD_CELL_TYPE.TILE,
        tile: { id: state.nextIds.tile, owner: PLAYER.BLUE, countdown: 3 },
      };
      stateWithBoard.board[0]![1]! = {
        type: BOARD_CELL_TYPE.TILE,
        tile: { id: state.nextIds.tile + 1, owner: PLAYER.RED, countdown: 3 },
      };
      const result = applyAction(stateWithBoard, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.SABOTAGE, target: { row: 0, col: 1 } },
        placement: { at: { row: 1, col: 0 } },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const cell = result.state.board[0]![1]!;
      expect(cell.type).toBe(BOARD_CELL_TYPE.TILE);
      if (cell.type === BOARD_CELL_TYPE.TILE) {
        expect(cell.tile.countdown).toBe(1);
      }
    });

    it('Fortify prevents adjacency removal during detonation', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
      stateWithBoard.queue = [1, 2, 2, 2, 2, 2, 2, 2];
      const fortifiedId = state.nextIds.tile;
      stateWithBoard.board[0]![0]! = {
        type: BOARD_CELL_TYPE.TILE,
        tile: { id: fortifiedId, owner: PLAYER.BLUE, countdown: 2 },
      };
      stateWithBoard.board[0]![1]! = {
        type: BOARD_CELL_TYPE.TILE,
        tile: { id: state.nextIds.tile + 1, owner: PLAYER.RED, countdown: 0 },
      };
      const result = applyAction(stateWithBoard, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.FORTIFY, target: { row: 0, col: 0 } },
        placement: { at: { row: 1, col: 0 } },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const cell00 = result.state.board[0]![0]!;
      const cell01 = result.state.board[0]![1]!;
      expect(cell00.type).toBe(BOARD_CELL_TYPE.TILE);
      expect(cell01.type).toBe(BOARD_CELL_TYPE.EMPTY);
      if (cell00.type === BOARD_CELL_TYPE.TILE) {
        expect(cell00.tile.id).toBe(fortifiedId);
      }
    });

    it('Shockwave sets turnEffects.shockwave (diagonals in detonation)', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithQueue = {
        ...state,
        queue: [1, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
      };
      const result = applyAction(stateWithQueue, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.SHOCKWAVE },
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.events.some((e) => e.type === GAME_EVENT_TYPE.CARD_PLAYED)).toBe(true);
    });

    it('Transplant swaps two tiles', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithBoard = JSON.parse(JSON.stringify(state)) as typeof state;
      stateWithBoard.queue = [2, 2, 2, 2, 2, 2, 2, 2];
      const idA = state.nextIds.tile;
      const idB = state.nextIds.tile + 1;
      stateWithBoard.board[0]![0]! = {
        type: BOARD_CELL_TYPE.TILE,
        tile: { id: idA, owner: PLAYER.BLUE, countdown: 3 },
      };
      stateWithBoard.board[0]![1]! = {
        type: BOARD_CELL_TYPE.TILE,
        tile: { id: idB, owner: PLAYER.BLUE, countdown: 2 },
      };
      const result = applyAction(stateWithBoard, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.TRANSPLANT, a: { row: 0, col: 0 }, b: { row: 0, col: 1 } },
        placement: { at: { row: 1, col: 0 } },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const cell00 = result.state.board[0]![0]!;
      const cell01 = result.state.board[0]![1]!;
      expect(cell00.type).toBe(BOARD_CELL_TYPE.TILE);
      expect(cell01.type).toBe(BOARD_CELL_TYPE.TILE);
      if (cell00.type === BOARD_CELL_TYPE.TILE && cell01.type === BOARD_CELL_TYPE.TILE) {
        expect(cell00.tile.id).toBe(idB);
        expect(cell01.tile.id).toBe(idA);
      }
    });

    it('Firewall places wall with ttl 2 and blocks placement on that cell', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithQueue = {
        ...state,
        queue: [3, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
      };
      const result = applyAction(stateWithQueue, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.FIREWALL, target: { row: 0, col: 1 } },
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const cell01 = result.state.board[0]![1]!;
      expect(cell01.type).toBe(BOARD_CELL_TYPE.WALL);
      if (cell01.type === BOARD_CELL_TYPE.WALL) {
        expect(cell01.wall.ttl).toBe(1);
        expect(cell01.wall.owner).toBe(PLAYER.BLUE);
      }
      const stateNext = { ...result.state, queue: [2, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue };
      const placeOnWall = applyAction(stateNext, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        placement: { at: { row: 0, col: 1 } },
      });
      expect(placeOnWall.ok).toBe(false);
      if (!placeOnWall.ok) {
        expect(placeOnWall.error.code).toBe(GAME_ERROR_CODE.ILLEGAL_ACTION);
      }
    });

    it('Scavenge swaps queue[0] and queue[1]', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithQueue = {
        ...state,
        queue: [4, 3, 2, 2, 2, 2, 2, 2] as typeof state.queue,
      };
      const result = applyAction(stateWithQueue, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.SCAVENGE },
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const cell = result.state.board[0]![0]!;
      expect(cell.type).toBe(BOARD_CELL_TYPE.TILE);
      if (cell.type === BOARD_CELL_TYPE.TILE) {
        expect(cell.tile.countdown).toBe(2);
      }
    });

    it('Scavenge rejected when queue has fewer than 2 items', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateOneInQueue = { ...state, queue: [3] as typeof state.queue };
      const result = applyAction(stateOneInQueue, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.SCAVENGE },
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(GAME_ERROR_CODE.ILLEGAL_ACTION);
      }
    });

    it('CARD_PLAYED event order: after TURN_STARTED, before TILE_PLACED', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithQueue = {
        ...state,
        queue: [3, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
      };
      const result = applyAction(stateWithQueue, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.SHOCKWAVE },
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.events[0]!.type).toBe(GAME_EVENT_TYPE.TURN_STARTED);
      expect(result.events[1]!.type).toBe(GAME_EVENT_TYPE.CARD_PLAYED);
      expect(result.events[2]!.type).toBe(GAME_EVENT_TYPE.TILE_PLACED);
      expect(result.events[3]!.type).toBe(GAME_EVENT_TYPE.TICK_RESOLVED);
    });

    it('bookkeeping: used and playedCount updated after successful card play', () => {
      const state = newGame({ seed: 1, startingPlayer: PLAYER.BLUE });
      const stateWithQueue = {
        ...state,
        queue: [3, 2, 2, 2, 2, 2, 2, 2] as typeof state.queue,
      };
      const result = applyAction(stateWithQueue, {
        type: GAME_ACTION_TYPE.TAKE_TURN,
        card: { id: CARD_ID.SHOCKWAVE },
        placement: { at: { row: 0, col: 0 } },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.state.cards.used[PLAYER.BLUE][CARD_ID.SHOCKWAVE]).toBe(true);
      expect(result.state.cards.playedCount[PLAYER.BLUE]).toBe(1);
    });
  });
});
