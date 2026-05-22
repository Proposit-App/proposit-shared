# `proposit-shared` — Claude Code Guide

## Generic instructions

- Git commit messages should not include any co-authoring content.
- All TypeScript work must follow the `brain-style` skill (TypeScript sub-skill) for naming and casing.
- ESM import requirements: all relative imports in `src/` must end in `.js`. Directory imports must use the explicit index path (e.g. `./schemas/index.js`).
- `lib: ["ES2022"]` is enforced — no `window`, `document`, `Buffer`, `process`, or other platform-specific globals in source. Dev/test code (not in `dist/`) may use Node via `@types/node`.
- After a major set of changes, offer `pnpm version patch|minor|major`. First published version will be `0.1.0` (at Phase 0 PR 5).
- Pre-1.0 versioning policy: minor bumps may include breaking changes (per semver §4). Consumers should pin with caret (`^0.x.y`) knowing that any `0.x+1.0` could break them.

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

## Grammar rule-code coordination protocol

`@proposit/proposit-core` owns the wire format — both the `TGrammarRuleCode` union and the validator implementations that emit each code at runtime. `@proposit/shared/schemas/grammar` is a re-export module so server and mobile have a single import path for the grammar wire-format types. The 422-equivalent response envelope at `@proposit/shared/schemas/api/grammar-violations` (composing `TViolation`) is the only grammar-related artifact authored in shared.

Adding or renaming a rule code is a coordinated **core → shared → consumers** publish chain:

1. **Bump core** (extend `TGrammarRuleCode` union in `src/lib/grammar/types.ts` + ship the validator emitting the new code). Major if any consumer-visible behavior changes; minor if purely additive.
2. **Bump shared minor** — the re-export at `src/schemas/grammar/index.ts` automatically reflects core's union via the dep range. No shared code changes are needed unless the 422 envelope shape itself changes.
3. **Bump server + mobile** to pick up both new versions in lockstep. Server and mobile may import the types from either `@proposit/proposit-core` or `@proposit/shared/schemas/grammar` — both resolve to the same TypeBox schemas + derived types.

**Reserved codes** stay out of the union forever. As of `0.9.0`, `E-2` and `D-7` are reserved (their rules were promoted/restated in the 2026-05-13 grammar-tiers redesign; see spec §4.2 / §4.3). Comments in core's `types.ts` document the reservations — leave them in place.

The dep range plus core's exhaustive union types make TypeScript the enforcement point: a build against a shared whose peer-dep range admits a core that doesn't yet ship a referenced code would fail at the type-check step.

## Naming conventions

Defined in the `brain-style` skill. Enforced by ESLint (`@typescript-eslint/naming-convention` and `check-file/filename-naming-convention`).
