# Spec — Lift AI_QUOTA_EXHAUSTED breaker code into @proposit/shared

## Capability changes

None. This is an internal cross-runtime contract change with no user-facing
behavior delta, so the tcw-capabilities planning gate does not apply. (It does
_prevent_ a latent regression class: a server-side rename of the code silently
breaking the "AI temporarily unavailable" breaker notice on clients with no
build-time error — but nothing a user can do changes.)

## Problem

The AI-budget breaker's abort code — the literal `"AI_QUOTA_EXHAUSTED"` carried
in a run/stage/task `errorData.code` — is duplicated per consumer with no
build-time link:

- `proposit-server` — `src/types/quota.ts` → `AI_QUOTA_ABORT_CODE = "AI_QUOTA_EXHAUSTED"`.
- `proposit-mobile` — `src/arguments/quota.ts` → `AI_QUOTA_EXHAUSTED = "AI_QUOTA_EXHAUSTED"`,
  consumed by `isQuotaAbort`.

The server emits this code (`src/services/tasks/executors/argument-create.ts`);
both clients key their breaker UI off matching it. A rename on the emit side
would not fail any consumer build — the contract is a bare string compared at
runtime against `errorData.code`.

## Goals

- One source of truth for the abort code in `@proposit/shared`.
- Server + mobile import it and drop their local literal copies.
- No behavior change; existing consumer references keep working with the
  smallest possible diff.

## Non-goals

- **Do not lift the UI strings.** `AI_QUOTA_ABORT_MESSAGE` /
  `AI_UNAVAILABLE_TOOLTIP` (server) are consumer-specific presentation copy, not
  a wire contract — each client owns its own wording. Only the *code* is shared.
- No schema/envelope change. The code is not currently used in a TypeBox literal
  by either consumer; it is a runtime string compare. Keep it a plain const.
- No change to `isQuotaAbort`'s logic (mobile) or the server emit path.

## Current-state findings

- **shared** `src/schemas/api/errors.ts` — holds `BudgetExceededErrorBodySchema`
  with `code: Type.Literal("TOKEN_BUDGET_EXCEEDED")`. This is a *schema body*,
  not a reusable bare const — a different shape from what we need. `src/consts/`
  holds bare runtime constants (`TaskStatus`, roles, tiers, …) via
  `as const` and re-exports through `src/consts/index.ts` (consumed as
  `@proposit/shared/consts`). This is the natural home.
- **server** `src/types/quota.ts` — `AI_QUOTA_ABORT_CODE` imported by 4 files
  (`use-arg-view-task-streaming.ts` + its test, `pipeline-status-view.tsx`,
  `argument-create.ts`). All import via `@/types/quota`.
- **mobile** `src/arguments/quota.ts` — `AI_QUOTA_EXHAUSTED` is referenced only
  inside that file (by `isQuotaAbort`). External occurrences are test string
  literals (`"AI_QUOTA_EXHAUSTED"`), not imports.

## Proposed behavior

1. **shared** — add `src/consts/quota.ts`:
   ```ts
   /** `errorData.code` set on a run/stage/task aborted because the global
    * AI-budget breaker tripped. Consumers key their "AI temporarily
    * unavailable" breaker UI off a match against this code. */
   export const AI_QUOTA_ABORT_CODE = "AI_QUOTA_EXHAUSTED" as const
   ```
   Re-export from `src/consts/index.ts`. (If a schema literal is ever needed:
   `Type.Literal(AI_QUOTA_ABORT_CODE)`.)
2. **server** — `src/types/quota.ts` swaps its local definition for a re-export:
   `export { AI_QUOTA_ABORT_CODE } from "@proposit/shared/consts"`. The 4
   consumer files are untouched (still import from `@/types/quota`). Keep
   `AI_QUOTA_ABORT_MESSAGE` / `AI_UNAVAILABLE_TOOLTIP` local.
3. **mobile** — `src/arguments/quota.ts` swaps its local const for
   `import { AI_QUOTA_ABORT_CODE as AI_QUOTA_EXHAUSTED } from "@proposit/shared/consts"`.
   `isQuotaAbort` and all local references stay as-is.

## Acceptance criteria

- `AI_QUOTA_ABORT_CODE` exists once in `@proposit/shared/consts` and resolves to
  `"AI_QUOTA_EXHAUSTED"`.
- No `= "AI_QUOTA_EXHAUSTED"` literal definition remains in server or mobile
  source (grep: only shared defines it; consumers import).
- server `pnpm run check` and mobile `pnpm run check` pass with no call-site edits
  beyond the two `quota.ts` files.
- Breaker UI still fires (server arg-view notice + pipeline status; mobile
  argument-building view) — existing tests continue to pass.

## Risks, dependencies, related work

- **Cross-node sequencing.** Consumer adoption depends on a *published* shared
  version. Sequence: ship shared (additive minor) → publish (root-coordinated,
  per ORCHESTRATOR-AGENTS) → server + mobile repin + drop locals. The two
  consumer edits are ~1 line each and can ride the consumers' next routine repin
  rather than forcing a dedicated publish/repin cycle. **Open decision for the
  user** (see plan.md): fold consumer adoption into next repin vs. delegate two
  tiny slices now.
- Additive shared minor; no breaking change. Pre-1.0 caret pins tolerate it.
- Related: this surfaced during mobile's `ai-assisted-argument-creation` work.
