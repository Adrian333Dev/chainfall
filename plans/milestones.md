# Chainfall Milestones

This file is a lightweight checklist to keep implementation focused and prevent thrash.

## M0 — Repo baseline

- [x] Confirm monorepo structure (apps + packages) matches README target
- [x] Keep docs/rules/skills committed and stable
- [x] Ensure pnpm + turbo commands are the single source of truth for running tasks

M0 done when: packages/ui removed, apps/web-canvas and apps/server scaffolded (Vite + Nest CLIs), packages game-core/protocol/bots in place, web-canvas wired to shared eslint/tsconfig, apps/web deleted, root install/lint/build pass.

## M1.1 — Protocol contracts + GameCore API skeleton

- [x] `@chainfall/protocol` exports: PROTOCOL_VERSION, PLAYER, CARD_ID, DEFAULT_GAME_CONFIG, ValueOf, schemas (Coord, CardPlay, GameAction, Placement), types (GameState, GameAction, GameEvent, etc.)
- [x] `@chainfall/game-core` exports stubs: newGame, applyAction, GameCoreErrorCode, IGameCoreError, ApplyActionResult
- [x] Protocol schemas.test.ts (Vitest) with take-turn, placement, card shapes, strict, invalid coords
- [x] `pnpm -w lint`, `pnpm -w check-types`, `pnpm -w test` pass

M1.1 done when: protocol contracts and game-core typed stubs in place; no game logic; repo smoke passes.

## M1.3 — applyAction placement + queue refill + turn advance

- [x] Place Phase: placement required when queue not empty, pass when queue empty; bounds + empty cell validation
- [x] Cards rejected with ILLEGAL_ACTION; ended game rejected with GAME_ENDED
- [x] Placement consumes queue[0], refills from bag, updates board/nextIds/lastPlacementBy
- [x] Turn advance: version, turn, activePlayer swap; turnEffects and cardPlayedThisTurn reset
- [x] Events: TURN_STARTED then TILE_PLACED when placement; no mutation of input state
- [x] apply-action.test.ts (Vitest); `pnpm -w test`, `pnpm -w check-types`, `pnpm -w lint` pass

M1.3 done when: applyAction returns correct errors and state/events for Place Phase; tests and smoke pass.

## M1.4 — Tick Phase in applyAction

- [x] Tick Phase: tiles countdown -= 1 (clamped at 0); walls ttl -= 1, remove when ttl === 0
- [x] TICK_RESOLVED event emitted after TURN_STARTED / TILE_PLACED with tiles and walls deltas
- [x] apply-action.test.ts tick tests (newly placed tile, existing tiles, clamp 0, walls tick/removal, event order, no mutation)
- [x] `pnpm -w test`, `pnpm -w check-types`, `pnpm -w lint` pass

M1.4 done when: applyAction performs Tick Phase; TICK_RESOLVED in correct order; tests and smoke pass.

## M1.5 — Detonation Phase (wave-based) + scoring

- [x] Detonation: find zero tiles, resolve waves (blast = origin + ortho + optional diagonal if shockwave), remove tiles (fortify blocks adjacency, not origin), score +1 per enemy tile for active player, chain trigger from removed countdown===1 positions
- [x] WAVE_RESOLVED and SCORE_CHANGED events; no tiles with countdown 0 after detonation
- [x] apply-action.test.ts detonation tests (single explosion, scoring, chain, fortify, shockwave, invariant)
- [x] `pnpm -w test`, `pnpm -w check-types`, `pnpm -w lint` pass

M1.5 done when: applyAction performs Detonation Phase; WAVE_RESOLVED/SCORE_CHANGED in order; tests and smoke pass.

## M1.6 — End conditions + GAME_ENDED event (standard, mercy, tie-break)

- [x] Mercy rule: config.mercyRule + config.mercyLead; end when lead >= mercyLead after detonation
- [x] Standard end: bag empty, queue empty, no tiles on board; reason STANDARD, winner higher score
- [x] Tie-break: scores equal at standard end; reason TIE, winner = otherPlayer(lastPlacementBy)
- [x] When ended: status ENDED, GAME_ENDED event (reason, winner, finalScores); version +1, turn/activePlayer not advanced
- [x] apply-action.test.ts M1.6 tests: mercy, standard end, tie-break, does not end if tiles remain, ended rejects
- [x] `pnpm -w test`, `pnpm -w check-types`, `pnpm -w lint` pass

M1.6 done when: mercy/standard/tie end work; GAME_ENDED emitted; no turn advance on end; tests and smoke pass.

## M1.7 — Implement all 8 cards + legality + usage tracking

- [x] Card Phase before Place: global legality (cards enabled, 1/turn, max/game, once per card, no target countdown 0)
- [x] All 8 card effects: Reinforce, Accelerate, Fortify, Shockwave, Transplant, Sabotage, Firewall, Scavenge
- [x] Placement validated against post-card board/queue; CARD_PLAYED event; card bookkeeping on success only
- [x] apply-action.test.ts M1.7 tests: global rules, per-card effects, bookkeeping, event order, atomicity
- [x] `pnpm -w test`, `pnpm -w check-types`, `pnpm -w lint` pass

M1.7 done when: applyAction accepts and applies all 8 cards; global constraints enforced; CARD_PLAYED in order; tests and smoke pass.

## M1.8 — Golden replays + invariants harness (determinism lock)

- [x] Replay harness: `runReplay(seed, startingPlayer, actions, config?)` and `assertCoreInvariants(state)` in `packages/game-core/src/replay/`
- [x] At least 6 JSON fixtures under `src/__fixtures__/replays/`: placement-basic, detonation-single-wave, detonation-chain-trigger, end-mercy, end-tie-break, cards-integration
- [x] Tests: fixture outputs match expected, invariants after newGame and each step, determinism (run twice deep-equal)
- [x] Invariants: board dimensions, no negative countdown/ttl, no countdown 0 tiles, unique tile/wall ids, queue/bag 1..4
- [x] `pnpm -w test`, `pnpm -w check-types`, `pnpm -w lint` pass

M1.8 done when: replay harness and 6 fixtures exist; tests verify expected and determinism; repo smoke passes.

## M1 — GameCore (deterministic engine)

- [x] Define state + actions (no IO) (M1.1 protocol + game-core)
- [x] Implement `newGame(...)` (M1.2)
- [x] Implement `applyAction(state, action) -> { state, events }` (Place; M1.3; Tick; M1.4; Detonation; M1.5; End; M1.6; Cards; M1.7)
- [x] Implement queue + bag rules (newGame bag/queue; applyAction consume + refill)
- [x] Implement Tick Phase (M1.4); [x] wave detonation + chain triggers (M1.5); [x] end conditions (M1.6)
- [x] Unit tests for core rules
- [x] Golden replay tests (seed + actions -> final state/score) (M1.8)

## M2 — Protocol package

- [ ] Define WS message types (client->server, server->client)
- [ ] Add runtime validation (schemas)
- [ ] Version fields (protocolVersion, stateVersion)

## M3 — Server (NestJS)

- [ ] WebSocket gateway skeleton
- [ ] Match room lifecycle (create/join/leave/end)
- [ ] Server-authoritative action validation
- [ ] Broadcast state/events
- [ ] Bot controller wiring (casual-only)

## M4 — Web Canvas client (play vs bot)

- [ ] Basic UI shell: Home -> Play vs Bot -> Game
- [ ] Render 6x6 grid + queue + score
- [ ] Place tile action flow
- [ ] Apply server updates to UI
- [ ] Basic animations (optional, minimal)
- [ ] “Match end” screen

## M5 — Supabase (auth + persistence)

- [ ] Auth sign-in / identity in client
- [ ] Server verifies identity
- [ ] Persist profiles + match results
- [ ] Simple rating storage (ranked-lite later)

## M6 — Cards (B-mode)

- [ ] Enable cards in casual matches
- [ ] Enforce limits (per-turn cap, per-game cap)
- [ ] Card effect validation (server authoritative)
- [ ] Tests for each card edge case

## M7 — Ranked-lite

- [ ] Ranked matchmaking queue
- [ ] Simple rating updates
- [ ] Basic history view

## Practice / later

- [ ] Phaser client (apps/web-phaser)
- [ ] Three client (apps/web-three)
- [ ] Playwright E2E smoke tests
- [ ] Mobile packaging (Capacitor) if desired
