# Chainfall

Chainfall is a deterministic 1v1 turn-based strategy game played on a grid with countdown “bomb tiles” that tick down and explode in chain reactions.

This repo is a Turborepo monorepo intended to support multiple clients (Canvas / Phaser / Three.js) against a single authoritative NestJS server.

## Canonical docs (read these first)

- `docs/CHAINFALL_SPEC_V1.md` — game rules (source of truth)
- `docs/CHAINFALL_TECH_V1.md` — architecture + implementation plan
- `.cursor/rules/*.mdc` — Cursor rules (coding conventions + structure)
- `.cursor/skills/*` — skills (invoked explicitly in prompts)

## Repo layout (target)

```
.
├── apps/
│   ├── web-canvas/      # React + Canvas client (v1)
│   ├── web-phaser/      # Phaser client (practice)
│   ├── web-three/       # Three.js client (practice)
│   └── server/          # NestJS (WebSocket + matchmaking + authoritative rooms)
├── packages/
│   ├── game-core/       # deterministic engine: (state, action) -> (state, events)
│   ├── protocol/        # shared message schemas + types (WS contracts)
│   └── bots/            # bot controllers (call game-core only)
├── docs/
│   ├── CHAINFALL_SPEC_V1.md
│   └── CHAINFALL_TECH_V1.md
└── plans/
    └── milestones.md
```

## Prerequisites

- Node.js (LTS recommended)
- pnpm
- Turbo (optional; `pnpm exec turbo` works without global install)

## Setup

```bash
pnpm install
```

## Common commands

> These will stabilize as the repo evolves. Prefer using turbo filters instead of ad-hoc scripts.

Run everything in dev (when configured):

```bash
pnpm exec turbo dev
```

Run a specific app/package:

```bash
pnpm exec turbo dev --filter=web-canvas
pnpm exec turbo dev --filter=server
```

Run tests:

```bash
pnpm exec turbo test
```

Typecheck / lint:

```bash
pnpm exec turbo check-types
pnpm exec turbo lint
```

The main client is `web-canvas`. Root `pnpm dev`, `pnpm build`, and `pnpm lint` run for Chainfall apps (web-canvas, server) and packages (game-core, protocol, bots). Package names: `@chainfall/game-core`, `@chainfall/protocol`, `@chainfall/bots`. Clients depend on `@chainfall/protocol` only; server on `@chainfall/game-core` + `@chainfall/protocol`; bots on `@chainfall/game-core`.

## How we work (AI + human workflow)

- **Game rules live in the spec.** If rules change, update `docs/CHAINFALL_SPEC_V1.md` first.
- **Determinism:** Game logic lives in `packages/game-core` and must be replayable.
- **Server authoritative:** Clients are renderers + input only; server validates all actions.
- **Skills are invoked explicitly.** (No skill is “automatic” unless you call it in the prompt.)
- Keep changes small and readable; use git commits as your “preview and rollback.”

## Milestones

See: `plans/milestones.md`

## Notes

- This project is designed to start with a playable “Play vs Bot” loop as early as possible.
- Later clients (Phaser/Three) should reuse the same `packages/protocol` + server state and must not re-implement game rules.

## Dev Commands

### Uselful Commands

```bash # generate a changes context file
{
  echo "## SUMMARY"
  git status --porcelain=v1
  echo
  echo "## DIFF"
  git diff HEAD
} > changes_context.txt
```

```bash # generate a tree of a directory (ignore node_modules, .git, etc.)
tree -I 'node_modules|.git' . > tree.txt
```
