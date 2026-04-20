# `proposit-shared` — Claude Code Guide

## Generic instructions

- Git commit messages should not include any co-authoring content.
- All TypeScript work must follow the `brain-style` skill (TypeScript sub-skill) for naming and casing.
- ESM import requirements: all relative imports in `src/` must end in `.js`. Directory imports must use the explicit index path (e.g. `./schemas/index.js`).
- `lib: ["ES2022"]` is enforced — no `window`, `document`, `Buffer`, `process`, or other platform-specific globals in source. Dev/test code (not in `dist/`) may use Node via `@types/node`.
- After a major set of changes, offer `pnpm version patch|minor|major`. First published version will be `0.1.0` (at Phase 0 PR 5).

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
- `./consts` → `src/consts/index.ts`
- `./errors` → `src/errors.ts`
- `./checksum` → `src/checksum.ts`
- `./utils` → `src/utils/index.ts`
- `./api-client/argument` → `src/api-client/argument/index.ts`
- `./api-client/argument/logic` → `src/api-client/argument/logic/index.ts`
- `./api-client/*` → `src/api-client/**` (file-flavored sub-paths)
- `./engine/mutations` → `src/engine/mutations/index.ts`
- `./engine/optimistic` → `src/engine/optimistic/index.ts`
- `./engine/*` → `src/engine/**` (file-flavored sub-paths)

## Key design rules

- **No DOM, no Node-only APIs in source.** Enforced by `tsconfig.json`'s `lib: ["ES2022"]`. Add `types: ["node", "vitest/globals"]` is for tooling; don't import Node APIs in code that ends up in `dist/`.
- **No flat root entry.** `import "@proposit/shared"` (no sub-path) does not resolve. Deliberate: keeps the mental model that server and mobile both have.
- **`@proposit/proposit-core` is a peerDependency.** Consumers (server, mobile) install it directly. This package lists it in `devDependencies` as well so local tests and builds can resolve it.
- **TypeBox for schema validation.** Re-exported as-needed from `schemas/` sub-entry.

## Naming conventions

Defined in the `brain-style` skill. Enforced by ESLint (`@typescript-eslint/naming-convention` and `check-file/filename-naming-convention`).
