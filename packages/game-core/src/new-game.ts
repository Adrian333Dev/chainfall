import {
  DEFAULT_GAME_CONFIG,
  COUNTDOWN_VALUE,
  PLAYER,
  BOARD_CELL_TYPE,
  GAME_STATUS_TYPE,
  PROTOCOL_VERSION,
} from '@chainfall/protocol';
import type { IGameConfig, IGameState, GameConfig, Player } from '@chainfall/protocol';
import { createRng } from './rng';

export interface INewGameArgs {
  seed: number;
  startingPlayer: Player;
  config?: Partial<GameConfig>;
}

function buildOrderedBag(): number[] {
  const { ONE, TWO, THREE, FOUR } = COUNTDOWN_VALUE;
  return [
    ...Array(8).fill(ONE),
    ...Array(10).fill(TWO),
    ...Array(10).fill(THREE),
    ...Array(8).fill(FOUR),
  ];
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  const rng = createRng(seed);
  for (let i = out.length - 1; i >= 1; i--) {
    const j = rng.nextInt(i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function buildNewGame(args: INewGameArgs): IGameState {
  const config: IGameConfig = {
    ...DEFAULT_GAME_CONFIG,
    ...args.config,
  };

  const orderedBag = buildOrderedBag();
  const shuffled = shuffleWithSeed(orderedBag, args.seed);

  const queueSize = Math.min(config.queueSize, shuffled.length);
  const queue = shuffled.slice(0, queueSize) as IGameState['queue'];
  const bag = shuffled.slice(queueSize) as IGameState['bag'];

  const boardSize = config.boardSize;
  const emptyCell = { type: BOARD_CELL_TYPE.EMPTY } as const;
  const board: IGameState['board'] = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => ({ ...emptyCell })),
  );

  const scores: Record<typeof PLAYER.BLUE | typeof PLAYER.RED, number> = {
    [PLAYER.BLUE]: 0,
    [PLAYER.RED]: 0,
  };

  const playedCount: Record<typeof PLAYER.BLUE | typeof PLAYER.RED, number> = {
    [PLAYER.BLUE]: 0,
    [PLAYER.RED]: 0,
  };

  const used: Record<typeof PLAYER.BLUE | typeof PLAYER.RED, Record<string, never>> = {
    [PLAYER.BLUE]: {},
    [PLAYER.RED]: {},
  };

  return {
    protocolVersion: PROTOCOL_VERSION,
    version: 0,
    config,
    seed: args.seed,
    turn: 1,
    activePlayer: args.startingPlayer,
    scores,
    bag,
    queue,
    board,
    nextIds: { tile: 1, wall: 1 },
    lastPlacementBy: null,
    turnEffects: { shockwave: false, fortifiedTileIds: [] },
    cards: {
      enabled: config.cardsEnabled,
      cardPlayedThisTurn: false,
      playedCount,
      used,
    },
    status: { type: GAME_STATUS_TYPE.IN_PROGRESS },
  };
}
