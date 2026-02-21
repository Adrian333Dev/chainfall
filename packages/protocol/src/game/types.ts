import {
  BOARD_CELL_TYPE,
  GAME_STATUS_TYPE,
  GAME_EVENT_TYPE,
} from './constants';
import type {
  Player,
  CardId,
  EndReason,
  ProtocolVersion,
  CountdownValue,
} from './constants';
import type { CardPlay, Coord } from './schemas';

export type TileId = number;
export type WallId = number;

export interface ITile {
  id: TileId;
  owner: Player;
  countdown: number;
}

export interface IWall {
  id: WallId;
  owner: Player;
  ttl: number;
}

export type BoardCell =
  | { type: typeof BOARD_CELL_TYPE.EMPTY }
  | { type: typeof BOARD_CELL_TYPE.TILE; tile: ITile }
  | { type: typeof BOARD_CELL_TYPE.WALL; wall: IWall };

export type Board = BoardCell[][];

export interface IGameConfig {
  boardSize: number;
  queueSize: number;
  cardsEnabled: boolean;
  maxCardsPerTurn: number;
  maxCardsPerGame: number;
  mercyRule: boolean;
  mercyLead: number;
  diagonalExplosions: boolean;
}
export type GameConfig = IGameConfig;

export interface ITurnEffects {
  shockwave: boolean;
  fortifiedTileIds: TileId[];
}

export interface ICardsState {
  enabled: boolean;
  cardPlayedThisTurn: boolean;
  playedCount: Record<Player, number>;
  used: Record<Player, Partial<Record<CardId, true>>>;
}

export type GameStatus =
  | { type: typeof GAME_STATUS_TYPE.IN_PROGRESS }
  | {
      type: typeof GAME_STATUS_TYPE.ENDED;
      reason: EndReason;
      winner: Player;
    };

export interface IGameState {
  protocolVersion: ProtocolVersion;
  version: number;
  config: IGameConfig;
  seed: number;
  turn: number;
  activePlayer: Player;
  scores: Record<Player, number>;
  bag: CountdownValue[];
  queue: CountdownValue[];
  board: Board;
  nextIds: { tile: number; wall: number };
  lastPlacementBy: Player | null;
  turnEffects: ITurnEffects;
  cards: ICardsState;
  status: GameStatus;
}
export type GameState = IGameState;

export type GameEvent =
  | {
      type: typeof GAME_EVENT_TYPE.TURN_STARTED;
      turn: number;
      activePlayer: Player;
    }
  | {
      type: typeof GAME_EVENT_TYPE.CARD_PLAYED;
      player: Player;
      card: CardPlay;
    }
  | {
      type: typeof GAME_EVENT_TYPE.TILE_PLACED;
      player: Player;
      at: Coord;
      tile: ITile;
    }
  | {
      type: typeof GAME_EVENT_TYPE.TICK_RESOLVED;
      tiles: Array<{ id: TileId; from: number; to: number }>;
      walls: Array<{
        id: WallId;
        from: number;
        to: number;
        removed: boolean;
      }>;
    }
  | {
      type: typeof GAME_EVENT_TYPE.WAVE_RESOLVED;
      wave: number;
      explodingTileIds: TileId[];
      removedTileIds: TileId[];
      triggeredTileIds: TileId[];
      pointsGained: number;
    }
  | {
      type: typeof GAME_EVENT_TYPE.SCORE_CHANGED;
      player: Player;
      from: number;
      to: number;
      delta: number;
    }
  | {
      type: typeof GAME_EVENT_TYPE.GAME_ENDED;
      reason: EndReason;
      winner: Player;
      finalScores: Record<Player, number>;
    };
