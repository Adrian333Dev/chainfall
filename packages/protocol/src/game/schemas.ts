import { z } from 'zod';
import { CARD_ID, DEFAULT_GAME_CONFIG, GAME_ACTION_TYPE } from './constants';

export const Coord = z
  .object({
    row: z.number().int().nonnegative(),
    col: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (c) =>
      c.row < DEFAULT_GAME_CONFIG.boardSize &&
      c.col < DEFAULT_GAME_CONFIG.boardSize,
    { message: 'Coord out of board bounds' },
  );
export type Coord = z.infer<typeof Coord>;

export const Placement = z.object({ at: Coord }).strict();
export type Placement = z.infer<typeof Placement>;

const reinforce = z
  .object({ id: z.literal(CARD_ID.REINFORCE), target: Coord })
  .strict();
const accelerate = z
  .object({ id: z.literal(CARD_ID.ACCELERATE), target: Coord })
  .strict();
const fortify = z
  .object({ id: z.literal(CARD_ID.FORTIFY), target: Coord })
  .strict();
const shockwave = z.object({ id: z.literal(CARD_ID.SHOCKWAVE) }).strict();
const transplant = z
  .object({ id: z.literal(CARD_ID.TRANSPLANT), a: Coord, b: Coord })
  .strict();
const sabotage = z
  .object({ id: z.literal(CARD_ID.SABOTAGE), target: Coord })
  .strict();
const firewall = z
  .object({ id: z.literal(CARD_ID.FIREWALL), target: Coord })
  .strict();
const scavenge = z.object({ id: z.literal(CARD_ID.SCAVENGE) }).strict();

export const CardPlay = z.discriminatedUnion('id', [
  reinforce,
  accelerate,
  fortify,
  shockwave,
  transplant,
  sabotage,
  firewall,
  scavenge,
]);
export type CardPlay = z.infer<typeof CardPlay>;

export const GameAction = z
  .object({
    type: z.literal(GAME_ACTION_TYPE.TAKE_TURN),
    card: CardPlay.optional(),
    placement: Placement.optional(),
  })
  .strict();
export type GameAction = z.infer<typeof GameAction>;
