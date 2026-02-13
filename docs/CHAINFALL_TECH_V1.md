# CHAINFALL_TECH_V1.md (Tech + Architecture + Build Plan)

This document defines the recommended, **best-practice** technical architecture for Chainfall v1 while staying **clean and readable**. It is optimized for learning game-dev fundamentals (determinism, authoritative simulation, netcode, bots, replays) and for reuse across future games.

---

## 1) Goals

### 1.1 Primary tech goals

- **Single deterministic GameCore** (one truth for rules)
- **Server-authoritative multiplayer** (anti-cheat by design)
- **Readable codebase** (avoid overengineering)
- **Strong typing + validation** (prevent desync and runtime bugs)
- **Extensible rendering** (React Canvas first; Phaser/Three later)
- **Bot support** (casual-only) for learning + testing
- **Security-first baseline** (auth, validation, rate limits)

### 1.2 Non-goals (v1)

- Microservices
- Redis / message queues
- Dedicated game servers per region
- Complex infra (K8s)
- Heavy analytics pipelines

---

## 2) Stack (Locked)

### Monorepo

- **pnpm**
- **Turborepo**
- TypeScript everywhere

### Backend

- **NestJS**
- WebSockets for realtime turns (low-frequency but interactive)
- Authoritative rooms in memory (v1)

### Auth + DB

- **Supabase**

  - Auth (JWT)
  - Postgres DB (profiles, rating, match history)
  - RLS for data safety (where appropriate)

### Frontend

- **React + Vite**
- **Canvas renderer** for board
- PWA-friendly UI (mobile web)
- Later: **Capacitor** wrapper for Android/iOS
- Later: **Tauri** (optional) for desktop packaging

### Practice renderers (later)

- Phaser (2D) client
- Three.js (3D) client
  (These must be “thin” renderers consuming the same state/events.)

---

## 3) Repo Layout (Minimal files, clean separation)

```
/apps
  /server           # NestJS: WebSocket gateway + matchmaking + rooms
  /web-react        # React + Canvas client

  # optional later practice apps:
  /web-phaser
  /web-three

/packages
  /core             # deterministic rules engine (no IO)
  /protocol         # shared message schemas + zod validators
  /bots             # bot controllers (calls core only)

/docs
  CHAINFALL_SPEC_V1.md
  CHAINFALL_TECH_V1.md

/turbo.json
/pnpm-workspace.yaml
```

**Rule:** `/packages/core` contains zero networking, zero rendering, zero storage.

---

## 4) Architecture (Best-practice, not overcomplicated)

### 4.1 The key pattern: deterministic simulation

All rules are implemented as:

`(state, action) -> (newState, events)`

- `state` is serializable
- `action` is the player intent (place tile, play card)
- `events` describe what happened (for animations/logging)

This is the most important “game-dev concept” you’ll learn here.

### 4.2 Server-authoritative flow

- Client sends **intent** only.
- Server validates:

  - auth
  - it’s your match
  - correct phase/turn
  - action is legal

- Server applies action via GameCore
- Server broadcasts results (events or snapshot)

This prevents cheating and desync.

---

## 5) Packages (Core, Protocol, Bots)

### 5.1 `/packages/core` (rules engine)

Exports:

- `newGame(config, seed, startingPlayer, cardsByPlayer)`
- `applyAction(state, action) -> { state, events }`
- helpers:

  - `getLegalActions(state)` or at minimum `getLegalPlacements(state)`
  - `assertValidState(state)` (dev-only checks)

Best practices:

- Pure functions
- No Date.now / randomness inside `applyAction`
- All randomness comes from `seed` at `newGame`
- 100% unit test coverage for:

  - queue behavior
  - chain waves
  - scoring
  - each card effect edge cases

### 5.2 `/packages/protocol` (shared WS schemas)

Purpose:

- One definition of messages for server and all clients

Best practices:

- Use `zod` to validate all incoming messages server-side
- Use versioning:

  - `protocolVersion: 1`
  - `stateVersion` increments per action

### 5.3 `/packages/bots`

- Bots never bypass validation.
- Bot chooses an `Action` then server submits it through the same path.

Bot versions:

- v1: greedy sim bot (no cards)
- v1.1: card-aware greedy
- v2: shallow lookahead
- v3: MCTS timeboxed

---

## 6) Server (NestJS) Design (Clean modules)

### 6.1 Modules

- `AuthModule`
- `MatchmakingModule`
- `GameRoomsModule`
- `ProfilesModule` (optional; can be in AuthModule)
- `HealthModule`

### 6.2 WebSocket Gateway

Responsibilities:

- Authenticate socket on connect (Supabase JWT)
- Join/leave matchmaking queue and rooms
- Receive `SubmitAction` messages
- Dispatch to room service
- Broadcast `Events` or `Snapshot`

Best practices:

- Validate every message with zod
- Never trust client state
- Rate-limit submitAction per socket

### 6.3 Room service

Room holds:

- `matchId`
- two controllers:

  - human socket / bot controller

- authoritative `GameState`
- `stateVersion`
- timer state (optional v1)

Actions:

- `startMatch()`
- `submitAction(player, action)`
- `broadcast(events)` or `broadcast(snapshot)`
- `endMatch(reason)`

### 6.4 Matchmaking

Simple and readable v1:

- FIFO queues per mode:

  - `casual`
  - `ranked-lite`
  - `bot`

Match found:

- create room
- send snapshot
- start turn loop

---

## 7) Supabase (Auth + DB)

### 7.1 Auth best practices

- Client authenticates via Supabase
- Client sends Supabase JWT in WS connect handshake (or first message)
- Server verifies via Supabase JWKS / JWT verify

Don’t store secrets in client.
Rotate keys via Supabase.

### 7.2 Minimal DB schema (v1)

Tables:

**profiles**

- `id (uuid, pk)` = Supabase auth user id
- `display_name`
- `created_at`

**ratings**

- `user_id (uuid, pk)`
- `mode` (`ranked_lite`)
- `rating` (int, default 1000)
- `updated_at`

**matches**

- `id (uuid pk)`
- `mode`
- `player_blue (uuid)`
- `player_red (uuid)`
- `winner (uuid|null)`
- `score_blue (int)`
- `score_red (int)`
- `ended_at`
- `replay_seed (text/int)`
- `replay_actions (jsonb)` (optional v1; can store later)

**decks** (optional v1 if you persist card set)

- `user_id`
- `cards (jsonb)` (list of card ids)

### 7.3 RLS (Row Level Security)

Keep RLS simple:

- profiles: user can update own display name
- ratings: user can read own; server writes
- matches: user can read matches where they participated
- server uses service role key for inserts/updates

---

## 8) Client (React + Canvas)

### 8.1 UI components

- Home:

  - Play Casual
  - Play Ranked-lite
  - Play vs Bot (difficulty)

- Match screen:

  - board canvas
  - queue display
  - hand cards
  - score
  - turn indicator
  - action log (simple)

### 8.2 Canvas renderer approach (best practice)

- Keep render pure: `draw(state, transientAnimations)`
- Store only minimal view state:

  - hover cell
  - selected card
  - selected targets
  - animation queue derived from `events`

### 8.3 Networking best practices

- Reconnect support:

  - on reconnect, request snapshot

- Action IDs:

  - client sends `clientActionId`
  - server replies accept/reject referencing it

### 8.4 Mobile best practices (web)

- Use pointer events (mouse + touch)
- Large tap targets
- Avoid tiny UI in corners
- Prefer short tooltips over long text

---

## 9) Bots (Casual only)

### 9.1 How bots play

When it’s bot’s turn:

- server calls `chooseAction(state, botSettings)`
- server submits it like a human action

### 9.2 v1 bot (greedy)

- Enumerate all legal placements
- Simulate action with GameCore
- Choose move maximizing:

  - points gained this turn
  - minus own tiles lost
  - tie-break: center preference

v1 bot uses **no cards**.
Bot mode config sets `cardsEnabled=false`.

Later: enable cards.

---

## 10) Testing (Best practices)

### 10.1 Core unit tests (must-have)

- queue pop/refill correctness
- tick correctness
- explosion wave correctness
- chain trigger correctness
- scoring correctness
- each card legality + effect

### 10.2 Golden replay tests

- Store a few action sequences and expected final scores/state
- Re-run after every change to prevent regressions

### 10.3 Property tests (optional but powerful)

- “No negative countdown after stable end”
- “No tiles remain with countdown 0 after detonation phase”
- “Detonation terminates”

### 10.4 End-to-end tests (Playwright)

- Start app
- Join bot match
- Place tile
- Verify queue shifts and score updates

---

## 11) Deployment (Best practices)

### 11.1 Environments

- dev
- staging
- prod

### 11.2 Secrets

- Supabase anon key only in client
- Supabase service role key only on server
- JWT verification keys fetched securely

### 11.3 Hosting

- Web: Vercel/Netlify/Cloudflare Pages
- Server: Fly.io/Railway/Render (WebSocket-friendly)

---

## 12) Mobile/Desktop packaging (practice roadmap)

### Phase 1: Web

- Ship as web app first

### Phase 2: PWA

- Add manifest + service worker
- Offline “practice bot” mode possible later

### Phase 3: Capacitor

- Wrap web-react into Android/iOS builds
- Learn store signing and deployment

### Phase 4: Desktop (optional)

- Tauri wrapper

---

## 13) Practice Renderers (Future)

### 13.1 Phaser client

- Use same WS protocol + state
- Phaser draws board sprites, explosion effects
- No game logic

### 13.2 Three.js client

- Use same WS protocol + state
- Render 3D tiles, lighting, animations
- No game logic

---

## 14) AI-assisted dev workflow (based on your approach)

We’ll follow the same principles you shared:

- Single source of truth spec
- Plan-first implementation
- Automated tests
- Asset index (even if minimal)
- Iterate in small commits

Workflow:

1. Update spec docs first
2. Generate implementation plan
3. Implement one module at a time (core → server → client)
4. Add tests immediately
5. Use bots to stress-test

---

## 15) Implementation Milestones (Order)

### Milestone 0: Repo scaffold

- turborepo + pnpm workspace
- lint/format + tsconfig base

### Milestone 1: Core engine

- state + actions + applyAction
- unit tests for detonation + queue

### Milestone 2: Server

- NestJS ws gateway
- room creation + bot matches

### Milestone 3: React client

- connect, join bot, play full match

### Milestone 4: Supabase persistence

- profiles + ratings + match history

### Milestone 5: Cards (B mode)

- enable in casual
- enable in ranked-lite

### Milestone 6: Ranked-lite

- ELO update on match end
- simple matchmaking bands

### Milestone 7: Practice renderers

- Phaser then Three.js

### Milestone 8: Packaging

- PWA then Capacitor

---
