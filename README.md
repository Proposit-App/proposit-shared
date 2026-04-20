# `@proposit/shared`

Runtime-agnostic TypeScript shared between `proposit-server` and `proposit-mobile`.

## What's in it

- `@proposit/shared/schemas` — TypeBox domain and API schemas
- `@proposit/shared/consts` — operational constants (user tiers, task status, roles, argument import origins)
- `@proposit/shared/errors` — custom error classes
- `@proposit/shared/checksum` — checksum config shared by both consumers
- `@proposit/shared/utils` — runtime-agnostic utilities (`strictFetch`, `parseResponse`, embedding text builders, task helpers)

Future sub-entries: `@proposit/shared/api-client` (PR 3), `@proposit/shared/engine` (PR 4).

## What's NOT in it

This package is intentionally runtime-agnostic: `lib: ["ES2022"]` only, no DOM, no Node-only APIs. Server-only code (database, NextAuth, Next.js routing, filesystem, process management) stays in `proposit-server`. Web-client-only code (React components, MUI, ReactFlow) also stays there.

## Commands

```bash
pnpm run typecheck   # tsc --noEmit
pnpm run lint        # prettier --check + eslint
pnpm run prettify    # prettier --write
pnpm run test        # vitest run
pnpm run build       # tsc -p tsconfig.build.json → dist/
pnpm run check       # all of the above in sequence
```

## Consuming this package

Currently consumed via `file:../proposit-shared` path-dep from the `proposit-server` feature branch. When Phase 0 completes, consumers switch to a versioned dep from npm (public registry, `@proposit` scope).
