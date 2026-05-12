# Add length-limit constants for ATV-editable text fields

**Affected version:** `@proposit/shared@0.7.1`.
**Reported by:** Server agent (Task 1 of the 2026-05-11 ATV Cluster C plan, branch `feat/atv-overhaul`).
**Suggested rollout:** `@proposit/shared@0.7.2` (patch — additive constants + one permissive bump).

## Symptom

The server's ATV-editable text fields (argument title, premise title, claim title, claim body) have no server-side maximum-length enforcement. Investigation showed that schema-side `maxLength` was never written for any user-mutable field — see `proposit-server/docs/superpowers/specs/2026-05-11-atv-cluster-c-design.md` for the full background.

The server plans to add a `validateMaxLengths()` route-handler utility (no TypeBox schema changes, since existing DB rows may already exceed the limits). That utility needs four shared constants — two of which already exist:

| Constant                 | Status            | Value                    |
| ------------------------ | ----------------- | ------------------------ |
| `CLAIM_TITLE_MAX_LEN`    | exists            | **50** → bump to **100** |
| `CLAIM_BODY_MAX_LEN`     | exists, unchanged | **500**                  |
| `ARGUMENT_TITLE_MAX_LEN` | missing           | new: **100**             |
| `PREMISE_TITLE_MAX_LEN`  | missing           | new: **100**             |

## Why this matters now

- The server's Cluster C work (length enforcement on writes) is gated on these constants being importable from `@proposit/shared/consts`.
- Bumping `CLAIM_TITLE_MAX_LEN` from 50 → 100 is **permissive** — existing rows ≤ 50 chars are still compliant. The legacy MUI flow view (`proposit-server/src/app/(nofooter)/view/[argumentId]/[version]/components/flow/claim-node.tsx`) already imports `CLAIM_TITLE_MAX_LEN` for its label suffix; raising the constant relaxes that view's user-facing limit too (the server PR will also fix the hardcoded `slotProps.htmlInput.maxLength: 50` so the bump takes effect consistently).

## Proposed change

Edit `src/consts/argument.ts`. Replace:

```ts
import type { TArgumentImportOrigin } from "../schemas/integrations/index.js"

export const CLAIM_TITLE_MAX_LEN = 50
export const CLAIM_BODY_MAX_LEN = 500
```

with:

```ts
import type { TArgumentImportOrigin } from "../schemas/integrations/index.js"

export const ARGUMENT_TITLE_MAX_LEN = 100
export const PREMISE_TITLE_MAX_LEN = 100
export const CLAIM_TITLE_MAX_LEN = 100
export const CLAIM_BODY_MAX_LEN = 500
```

Leave the rest of the file (`POPULARITY_ALGO_PARAMS`, `calculatePopularity`, `AllArgumentImportOrigins`) untouched. The existing `export * from "./argument.js"` in `src/consts/index.ts` already re-exports everything; no index change needed.

## Test cases

No new test cases are required in `@proposit/shared` — these are plain constants with no logic. Verify the build succeeds (`pnpm run build`) and, if a test suite exists, that it still passes.

The downstream test coverage lives in `proposit-server`:

1. **Unit tests for `validateMaxLengths` util.** `proposit-server/src/utils/server/__tests__/validate-max-lengths.test.ts` covers the limit-checking helper itself (8 cases — at/over/null/undefined/empty/etc.).
2. **Per-route integration tests.** Each of the six route handlers gets over-limit + at-limit assertions exercising the new constants. See `proposit-server/docs/superpowers/plans/2026-05-11-atv-cluster-c.md` Task 4, Step 7.

## Impact on `@proposit/proposit-server`

After this lands:

1. The server bumps `@proposit/shared` from `^0.7.1` to `^0.7.2`.
2. Adds a `validateMaxLengths()` utility in `src/utils/server/`.
3. Calls it from six route handlers: `POST /api/v1/argument`, `PUT /api/v1/argument/[id]/[v]`, `POST + PUT /api/v1/.../logic/premises[/{id}]`, `POST + PUT /api/v1/.../claims[/{id}]`.
4. Replaces the legacy flow view's hardcoded `slotProps.htmlInput.maxLength: 50 / 500` with the constants, so the bumped title limit takes effect consistently.

No other consumer of `CLAIM_TITLE_MAX_LEN` exists in `proposit-server` (verified during spec review).

## Suggested rollout

1. Land the constants change in `proposit-shared` as a patch release: `pnpm version patch` (0.7.1 → 0.7.2), `pnpm publish --access public`, tag `v0.7.2`, push with `--follow-tags`.
2. In `proposit-server`, bump `@proposit/shared` to `^0.7.2`, then proceed with Tasks 2–6 of the Cluster C plan.

No deprecations, no breaking changes — this is strictly additive plus one permissive raise. Downgrade-safe.
