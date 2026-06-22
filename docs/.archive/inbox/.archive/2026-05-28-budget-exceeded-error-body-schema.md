# Change request: add `BudgetExceededErrorBodySchema` for canonical 402 contract

**From:** `proposit-server`
**Date:** 2026-05-28
**Impact area:** `@proposit/shared/schemas/api/errors` (new module)
**Target version:** `0.15.1` (patch bump from `0.15.0`)
**Tracking spec:** `proposit-server/docs/superpowers/specs/2026-05-28-pipeline-refinement-post-v0.17.2-design.md` (slice D)
**Tracking plan:** `proposit-server/docs/superpowers/plans/2026-05-28-pipeline-refinement-slice-D-402-contract.md`

## Problem

The four LLM-bearing entry routes in `proposit-server` each catch
`LimitExceededError` and emit an HTTP 402 with an ad-hoc body shape via
`createErrorResponse(message, 402)`. The resulting body is
`{ errorMessage, errorID, statusCode }` — useful for logging, useless for
the mobile/web client which has no way to distinguish a token-budget
overrun from any other 402-class failure and no way to surface `used /
limit / resetOn` to the user.

Affected routes (current emission sites):

- `src/app/api/v1/argument/[argumentId]/[version]/build/route.ts:132`
- `src/app/api/v1/argument/import/twitter/route.ts:39`
- `src/app/api/v1/argument/import/reddit/route.ts:39`
- `src/app/api/v1/argument/import/raw_text/route.ts:45`

Mid-pipeline overruns settle the task as `TaskStatus.FAILED` with
`errorData.code === "TOKEN_BUDGET_EXCEEDED"`. The route-level 402
should carry the **same** code so the client has one classifier across
both surfaces.

## Proposed API

Add a new top-level schema module at
`src/schemas/api/errors.ts` (flat file, matching the convention of
`search.ts`, `citations.ts`, `claims.ts`). Body:

```ts
import { Type, type Static } from "typebox"

/**
 * Canonical body shape returned by any LLM-bearing entry route when the
 * caller's per-user token budget is exhausted. Status code is 402.
 * Mid-pipeline overruns abort the task and produce a TaskStatus.FAILED
 * settle with errorData.code === "TOKEN_BUDGET_EXCEEDED" — same code,
 * different surface (task-level, not request-level).
 */
export const BudgetExceededErrorBodySchema = Type.Object({
    code: Type.Literal("TOKEN_BUDGET_EXCEEDED"),
    message: Type.String(),
    usage: Type.Object({
        used: Type.Integer({ minimum: 0 }),
        limit: Type.Integer({ minimum: 0 }),
        resetOn: Type.String({ format: "date-time" }),
    }),
})
export type TBudgetExceededErrorBody = Static<
    typeof BudgetExceededErrorBodySchema
>
```

## Package wiring

The current `package.json` `exports` map declares the top-level
`./schemas` entry that re-exports everything from
`dist/schemas/index.js`. Two possible wire-ups (pick whichever matches
existing convention; the repo already mixes both):

1. **Re-export from the top-level barrel** — add to
   `src/schemas/index.ts`:

    ```ts
    export * from "./api/errors"
    ```

    Consumers import as `@proposit/shared/schemas`. Drawback: bundles
    every other API schema into the same import.

2. **Add a dedicated export entry** (preferred — matches
   `./schemas/api/pipeline-status`, `./schemas/api/task-retry`, etc.):
    ```jsonc
    "./schemas/api/errors": {
        "types": "./dist/schemas/api/errors.d.ts",
        "import": "./dist/schemas/api/errors.js",
        "default": "./dist/schemas/api/errors.js"
    }
    ```
    Consumers import as `@proposit/shared/schemas/api/errors`. Cleaner
    surface.

The server-side plan assumes option 2 (`import { BudgetExceededErrorBodySchema } from "@proposit/shared/schemas/api/errors"`).

## Test case

A unit test in `proposit-shared/` asserting the schema's `Value.Check`
against:

- A valid body (`code: "TOKEN_BUDGET_EXCEEDED"`, non-empty message,
  numeric usage with ISO-8601 `resetOn`) returns `true`.
- A body missing `usage` returns `false`.
- A body with `usage.used` as a string returns `false`.
- A body with `code: "OTHER"` (any non-literal value) returns `false`.

## Impact on `proposit-server`

Once published:

1. Bump `@proposit/shared` from `^0.15.0` → `^0.15.1`.
2. Add `createBudgetExceededErrorResponse({ message, usage })` helper in
   `src/utils/server/utils.ts` that emits the canonical body with status 402.
3. Replace 402 emission in the four routes listed above with the
   helper.
4. Add per-route Vitest specs asserting 402 + body matches
   `BudgetExceededErrorBodySchema` via `Value.Check`.
5. Document the contract in server `CLAUDE.md` under a new
   "LLM-bearing route contract" subsection.

## Impact on `proposit-mobile`

No direct consumer of these schemas today, but the tarball-validation
gate (per workspace `CLAUDE.md`) still applies — mobile's
`pnpm run check:full` must pass against the `0.15.1` tarball before
publish.

## Versioning

Patch bump from `0.15.0` → `0.15.1` — purely additive (new module +
export entry; no breaking change to existing schemas).

## Sequence (orchestrator-coordinated, per workspace `CLAUDE.md`'s consumer-side validation rule)

1. Implement schema + export wiring in `proposit-shared/`.
2. `pnpm run build && pnpm version patch && pnpm pack` → produces
   `proposit-shared-0.15.1.tgz`.
3. In `proposit-server/`: `pnpm add /abs/path/to/proposit-shared-0.15.1.tgz`;
   `pnpm run check:full`.
4. In `proposit-mobile/`: same tarball-validate gate.
5. Aggregate PUBLISH READY verdict → `pnpm publish --access public` in
   `proposit-shared`; tag `v0.15.1`.
6. In `proposit-server/`: `pnpm add @proposit/shared@^0.15.1` to revert
   the `file:...` pin; `pnpm install`.
7. Begin server-side slice D commits (helper + route replacements +
   tests + docs).

## Workaround until upstream ships

None — slice D's server work is fully blocked on this schema landing.
Other slices in the pipeline-refinement initiative (A merged-ready, B,
C, E) are independent.
