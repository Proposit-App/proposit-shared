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

`@proposit/shared/schemas/grammar` owns the `TGrammarRuleCode` union as wire format. `@proposit/proposit-core` owns the validator _implementations_ — the code that determines what triggers each code at runtime. Adding, renaming, or removing a rule code is a **coordinated shared + core publish**:

1. **Bump shared minor**, extending (or modifying) the union in `src/schemas/grammar/rule-code.ts`. Tests in `src/schemas/__tests__/grammar-rule-code.test.ts` should be updated to cover the new state. Publish `@proposit/shared` to npm.
2. **Bump `@proposit/proposit-core`**, shipping the validator implementation that references the new code. Core's validator must `import type` the updated `TGrammarRuleCode` from `@proposit/shared/schemas/grammar` — the TypeScript build will refuse to ship a code that isn't in shared's union (this is the contract enforcement point; do not rely on runtime checks alone).
3. **Bump server + mobile deps** to pick up both new versions in lockstep. Mobile and server both consume `TViolation` and the codes via shared, not via core directly.

**Reserved codes** stay out of the union forever. As of `0.9.0`, `E-2` and `D-7` are reserved (their rules were promoted/restated in the 2026-05-13 grammar-tiers redesign; see spec §4.2 / §4.3). Code comments in `rule-code.ts` document the reservations — leave them in place.

**Do not let core ship a code that isn't in shared's union.** TypeScript catches this at build time once the dep is wired through, but the publish-order rule above is the proximate guard.

## Naming conventions

Defined in the `brain-style` skill. Enforced by ESLint (`@typescript-eslint/naming-convention` and `check-file/filename-naming-convention`).
