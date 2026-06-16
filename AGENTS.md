# `proposit-shared` — Claude Code Guide

## Repository scope and identity

`proposit-shared` is the runtime-agnostic TypeScript library shared by Proposit's web app (`proposit-server`) and mobile app (`proposit-mobile`). Published as `@proposit/shared`. Compiles against `lib: ["ES2022"]`; any browser-only or Node-only access path must be feature-gated, never an unconditional import.

**This repo owns:**

- Cross-platform TypeBox schemas: server↔client API contracts (auth, argument, review, ingest-argument, pipeline-status, task-retry, user, reaction, errors, the grammar-violations envelope, processing-failure) and integration schemas
- Shared constants, error types, checksum config, and small utilities used by both web and mobile
- The `createApiClient` factory and its companion types (`TApiClient`, `TApiClientConfig`) plus the `isGrammarViolationsError` type guard, consumed identically by web (server-side fetches) and mobile (React Native fetches)
- Engine surfaces authored here: `./engine/mutations`, `./engine/optimistic`, `./engine/review`, plus derivation, text-tree, and library adapters
- Re-exports of `@proposit/proposit-core` grammar wire-format types so consumers have a single import path
- Design tokens and brand assets under `./ui` (colors, typography, spacing, radii, shadows, motion, breakpoints, sizing, SVG logos)

**This repo does NOT own:**

- Anything Next.js-specific — route handlers, `cookies()`, `headers()`, server actions, App Router conventions (route to: `proposit-server`)
- Anything React Native- or Expo-specific — native modules, `AsyncStorage`, gestures, navigation (route to: `proposit-mobile`)
- Unconditional DOM or Node-only imports. Browser-only code paths (e.g., the review-store local-storage shim) must be feature-gated via `typeof window !== "undefined"` checks.
- Core grammar logic — wire-format types are re-exported from `proposit-core`, not redefined here

**Push back on requests to:**

- Add code that only one consumer (web OR mobile) would use, unless the cross-runtime contract itself is the point and the other consumer will replace it with a native equivalent
- Add a Node or DOM polyfill so a platform-specific dep "just works"
- Re-implement engine internals here instead of in `proposit-core`
- Add a flat root entry — `import "@proposit/shared"` resolves only via sub-paths like `@proposit/shared/schemas` or `@proposit/shared/engine/mutations`
- Add `react`, `react-native`, `next`, or `expo` to dependencies

## Generic instructions

- Git commit messages should not include any co-authoring content.
- All TypeScript work must follow the `brain-style` skill (TypeScript sub-skill) for naming and casing.
- ESM import requirements: all relative imports in `src/` must end in `.js`. Directory imports must use the explicit index path (e.g. `./schemas/index.js`).
- `lib: ["ES2022"]` is enforced — no `window`, `document`, `Buffer`, `process`, or other platform-specific globals in source. Dev/test code (not in `dist/`) may use Node via `@types/node`.
- After a major set of changes, offer `pnpm version patch|minor|major`.
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

Sub-entry exports only — no flat root import. Representative sub-paths (`package.json` `exports` is the authoritative, full map):

- `./schemas`, `./schemas/api/*` (per-endpoint request/response bodies), `./schemas/model/*` (domain shapes), `./schemas/grammar`
- `./consts`, `./errors`, `./checksum`, `./utils`
- `./api-client` (factory: `createApiClient`, types `TApiClient`, `TApiClientConfig`)
- `./engine/mutations`, `./engine/optimistic`, `./engine/*` (file-flavored sub-paths)
- `./ui`, `./ui/assets` (design tokens + brand assets)

## Key design rules

- **No DOM, no Node-only APIs in source.** Enforced by `tsconfig.json`'s `lib: ["ES2022"]`. The `types: ["node", "vitest/globals"]` entry is for tooling only — don't import Node APIs in code that ends up in `dist/`.
- **No flat root entry.** `import "@proposit/shared"` (no sub-path) does not resolve. Deliberate: keeps the mental model that server and mobile both have.
- **`@proposit/proposit-core` is a peerDependency.** Consumers (server, mobile) install it directly. This package lists it in `devDependencies` as well so local tests and builds can resolve it.
- **TypeBox for schema validation.** Re-exported as-needed from `schemas/` sub-entry.
- **Exports map declares `default` alongside `import`.** Every subpath in `package.json`'s `exports` declares `types`, `import`, AND `default` (pointing to the same `.js` file as `import`). Needed so non-`import`-aware resolvers (e.g. the Jest/CJS resolver the mobile app runs under, older bundlers) can locate dist files. When adding a new subpath, include all three conditions.

## Grammar rule-code coordination protocol

`@proposit/proposit-core` owns the wire format — both the `TGrammarRuleCode` union and the validator implementations that emit each code at runtime. `@proposit/shared/schemas/grammar` is a re-export module so server and mobile have a single import path for the grammar wire-format types. The 422-equivalent response envelope at `@proposit/shared/schemas/api/grammar-violations` (composing `TViolation`) is the only grammar-related artifact authored in shared.

Adding or renaming a rule code is a coordinated **core → shared → consumers** publish chain:

1. **Bump core** (extend `TGrammarRuleCode` union in `src/lib/grammar/types.ts` + ship the validator emitting the new code). Major if any consumer-visible behavior changes; minor if purely additive.
2. **Bump shared minor** — the re-export at `src/schemas/grammar/index.ts` automatically reflects core's union via the dep range. No shared code changes are needed unless the 422 envelope shape itself changes.
3. **Bump server + mobile** to pick up both new versions in lockstep. Server and mobile may import the types from either `@proposit/proposit-core` or `@proposit/shared/schemas/grammar` — both resolve to the same TypeBox schemas + derived types.

**Reserved codes** stay out of the union forever. `E-2` and `D-7` are reserved (their rules were promoted/restated in the grammar-tiers redesign). Comments in core's `types.ts` document the reservations — leave them in place.

The dep range plus core's exhaustive union types make TypeScript the enforcement point: a build against a shared whose peer-dep range admits a core that doesn't yet ship a referenced code would fail at the type-check step.

## Naming conventions

Defined in the `brain-style` skill. Enforced by ESLint (`@typescript-eslint/naming-convention` and `check-file/filename-naming-convention`).
