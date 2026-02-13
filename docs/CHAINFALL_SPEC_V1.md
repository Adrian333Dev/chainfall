# **CHAINFALL — GAME SPEC v1.0**

---

# 1. One-Paragraph Pitch

**Chainfall** is a 1v1 turn-based strategy game played on a 6×6 grid where players place countdown tiles that tick down every turn and explode in chain reactions. The entire game is about spatial timing, forcing detonations in favorable positions, and manipulating inevitable collapse. It is fully deterministic, server-authoritative, and designed for competitive depth with optional modifier cards.

---

# 2. Design Goals

### Primary Goals

- Deterministic and fair
- Easy to learn (place → tick → explode)
- Deep chain-reaction strategy
- Clean and readable rule system
- Competitive-ready
- Works without fancy visuals

### Secondary Goals

- Supports bot play
- Supports multiple renderers
- Configurable rule variants
- Mobile-compatible

### Non-Goals (v1)

- Complex economy
- Characters / units
- Real-time gameplay
- Heavy monetization systems
- Massive meta complexity

---

# 3. Core Definitions

## 3.1 Board

- 6×6 grid
- Coordinates: `(row, col)` where 0 ≤ row, col ≤ 5

## 3.2 Tile (Bomb Tile)

Each tile has:

- Owner: Blue or Red
- Countdown value: integer (1–4 normally)
- Unique ID

A tile is a timed explosive object.

## 3.3 Orthogonal Neighbors

A tile affects:

- Up
- Down
- Left
- Right

No diagonals in base rules.

---

# 4. Setup

## 4.1 Bag Composition

Total tiles: 36

| Countdown | Quantity |
| --------- | -------- |
| 1         | 8        |
| 2         | 10       |
| 3         | 10       |
| 4         | 8        |

## 4.2 Queue

- Shared queue of next 8 countdown values
- Visible to both players
- Numbers only (no owner until placed)

## 4.3 Initialization

1. Shuffle bag (server-owned seed)
2. Fill queue with first 8 values
3. Empty board
4. Scores start at 0
5. Decide first player

---

# 5. Turn Structure (Exact Order)

Each turn has four phases.

---

## Phase 1: Card Phase (Optional)

If cards are enabled:

- Player may play **at most 1 card per turn**
- Card must have uses remaining
- Card cannot target countdown 0 tiles
- Card resolves immediately
- Then continue to placement

If cards disabled → skip phase.

---

## Phase 2: Place Phase

If queue not empty:

1. Remove first number from queue.
2. Place tile with that countdown on any empty cell.
3. Tile becomes owned by active player.
4. Refill queue from bag until size is 8 or bag empty.

If queue empty:

- No placement occurs.

---

## Phase 3: Tick Phase

All tiles on board:

```
countdown -= 1
```

Walls (if present):

```
ttl -= 1
remove wall if ttl == 0
```

---

## Phase 4: Detonation Phase (Wave-Based)

### Step A: Find Zero Tiles

Collect all tiles with countdown == 0.

### Step B: Resolve Waves

While there are zero tiles:

1. Mark them as exploding.
2. Determine blast cells:

   - exploding tile cell
   - orthogonal neighbors
   - if Shockwave active → include diagonals

3. Remove all blast tiles simultaneously

   - Fortified tiles survive adjacency removal
   - If a fortified tile itself is at 0, it still explodes

4. Scoring:

   - Active player gains 1 point per enemy tile removed
   - Self-removed tiles give no points

5. Chain Trigger:

   - Any removed tile that had countdown == 1 at removal time becomes next wave explosion

6. Repeat

All waves belong to the active player’s turn.

---

# 6. Scoring

- Only active player scores during their detonation phase.
- 1 point per enemy tile removed.
- No negative scoring.
- No score sharing.

---

# 7. End Conditions

## Standard End

Game ends when:

- Bag empty
- Queue empty
- No further placements possible
- No further detonations possible

## Mercy Rule (Default Enabled)

If score difference ≥ 8:

- Game ends immediately
- Higher score wins

## Tie

If tied:

- Player who placed last tile loses

---

# 8. Cards System

Cards are available in both Casual and Ranked modes.

Default mode = **B mode**

- Max 4 cards per game
- Max 1 per turn
- Each card usable once

This can be configured.

---

## Card List (v1)

### Reinforce

+1 countdown to own tile.

### Accelerate

-1 countdown to own tile (min 1).

### Fortify

Tile immune to adjacency removal this turn.
Still explodes if reaches 0.

### Shockwave

This turn’s explosions affect diagonals.

### Transplant

Swap two own tiles.

### Sabotage

-1 countdown to enemy tile (min 1).

### Firewall

Place wall token on empty cell.

- Lasts 2 ticks.
- Blocks placement.
- Not destroyed by explosions.

### Scavenge

Swap queue[0] and queue[1].
Then place normally.

---

# 9. Game Modes

## Casual

- Human vs Human
- Human vs Bot
- Cards enabled by default
- No rating impact

## Ranked-lite

- Human vs Human only
- Simple ELO
- Cards enabled (B mode)
- Mercy rule enabled

---

# 10. Configuration Options

| Option              | Default |
| ------------------- | ------- |
| Board size          | 6       |
| Queue size          | 8       |
| Cards enabled       | true    |
| Max cards per turn  | 1       |
| Max cards per game  | 4       |
| Mercy rule          | true    |
| Mercy lead          | 8       |
| Diagonal explosions | false   |

---

# 11. Determinism

Given:

- Initial shuffle seed
- Starting player
- Full ordered action list

Game result is deterministic.

---

# 12. Replay Support

Replay requires:

- Initial seed
- Config
- Starting player
- Sequence of actions

State can be reconstructed exactly.

---

# 13. What v1 Does NOT Include

- Spectator mode
- Replay UI
- Draft system (can be added later)
- Cosmetic monetization
- Seasons
- Advanced anti-cheat beyond server authority

---

This document is now the **locked game design source of truth** for Chainfall v1.

---
