# `@proposit/shared`

Runtime-agnostic TypeScript shared between `proposit-server` and `proposit-mobile`.

## What's in it

- `@proposit/shared/schemas` — TypeBox domain and API schemas
- `@proposit/shared/consts` — operational constants (user tiers, task status, roles, argument import origins)
- `@proposit/shared/errors` — custom error classes
- `@proposit/shared/checksum` — checksum config shared by both consumers
- `@proposit/shared/utils` — runtime-agnostic utilities (`strictFetch`, `parseResponse`, embedding text builders, task helpers)

- `@proposit/shared/api-client` — the `createApiClient` factory and its types
- `@proposit/shared/engine/*` — mutations, optimistic updates, derivation, rendering
- `@proposit/shared/ui` — design tokens and brand assets

`package.json`'s `exports` map is the authoritative list.

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

Published to the public npm registry under the `@proposit` scope. `proposit-server` and `proposit-mobile` both depend on a caret-pinned version (`"@proposit/shared": "^0.x.y"`). `@proposit/proposit-core` is a peer dependency — consumers install it themselves.

Sub-path imports only (`@proposit/shared/schemas`, `@proposit/shared/engine/mutations`, …); there is no flat root entry.

To iterate against unpublished changes, point the consumer at `file:../proposit-shared` and keep `pnpm exec tsc -p tsconfig.build.json -w` running so `dist/` stays current.

## First-time setup

```bash
./scripts/first-time-setup.sh   # checks prerequisites and builds dist/
```
