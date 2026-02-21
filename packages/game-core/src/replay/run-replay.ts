import type { GameState, GameAction, GameEvent, Player, GameConfig } from '@chainfall/protocol';
import { newGame, applyAction } from '../index';

export interface IRunReplayArgs {
  seed: number;
  startingPlayer: Player;
  actions: GameAction[];
  config?: Partial<GameConfig>;
}

export interface IRunReplayOptions {
  /** Called after newGame and after each applyAction (with the resulting state). */
  onAfterStep?: (state: GameState) => void;
}

export interface IRunReplayResult {
  finalState: GameState;
  eventsByAction: GameEvent[][];
}

/**
 * Runs a full replay from seed: newGame then applyAction for each action.
 * Uses only public API (newGame, applyAction).
 * Throws if any action returns ok: false.
 */
export function runReplay(
  args: IRunReplayArgs,
  options?: IRunReplayOptions,
): IRunReplayResult {
  let state = newGame({
    seed: args.seed,
    startingPlayer: args.startingPlayer,
    config: args.config,
  });

  options?.onAfterStep?.(state);

  const eventsByAction: GameEvent[][] = [];

  for (const action of args.actions) {
    const result = applyAction(state, action);
    if (!result.ok) {
      throw new Error(
        `Replay action failed: ${result.error.code}${result.error.message ? ` — ${result.error.message}` : ''}`,
      );
    }
    eventsByAction.push(result.events);
    state = result.state;
    options?.onAfterStep?.(state);
  }

  return {
    finalState: state,
    eventsByAction,
  };
}
