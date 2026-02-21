import {
  PLAYER,
  CARD_ID,
  BOARD_CELL_TYPE,
  GAME_STATUS_TYPE,
  GAME_ACTION_TYPE,
  GAME_EVENT_TYPE,
  END_REASON,
} from '@chainfall/protocol';
import type {
  GameState,
  GameAction,
  GameEvent,
  Player,
  Coord,
  ITile,
  IWall,
  TileId,
  WallId,
  EndReason,
  CardPlay,
} from '@chainfall/protocol';
import { GAME_ERROR_CODE } from './constants';
import type { IGameError } from './constants';

export type ApplyActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: IGameError };

function otherPlayer(p: Player): Player {
  return p === PLAYER.BLUE ? PLAYER.RED : PLAYER.BLUE;
}

interface ICardPhaseResult {
  board: GameState['board'];
  queue: GameState['queue'];
  nextIds: GameState['nextIds'];
  turnEffects: GameState['turnEffects'];
}

function validateAndApplyCardPhase(
  state: GameState,
  card: CardPlay,
): { ok: true; result: ICardPhaseResult } | { ok: false; error: IGameError } {
  const boardSize = state.config.boardSize;
  const ap = state.activePlayer;
  const board = state.board;
  const queue = state.queue;
  const nextIds = state.nextIds;
  const turnEffects = state.turnEffects;

  function inBounds(r: number, c: number): boolean {
    return r >= 0 && r < boardSize && c >= 0 && c < boardSize;
  }
  function getTileAt(r: number, c: number): ITile | null {
    if (!inBounds(r, c)) return null;
    const cell = board[r]![c]!;
    return cell.type === BOARD_CELL_TYPE.TILE ? cell.tile : null;
  }
  function err(msg: string): { ok: false; error: IGameError } {
    return {
      ok: false,
      error: { code: GAME_ERROR_CODE.ILLEGAL_ACTION, message: msg },
    };
  }
  function invalidAction(): { ok: false; error: IGameError } {
    return { ok: false, error: { code: GAME_ERROR_CODE.INVALID_ACTION } };
  }

  switch (card.id) {
    case CARD_ID.REINFORCE: {
      const { target } = card;
      if (!inBounds(target.row, target.col)) return invalidAction();
      const tile = getTileAt(target.row, target.col);
      if (!tile || tile.owner !== ap || tile.countdown <= 0)
        return err('Reinforce: own tile with countdown > 0 required');
      const nextBoard = board.map((rowArr, r) =>
        r === target.row
          ? rowArr.map((c, cIdx) =>
              cIdx === target.col && c.type === BOARD_CELL_TYPE.TILE
                ? {
                    type: BOARD_CELL_TYPE.TILE,
                    tile: { ...c.tile, countdown: c.tile.countdown + 1 },
                  }
                : c,
            )
          : rowArr,
      ) as GameState['board'];
      return {
        ok: true,
        result: {
          board: nextBoard,
          queue,
          nextIds,
          turnEffects,
        },
      };
    }
    case CARD_ID.ACCELERATE: {
      const { target } = card;
      if (!inBounds(target.row, target.col)) return invalidAction();
      const tile = getTileAt(target.row, target.col);
      if (!tile || tile.owner !== ap || tile.countdown <= 0)
        return err('Accelerate: own tile with countdown > 0 required');
      const nextCountdown = Math.max(1, tile.countdown - 1);
      const nextBoard = board.map((rowArr, r) =>
        r === target.row
          ? rowArr.map((c, cIdx) =>
              cIdx === target.col && c.type === BOARD_CELL_TYPE.TILE
                ? {
                    type: BOARD_CELL_TYPE.TILE,
                    tile: { ...c.tile, countdown: nextCountdown },
                  }
                : c,
            )
          : rowArr,
      ) as GameState['board'];
      return {
        ok: true,
        result: {
          board: nextBoard,
          queue,
          nextIds,
          turnEffects,
        },
      };
    }
    case CARD_ID.FORTIFY: {
      const { target } = card;
      if (!inBounds(target.row, target.col)) return invalidAction();
      const tile = getTileAt(target.row, target.col);
      if (!tile || tile.owner !== ap || tile.countdown <= 0)
        return err('Fortify: own tile with countdown > 0 required');
      const ids = turnEffects.fortifiedTileIds.includes(tile.id)
        ? turnEffects.fortifiedTileIds
        : [...turnEffects.fortifiedTileIds, tile.id];
      return {
        ok: true,
        result: {
          board,
          queue,
          nextIds,
          turnEffects: { ...turnEffects, fortifiedTileIds: ids },
        },
      };
    }
    case CARD_ID.SHOCKWAVE:
      return {
        ok: true,
        result: {
          board,
          queue,
          nextIds,
          turnEffects: { ...turnEffects, shockwave: true },
        },
      };
    case CARD_ID.TRANSPLANT: {
      const { a, b } = card;
      if (a.row === b.row && a.col === b.col)
        return err('Transplant: a and b must differ');
      if (!inBounds(a.row, a.col) || !inBounds(b.row, b.col))
        return invalidAction();
      const tileA = getTileAt(a.row, a.col);
      const tileB = getTileAt(b.row, b.col);
      if (!tileA || !tileB)
        return err('Transplant: both cells must be tiles');
      if (tileA.owner !== ap || tileB.owner !== ap)
        return err('Transplant: both tiles must be owned by active player');
      if (tileA.countdown <= 0 || tileB.countdown <= 0)
        return err('Transplant: both tiles must have countdown > 0');
      const nextBoard = board.map((rowArr, r) => {
        return rowArr.map((c, cIdx) => {
          if (r === a.row && cIdx === a.col && c.type === BOARD_CELL_TYPE.TILE)
            return { type: BOARD_CELL_TYPE.TILE, tile: tileB };
          if (r === b.row && cIdx === b.col && c.type === BOARD_CELL_TYPE.TILE)
            return { type: BOARD_CELL_TYPE.TILE, tile: tileA };
          return c;
        });
      }) as GameState['board'];
      return {
        ok: true,
        result: {
          board: nextBoard,
          queue,
          nextIds,
          turnEffects,
        },
      };
    }
    case CARD_ID.SABOTAGE: {
      const { target } = card;
      if (!inBounds(target.row, target.col)) return invalidAction();
      const tile = getTileAt(target.row, target.col);
      const enemy = otherPlayer(ap);
      if (!tile || tile.owner !== enemy || tile.countdown <= 0)
        return err('Sabotage: enemy tile with countdown > 0 required');
      const nextCountdown = Math.max(1, tile.countdown - 1);
      const nextBoard = board.map((rowArr, r) =>
        r === target.row
          ? rowArr.map((c, cIdx) =>
              cIdx === target.col && c.type === BOARD_CELL_TYPE.TILE
                ? {
                    type: BOARD_CELL_TYPE.TILE,
                    tile: { ...c.tile, countdown: nextCountdown },
                  }
                : c,
            )
          : rowArr,
      ) as GameState['board'];
      return {
        ok: true,
        result: {
          board: nextBoard,
          queue,
          nextIds,
          turnEffects,
        },
      };
    }
    case CARD_ID.FIREWALL: {
      const { target } = card;
      if (!inBounds(target.row, target.col)) return invalidAction();
      const cell = board[target.row]![target.col]!;
      if (cell.type !== BOARD_CELL_TYPE.EMPTY)
        return err('Firewall: target cell must be empty');
      const wall: IWall = {
        id: nextIds.wall,
        owner: ap,
        ttl: 2,
      };
      const nextBoard = board.map((rowArr, r) =>
        r === target.row
          ? rowArr.map((c, cIdx) =>
              cIdx === target.col
                ? { type: BOARD_CELL_TYPE.WALL, wall }
                : c,
            )
          : rowArr,
      ) as GameState['board'];
      return {
        ok: true,
        result: {
          board: nextBoard,
          queue,
          nextIds: { ...nextIds, wall: nextIds.wall + 1 },
          turnEffects,
        },
      };
    }
    case CARD_ID.SCAVENGE: {
      if (queue.length < 2)
        return err('Scavenge: queue must have at least 2 items');
      const nextQueue: GameState['queue'] = [
        queue[1]!,
        queue[0]!,
        ...queue.slice(2),
      ];
      return {
        ok: true,
        result: {
          board,
          queue: nextQueue,
          nextIds,
          turnEffects,
        },
      };
    }
    default: {
      const _: never = card; // exhaustiveness check
      void _;
      return invalidAction();
    }
  }
}

function hasAnyTiles(board: GameState['board']): boolean {
  const size = board.length;
  for (let r = 0; r < size; r++) {
    const row = board[r]!;
    for (let c = 0; c < size; c++) {
      if (row[c]!.type === BOARD_CELL_TYPE.TILE) return true;
    }
  }
  return false;
}

interface IEndState {
  reason: EndReason;
  winner: Player;
}

function computeEndStateOrNull(
  board: GameState['board'],
  bag: GameState['bag'],
  queue: GameState['queue'],
  scores: Record<Player, number>,
  config: GameState['config'],
  activePlayer: Player,
  lastPlacementBy: Player | null,
): IEndState | null {
  if (config.mercyRule) {
    const diff = Math.abs(scores[PLAYER.BLUE] - scores[PLAYER.RED]);
    if (diff >= config.mercyLead) {
      const winner =
        scores[PLAYER.BLUE] > scores[PLAYER.RED] ? PLAYER.BLUE : PLAYER.RED;
      return { reason: END_REASON.MERCY, winner };
    }
  }
  if (bag.length === 0 && queue.length === 0 && !hasAnyTiles(board)) {
    const blueScore = scores[PLAYER.BLUE];
    const redScore = scores[PLAYER.RED];
    if (blueScore !== redScore) {
      const winner =
        blueScore > redScore ? PLAYER.BLUE : PLAYER.RED;
      return { reason: END_REASON.STANDARD, winner };
    }
    const winner =
      lastPlacementBy !== null
        ? otherPlayer(lastPlacementBy)
        : otherPlayer(activePlayer);
    return { reason: END_REASON.TIE, winner };
  }
  return null;
}

type TileDelta = { id: TileId; from: number; to: number };
type WallDelta = { id: WallId; from: number; to: number; removed: boolean };

function applyTickPhase(
  board: GameState['board'],
): { board: GameState['board']; tileDeltas: TileDelta[]; wallDeltas: WallDelta[] } {
  const tileDeltas: TileDelta[] = [];
  const wallDeltas: WallDelta[] = [];
  const size = board.length;
  const nextBoard: GameState['board'] = [];

  for (let r = 0; r < size; r++) {
    const row = board[r]!;
    let rowChanged = false;
    const nextRow: typeof row = [];

    for (let c = 0; c < size; c++) {
      const cell = row[c]!;
      if (cell.type === BOARD_CELL_TYPE.TILE) {
        const from = cell.tile.countdown;
        const to = Math.max(0, from - 1);
        tileDeltas.push({ id: cell.tile.id, from, to });
        nextRow.push({
          type: BOARD_CELL_TYPE.TILE,
          tile: { ...cell.tile, countdown: to },
        });
        rowChanged = true;
      } else if (cell.type === BOARD_CELL_TYPE.WALL) {
        const from = cell.wall.ttl;
        const to = from - 1;
        if (to === 0) {
          wallDeltas.push({
            id: cell.wall.id,
            from,
            to: 0,
            removed: true,
          });
          nextRow.push({ type: BOARD_CELL_TYPE.EMPTY });
        } else {
          wallDeltas.push({
            id: cell.wall.id,
            from,
            to,
            removed: false,
          });
          nextRow.push({
            type: BOARD_CELL_TYPE.WALL,
            wall: { ...cell.wall, ttl: to },
          });
        }
        rowChanged = true;
      } else {
        nextRow.push(cell);
      }
    }

    nextBoard.push(rowChanged ? nextRow : row);
  }

  return { board: nextBoard, tileDeltas, wallDeltas };
}

function posKey(row: number, col: number): string {
  return `${row},${col}`;
}

interface IWaveSummary {
  explodingTileIds: TileId[];
  removedTileIds: TileId[];
  triggeredTileIds: TileId[];
  pointsGained: number;
}

function getBlastPositions(
  originRows: number[],
  originCols: number[],
  boardSize: number,
  includeDiagonals: boolean,
): Set<string> {
  const out = new Set<string>();
  const dRow = [-1, 0, 1, 0];
  const dCol = [0, 1, 0, -1];
  const diagRow = [-1, -1, 1, 1];
  const diagCol = [-1, 1, -1, 1];
  for (let i = 0; i < originRows.length; i++) {
    const r = originRows[i]!;
    const c = originCols[i]!;
    out.add(posKey(r, c));
    for (let d = 0; d < 4; d++) {
      const nr = r + dRow[d]!;
      const nc = c + dCol[d]!;
      if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
        out.add(posKey(nr, nc));
      }
    }
    if (includeDiagonals) {
      for (let d = 0; d < 4; d++) {
        const nr = r + diagRow[d]!;
        const nc = c + diagCol[d]!;
        if (nr >= 0 && nr < boardSize && nc >= 0 && nc < boardSize) {
          out.add(posKey(nr, nc));
        }
      }
    }
  }
  return out;
}

function applyDetonationPhase(
  board: GameState['board'],
  activePlayer: Player,
  turnEffects: GameState['turnEffects'],
  boardSize: number,
): {
  board: GameState['board'];
  waveSummaries: IWaveSummary[];
  pointsGainedTotal: number;
} {
  const waveSummaries: IWaveSummary[] = [];
  let pointsGainedTotal = 0;
  let currentBoard = board;
  const size = boardSize;

  let originRows: number[] = [];
  let originCols: number[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = currentBoard[r]![c]!;
      if (
        cell.type === BOARD_CELL_TYPE.TILE &&
        cell.tile.countdown === 0
      ) {
        originRows.push(r);
        originCols.push(c);
      }
    }
  }

  while (originRows.length > 0) {
    const originSet = new Set<string>();
    for (let i = 0; i < originRows.length; i++) {
      originSet.add(posKey(originRows[i]!, originCols[i]!));
    }
    const blastPositions = getBlastPositions(
      originRows,
      originCols,
      size,
      turnEffects.shockwave,
    );

    const explodingTileIds: TileId[] = [];
    for (let i = 0; i < originRows.length; i++) {
      const r = originRows[i]!;
      const c = originCols[i]!;
      const cell = currentBoard[r]![c]!;
      if (cell.type === BOARD_CELL_TYPE.TILE) {
        explodingTileIds.push(cell.tile.id);
      }
    }

    const removedTileIds: TileId[] = [];
    const triggeredTileIds: TileId[] = [];
    const removedPositions: { row: number; col: number; tile: ITile }[] = [];

    const nextBoard: GameState['board'] = currentBoard.map((rowArr, r) => {
      let rowChanged = false;
      const nextRow = rowArr.map((c, col) => {
        const key = posKey(r, col);
        if (!blastPositions.has(key)) return c;
        const cell = c;
        if (cell.type !== BOARD_CELL_TYPE.TILE) return c;
        const isOrigin = originSet.has(key);
        const isFortified = turnEffects.fortifiedTileIds.includes(cell.tile.id);
        const shouldRemove = isOrigin || !isFortified;
        if (!shouldRemove) return c;
        rowChanged = true;
        removedTileIds.push(cell.tile.id);
        if (cell.tile.countdown === 1) {
          triggeredTileIds.push(cell.tile.id);
          removedPositions.push({ row: r, col, tile: cell.tile });
        }
        return { type: BOARD_CELL_TYPE.EMPTY } as const;
      });
      return rowChanged ? nextRow : rowArr;
    }) as GameState['board'];

    let pointsGained = 0;
    for (const id of removedTileIds) {
      let tile: ITile | null = null;
      for (let rr = 0; rr < size; rr++) {
        for (let cc = 0; cc < size; cc++) {
          const cell = currentBoard[rr]![cc]!;
          if (cell.type === BOARD_CELL_TYPE.TILE && cell.tile.id === id) {
            tile = cell.tile;
            break;
          }
        }
        if (tile) break;
      }
      if (tile && tile.owner !== activePlayer) pointsGained += 1;
    }

    waveSummaries.push({
      explodingTileIds,
      removedTileIds,
      triggeredTileIds,
      pointsGained,
    });
    pointsGainedTotal += pointsGained;

    originRows = removedPositions.map((p) => p.row);
    originCols = removedPositions.map((p) => p.col);
    currentBoard = nextBoard;
  }

  return {
    board: currentBoard,
    waveSummaries,
    pointsGainedTotal,
  };
}

export function applyAction(
  state: GameState,
  action: GameAction,
): ApplyActionResult {
  if (state.status.type === GAME_STATUS_TYPE.ENDED) {
    return { ok: false, error: { code: GAME_ERROR_CODE.GAME_ENDED } };
  }
  if (action.type !== GAME_ACTION_TYPE.TAKE_TURN) {
    return { ok: false, error: { code: GAME_ERROR_CODE.INVALID_ACTION } };
  }

  const cardPlayed = action.card !== undefined;
  if (cardPlayed) {
    if (!state.config.cardsEnabled || !state.cards.enabled) {
      return {
        ok: false,
        error: {
          code: GAME_ERROR_CODE.ILLEGAL_ACTION,
          message: 'Cards not enabled',
        },
      };
    }
    if (state.cards.cardPlayedThisTurn) {
      return {
        ok: false,
        error: {
          code: GAME_ERROR_CODE.ILLEGAL_ACTION,
          message: 'Already played a card this turn',
        },
      };
    }
    if (
      state.cards.playedCount[state.activePlayer] >=
      state.config.maxCardsPerGame
    ) {
      return {
        ok: false,
        error: {
          code: GAME_ERROR_CODE.ILLEGAL_ACTION,
          message: 'Max cards per game reached',
        },
      };
    }
    if (
      state.cards.used[state.activePlayer][action.card!.id] === true
    ) {
      return {
        ok: false,
        error: {
          code: GAME_ERROR_CODE.ILLEGAL_ACTION,
          message: 'Card already used',
        },
      };
    }
  }

  let intermediateBoard = state.board;
  let intermediateQueue = state.queue;
  let intermediateNextIds = state.nextIds;
  let intermediateTurnEffects = state.turnEffects;

  if (cardPlayed) {
    const cardResult = validateAndApplyCardPhase(state, action.card!);
    if (!cardResult.ok) return cardResult;
    intermediateBoard = cardResult.result.board;
    intermediateQueue = cardResult.result.queue;
    intermediateNextIds = cardResult.result.nextIds;
    intermediateTurnEffects = cardResult.result.turnEffects;
  }

  const queueNotEmpty = intermediateQueue.length > 0;
  if (queueNotEmpty && action.placement === undefined) {
    return {
      ok: false,
      error: {
        code: GAME_ERROR_CODE.ILLEGAL_ACTION,
        message: 'Placement required when queue not empty',
      },
    };
  }
  if (!queueNotEmpty && action.placement !== undefined) {
    return {
      ok: false,
      error: {
        code: GAME_ERROR_CODE.ILLEGAL_ACTION,
        message: 'Placement not allowed when queue empty',
      },
    };
  }

  const boardSize = state.config.boardSize;
  let nextBoard = intermediateBoard;
  let nextQueue = intermediateQueue;
  let nextBag = state.bag;
  let nextNextIds = intermediateNextIds;
  let lastPlacementBy: Player | null = state.lastPlacementBy;
  let placedTile: ITile | null = null;
  let placementCoord: Coord | null = null;

  if (action.placement !== undefined) {
    const { row, col } = action.placement.at;
    if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
      return { ok: false, error: { code: GAME_ERROR_CODE.INVALID_ACTION } };
    }
    const cell = intermediateBoard[row]![col]!;
    if (cell.type !== BOARD_CELL_TYPE.EMPTY) {
      return {
        ok: false,
        error: {
          code: GAME_ERROR_CODE.ILLEGAL_ACTION,
          message: 'Cell is not empty',
        },
      };
    }

    const countdown = intermediateQueue[0]!;
    nextQueue = intermediateQueue.slice(1);
    const tile: ITile = {
      id: intermediateNextIds.tile,
      owner: state.activePlayer,
      countdown,
    };
    placedTile = tile;
    placementCoord = action.placement.at;

    nextBoard = intermediateBoard.map((rowArr, r) =>
      r === row
        ? rowArr.map((c, cIdx) =>
            cIdx === col ? { type: BOARD_CELL_TYPE.TILE, tile } : c,
          )
        : rowArr,
    ) as GameState['board'];

    nextBag = state.bag.slice();
    while (nextQueue.length < state.config.queueSize && nextBag.length > 0) {
      nextQueue = [...nextQueue, nextBag[0]!];
      nextBag = nextBag.slice(1);
    }

    nextNextIds = {
      tile: intermediateNextIds.tile + 1,
      wall: intermediateNextIds.wall,
    };
    lastPlacementBy = state.activePlayer;
  }

  const { board: boardAfterTick, tileDeltas, wallDeltas } =
    applyTickPhase(nextBoard);
  nextBoard = boardAfterTick;

  const { board: boardAfterDetonation, waveSummaries, pointsGainedTotal } =
    applyDetonationPhase(
      nextBoard,
      state.activePlayer,
      intermediateTurnEffects,
      state.config.boardSize,
    );
  nextBoard = boardAfterDetonation;

  const events: GameEvent[] = [
    {
      type: GAME_EVENT_TYPE.TURN_STARTED,
      turn: state.turn,
      activePlayer: state.activePlayer,
    },
  ];
  const playedCard = action.card;
  if (cardPlayed && playedCard !== undefined) {
    events.push({
      type: GAME_EVENT_TYPE.CARD_PLAYED,
      player: state.activePlayer,
      card: playedCard,
    });
  }
  if (placedTile !== null && placementCoord !== null) {
    events.push({
      type: GAME_EVENT_TYPE.TILE_PLACED,
      player: state.activePlayer,
      at: placementCoord,
      tile: placedTile,
    });
  }
  events.push({
    type: GAME_EVENT_TYPE.TICK_RESOLVED,
    tiles: tileDeltas,
    walls: wallDeltas,
  });
  for (let w = 0; w < waveSummaries.length; w++) {
    const summary = waveSummaries[w]!;
    events.push({
      type: GAME_EVENT_TYPE.WAVE_RESOLVED,
      wave: w + 1,
      explodingTileIds: summary.explodingTileIds,
      removedTileIds: summary.removedTileIds,
      triggeredTileIds: summary.triggeredTileIds,
      pointsGained: summary.pointsGained,
    });
  }
  if (pointsGainedTotal > 0) {
    const fromScore = state.scores[state.activePlayer];
    const toScore = fromScore + pointsGainedTotal;
    events.push({
      type: GAME_EVENT_TYPE.SCORE_CHANGED,
      player: state.activePlayer,
      from: fromScore,
      to: toScore,
      delta: pointsGainedTotal,
    });
  }

  const nextScores = { ...state.scores };
  if (pointsGainedTotal > 0) {
    nextScores[state.activePlayer] =
      state.scores[state.activePlayer] + pointsGainedTotal;
  }

  const endState = computeEndStateOrNull(
    nextBoard,
    nextBag,
    nextQueue,
    nextScores,
    state.config,
    state.activePlayer,
    lastPlacementBy,
  );

  const nextCards =
    cardPlayed && playedCard !== undefined
      ? {
          ...state.cards,
          cardPlayedThisTurn: false,
          playedCount: {
            ...state.cards.playedCount,
            [state.activePlayer]:
              state.cards.playedCount[state.activePlayer] + 1,
          },
          used: {
            ...state.cards.used,
            [state.activePlayer]: {
              ...state.cards.used[state.activePlayer],
              [playedCard.id]: true as const,
            },
          },
        }
      : { ...state.cards, cardPlayedThisTurn: false };

  if (endState !== null) {
    events.push({
      type: GAME_EVENT_TYPE.GAME_ENDED,
      reason: endState.reason,
      winner: endState.winner,
      finalScores: nextScores,
    });
    const nextState: GameState = {
      ...state,
      version: state.version + 1,
      turn: state.turn,
      activePlayer: state.activePlayer,
      board: nextBoard,
      queue: nextQueue,
      bag: nextBag,
      nextIds: nextNextIds,
      lastPlacementBy,
      scores: nextScores,
      status: {
        type: GAME_STATUS_TYPE.ENDED,
        reason: endState.reason,
        winner: endState.winner,
      },
      turnEffects: { shockwave: false, fortifiedTileIds: [] },
      cards: nextCards,
    };
    return { ok: true, state: nextState, events };
  }

  const nextState: GameState = {
    ...state,
    version: state.version + 1,
    turn: state.turn + 1,
    activePlayer: otherPlayer(state.activePlayer),
    board: nextBoard,
    queue: nextQueue,
    bag: nextBag,
    nextIds: nextNextIds,
    lastPlacementBy,
    scores: nextScores,
    turnEffects: { shockwave: false, fortifiedTileIds: [] },
    cards: nextCards,
  };

  return { ok: true, state: nextState, events };
}
