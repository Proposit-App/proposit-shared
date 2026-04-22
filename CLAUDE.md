# `proposit-shared` — Claude Code Guide

## Generic instructions

- Git commit messages should not include any co-authoring content.
- All TypeScript work must follow the `brain-style` skill (TypeScript sub-skill) for naming and casing.
- ESM import requirements: all relative imports in `src/` must end in `.js`. Directory imports must use the explicit index path (e.g. `./schemas/index.js`).
- `lib: ["ES2022"]` is enforced — no `window`, `document`, `Buffer`, `process`, or other platform-specific globals in source. Dev/test code (not in `dist/`) may use Node via `@types/node`.
- After a major set of changes, offer `pnpm version patch|minor|major`. First published version will be `0.1.0` (at Phase 0 PR 5).
- Pre-1.0 versioning policy: minor bumps may include breaking changes (per semver §4). Consumers should pin with caret (`^0.x.y`) knowing that any `0.x+1.0` could break them.

## Broker coordination

This repo's Claude Code agent coordinates with sibling repos (and the workspace orchestrator at `/Users/brian/Projects/Proposit-App/`) via the `skill-cefailures:broker` skill over a shared Unix socket.

- **Durable DM room:** topic `shared`, current conversation ID `0c7d35` (verify via `broker list --identity shared --status all`; recreate if missing). This is your always-on mailbox for cross-repo coordination, sub-project kickoffs, and orchestrator messages. It persists across phases.
- **Broker identity:** `shared`.
- **Session startup:** at the start of any multi-repo work, launch a persistent background follow on your durable DM room so incoming messages stream live:

    ```bash
    broker follow --identity shared 0c7d35
    ```

    Run it via `Bash(run_in_background: true)` so it streams without blocking your main loop.

- **Sub-project rooms coexist.** When a cross-repo initiative starts (e.g. Phase 1 sub-project 1C), the orchestrator creates sub-project-scoped rooms (e.g. `phase-1-1c-shared`) and pings you here with the ID. Join and follow those for scoped signals; the durable DM room stays the always-on channel.

- **Signal prefixes** for coordination messages so the orchestrator can route them:
    - `READY: <what>` — a milestone landed that unblocks downstream work.
    - `BLOCKED: <on-whom> <what>` — stuck waiting on someone.
    - `DECISION: <topic> → <choice>` — a coordination question resolved.
    - `QUESTION: <target> <what>` — open question needing input.

- **Do not poll.** Never write a `while true; broker read; sleep N` loop — use `broker follow` for blocking waits. See the `/skill-cefailures:broker` skill docs for full CLI reference and canonical patterns.

## Commands

```bash
pnpm run typecheck   # tsc --noEmit
pnpm run lint        # prettier --check + eslint
pnpm run prettify    # prettier --write
pnpm run test        # vitest run
pnpm run build       # tsc -p tsconfig.build.json → dist/
pnpm run check       # full pipeline
```

During development, consumers that reference this package via `file:../proposit-shared` need `dist/` to be current. Keep `pnpm exec tsc -p tsconfig.build.json -w` running if iterating across the boundary.

## Package structure

Sub-entry exports only — no flat root import. `package.json` `exports`:

- `./schemas` → `src/schemas/index.ts`
- `./schemas/api/auth` → `src/schemas/api/auth/index.ts`
- `./consts` → `src/consts/index.ts`
- `./errors` → `src/errors.ts`
- `./checksum` → `src/checksum.ts`
- `./utils` → `src/utils/index.ts`
- `./api-client` → `src/api-client/index.ts` (factory: `createApiClient`, types `TApiClient`, `TApiClientConfig`)
- `./engine/mutations` → `src/engine/mutations/index.ts`
- `./engine/optimistic` → `src/engine/optimistic/index.ts`
- `./engine/*` → `src/engine/**` (file-flavored sub-paths)

## Key design rules

- **No DOM, no Node-only APIs in source.** Enforced by `tsconfig.json`'s `lib: ["ES2022"]`. Add `types: ["node", "vitest/globals"]` is for tooling; don't import Node APIs in code that ends up in `dist/`.
- **No flat root entry.** `import "@proposit/shared"` (no sub-path) does not resolve. Deliberate: keeps the mental model that server and mobile both have.
- **`@proposit/proposit-core` is a peerDependency.** Consumers (server, mobile) install it directly. This package lists it in `devDependencies` as well so local tests and builds can resolve it.
- **TypeBox for schema validation.** Re-exported as-needed from `schemas/` sub-entry.
- **Exports map declares `default` alongside `import`.** Every subpath in `package.json`'s `exports` declares `types`, `import`, AND `default` (pointing to the same `.js` file as `import`). Needed so non-`import`-aware resolvers (Jest's CJS resolver, older bundlers) can locate dist files. When adding a new subpath, include all three conditions.

## Naming conventions

Defined in the `brain-style` skill. Enforced by ESLint (`@typescript-eslint/naming-convention` and `check-file/filename-naming-convention`).
