# Ingestion Pipeline Framework — proposit-shared agenda

**Initiative spec:** `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-05-22-ingestion-pipeline-overview.md`
**Initiative plan:** `/Users/brian/Projects/Proposit-App/docs/superpowers/plans/2026-05-22-ingestion-pipeline-overview-plan.md`
**Branch:** `ingestion-pipeline/phase-1` off `proposit-shared/main` (currently at `v0.12.2`).
**Reviewer:** `proposit-shared-reviewer` after the commit lands.
**Target release:** `@proposit/shared@0.13.0` (minor, additive) at the end of slice 1F.

## Capability changes

None. `proposit-shared` is a library — no `capabilities.md` files.

## Phase 1 scope — slices 1E + 1F (this agenda)

Phase 1 lands two small additive surfaces in `proposit-shared`:

- **Slice 1E:** new schemas under `src/schemas/ingest-argument/` (internal task-input shape) and `src/schemas/processing-failure.ts` (re-export from `@proposit/proposit-core`, same pattern as the grammar re-export). Bump the `@proposit/proposit-core` dep to `^1.1.1`.
- **Slice 1F:** publish `@proposit/shared@0.13.0`.

**Critical platform-state preflight finding:** the workspace plan originally said `src/tasks/ingest-argument/` for the new schemas, but `proposit-shared`'s existing convention puts schemas under `src/schemas/` with sub-entry exports declared in `package.json`. This briefing uses the actual repo convention (`src/schemas/`), not the plan's invented `src/tasks/` path. The semantics are unchanged — the schemas are wire-format contracts, just placed where they belong.

**Public wire shape is NOT changing.** The existing `/api/v1/argument/import/raw_text` route uses `CreateArgumentSchema` (`{ origin: "raw_text", data: { text } }`) and stays exactly that way. The new `IngestArgumentTaskInputSchema` is the _internal_ task-input shape that the server's route handler will construct from the public body before passing into the pipeline framework — it's not a public route schema.

No public `api-client` wrapper ships in Phase 1. Per spec §14 item 11, the path is reserved but a typed wrapper around the existing `createArgument`-with-origin-raw-text call can be added in a later slice if/when needed. **Do not add an `api-client/ingest-argument.ts` file in this slice.**

---

## Slice 1E — Task contracts + ProcessingFailure re-export

### Goal

Add internal task-input schemas + a re-export of `ProcessingFailureSchema` from `@proposit/proposit-core@^1.1.1`. Bump the core dep to `^1.1.1` in both `dependencies` and `peerDependencies`. Add the new sub-entry exports to `package.json`.

### Files to create

- `src/schemas/ingest-argument/index.ts` — `IngestionPipelineVersionSchema` + `IngestArgumentTaskInputSchema` + the two derived TS types.
- `src/schemas/processing-failure.ts` — single-file barrel re-exporting `ProcessingFailureSchema` (value) + `TProcessingFailure` (type) from `@proposit/proposit-core`. Same template as `src/schemas/grammar/index.ts`.

### Files to modify

- `package.json`:
    - Bump `dependencies."@proposit/proposit-core"` from `^1.0.0` to `^1.1.1`.
    - Bump `peerDependencies."@proposit/proposit-core"` from `^1.0.0` to `^1.1.1`.
    - Add two new `exports` entries (alphabetically slotted next to the existing ones; preserve the file's stable shape):
        - `"./schemas/ingest-argument"` → `./dist/schemas/ingest-argument/index.d.ts` / `.js`
        - `"./schemas/processing-failure"` → `./dist/schemas/processing-failure.d.ts` / `.js`
- `src/schemas/index.ts` — if this barrel re-exports submodules, add the two new ones surgically (only what consumers need); follow the existing pattern. If it doesn't aggregate submodules (sub-entries already provide the path), no change needed.

### Type definitions — exact shapes

```ts
// src/schemas/ingest-argument/index.ts

import Type, { type Static } from "typebox"

export const IngestionPipelineVersionSchema = Type.Union([
    Type.Literal("v1-single-shot"),
    Type.Literal("v2-multi-stage"),
])
export type TIngestionPipelineVersion = Static<
    typeof IngestionPipelineVersionSchema
>

/**
 * Internal task input passed from a server route handler into the
 * ingestion pipeline executor. NOT a public route body — the public
 * `/api/v1/argument/import/raw_text` route still accepts the existing
 * `CreateArgumentSchema` shape (`{ origin: "raw_text", data: { text } }`).
 * The server constructs this internal shape from the public body plus the
 * server-side `INGESTION_PIPELINE_VERSION` env (never from the request body)
 * and passes it to `executePipeline(...)` in `@proposit/proposit-core`.
 */
export const IngestArgumentTaskInputSchema = Type.Object({
    text: Type.String({ minLength: 1, maxLength: 50_000 }),
    pipelineVersion: IngestionPipelineVersionSchema,
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
})
export type TIngestArgumentTaskInput = Static<
    typeof IngestArgumentTaskInputSchema
>
```

```ts
// src/schemas/processing-failure.ts

// Re-export of the pipeline ProcessingFailure wire format from
// `@proposit/proposit-core`. Server and mobile import the schema + type
// through `@proposit/shared/schemas/processing-failure` for the ergonomic
// single-import path; the source of truth is core (its
// `src/lib/pipelines/types.ts`).
//
// Mirrors the grammar wire-format re-export at `./schemas/grammar` (introduced
// in shared 0.9.0 during the Grammar Tiers initiative). Same coordination
// chain: adding a new ProcessingFailure code is a core → shared → consumers
// publish chain; shared bumps minor (no code changes here — the re-export
// automatically reflects core's shape via the dep range).

export { ProcessingFailureSchema } from "@proposit/proposit-core"
export type { TProcessingFailure } from "@proposit/proposit-core"
```

### Validation

The dev MUST verify that the names `ProcessingFailureSchema` and `TProcessingFailure` are actually exported from `@proposit/proposit-core@1.1.1`'s public surface. If the spelling differs (e.g., the value is named `ProcessingFailureSchema` but the type is `TProcessingFailure` with the T-prefix — that's the expected shape per slice 1A's brain-style naming convention), use whatever core actually exports. **Do not invent names.** The shared re-export must match core's exports exactly. Suggested verification:

```bash
grep -E "^export (type )?{?\s*(ProcessingFailureSchema|TProcessingFailure|ProcessingFailure)\b" /Users/brian/Projects/Proposit-App/proposit-shared/node_modules/@proposit/proposit-core/dist/lib/index.d.ts
```

If `ProcessingFailureSchema` doesn't exist as a TypeBox value export in core (slice 1A may have shipped only the TS type, not a TypeBox schema — verify), the re-export should be type-only:

```ts
export type { TProcessingFailure } from "@proposit/proposit-core"
```

And the runtime schema would land in a future shared slice when core adds it. Flag this in the status return.

### Test plan

- `src/schemas/ingest-argument/__tests__/index.test.ts` — small TypeBox round-trip tests:
    - Valid input: `{ text: "hi", pipelineVersion: "v1-single-shot" }` parses cleanly.
    - Invalid `pipelineVersion: "v3-future"` rejects with a clear error.
    - Empty text rejects.
    - Text exceeding 50_000 chars rejects.
    - Optional `title` / `description` accepted when present and when absent.
- `src/schemas/__tests__/processing-failure.test.ts` (optional): one assertion that `import { ProcessingFailureSchema } from "../processing-failure.js"` returns the same schema instance as `import { ProcessingFailureSchema } from "@proposit/proposit-core"`. If only the type is exported (per the validation step above), assert the type-only re-export compiles.

Existing shared test suite must continue to pass.

### Commit shape

One or two commits, depending on what feels clean:

- Suggested split: (1) Add the schemas + re-export + package.json deps/exports. (2) Tests.
- Or one combined commit if you prefer.
- Final commit message: `feat(schemas): add ingest-argument task input + ProcessingFailure re-export (slice 1E)`.

### Exit criteria

- `pnpm run check` green (typecheck + lint + tests + build).
- `pnpm install --frozen-lockfile` succeeds (mirrors CI; verify the lockfile is regenerated after the dep bump). If the lockfile drifts, regenerate with `pnpm install` and commit in the same batch — same gotcha as slice 1D.
- `package.json` `exports` has the two new sub-entries.
- `dependencies` + `peerDependencies` both list `@proposit/proposit-core@^1.1.1`.
- `node_modules/@proposit/proposit-core/package.json` shows version `1.1.1` post-`pnpm install`.
- Optional but recommended smoke: `node -e "console.log(require('./dist/schemas/ingest-argument').IngestArgumentTaskInputSchema)"` after build resolves to a TypeBox schema object.
- Reviewer P1 findings folded.

### What is NOT in this slice

- The `api-client` wrapper (`src/api-client/ingest-argument.ts`) — deferred per spec §14 item 11. Do not create.
- The public route schema change — there isn't one. The existing `CreateArgumentSchema` stays as the public wire.
- Publishing `0.13.0` — that's slice 1F.

### Notes for the dev agent

- **Use `superpowers:test-driven-development`** — author tests before implementation.
- **Use `superpowers:verification-before-completion`** — run `pnpm run check` and cite output before claiming done.
- **Brain-style TypeScript naming.** The shared repo enforces it.
- **No co-authoring trailers.**
- **Lockfile gotcha** (from slice 1D): after bumping `@proposit/proposit-core` in `package.json`, run `pnpm install` (regen lockfile), then `pnpm install --frozen-lockfile` (verify CI gate). Commit the lockfile change in the same batch.
- **Branch:** create `ingestion-pipeline/phase-1` off shared's `main` as your first action (matches the proposit-core branch naming).
- **Final dispatch:** slice 1F (the release) is a separate dispatch after this slice's reviewer fold lands. Don't run `pnpm version` or `pnpm publish` from this slice.

---

## Slice 1E.B — Reviewer fold (P2 + selected P3)

**Triggered by:** dual-review synthesis at `/Users/brian/Projects/Proposit-App/docs/reviews/proposit-shared/2026-05-23-a410110-7ef95a1-ingestion-pipeline-1E.md`.
**Branch:** continue on `ingestion-pipeline/phase-1`.

### Scope — one commit batch

**P2 — Symmetric latent drift in `mutateCreatePremise`** (`src/engine/mutations/premises.ts:52-67`).

The same core@1.0.2 E-7 invariant that surfaced slice 1E.A's demote bug also breaks the create-supporting-as-first-premise path in mirror image:

1. Caller invokes `mutateCreatePremise(engine, pId, { ..., role: "supporting" })` to create the first premise of a new argument with role `supporting`.
2. Internally, the helper calls `engine.createPremiseWithId(...)`.
3. Core's `createPremiseWithId` auto-assigns the first premise as the conclusion (per core's "auto-conclusion assignment" rule — see core's CLAUDE.md "Auto-conclusion assignment: First premise added to an engine is auto-designated as conclusion if none is set").
4. The shared helper tries to undo this by calling `engine.clearConclusionPremise()`.
5. **Under core@1.0.2's E-7 invariant, `clearConclusionPremise()` is now a no-op when premises exist** (which they do — we just created one).
6. The helper then proceeds with `syncPremiseExtrasRole({ role: "supporting" })`.

Result: engine's `conclusionPremiseId` slot points at the premise (engine considers it the conclusion), but `extras.role === "supporting"`. Drift between engine state and extras — exactly the kind of internal inconsistency the helper was created to prevent.

The dev annotated this case in the comment but mis-framed it as "the auto-assigned conclusion role correctly stays in place" — which is wrong: it's NOT correct, the role is requested as "supporting" by the caller but the engine has it as conclusion. The existing test doesn't assert engine state, so the drift is invisible.

**Fix (lowest-impact, matches the comment's intent):**

The comment frames the auto-assignment as a feature: "first premise of a new argument always becomes the conclusion regardless of what the caller asks for." If that's the intent, then `extras.role` should be `"conclusion"`, not `"supporting"`. **Sync extras to `"conclusion"` when core auto-assigns**, regardless of what the caller passed in `role`.

Alternative fix (rejected for V1): throw `InvariantViolationError` mirroring slice 1E.A's pattern. Symmetric but more disruptive; callers may legitimately want to create a first premise without thinking about conclusion semantics. The auto-assign + sync-extras approach matches the existing comment's framing.

**Implementation in `src/engine/mutations/premises.ts`:**

1. After `engine.createPremiseWithId(...)`, check whether the engine auto-assigned this premise as conclusion (`engine.getConclusionPremise()?.getId() === pId`).
2. If so AND the caller-requested role was NOT `"conclusion"`: instead of the current "clear + sync to caller-requested role" path, sync extras to `"conclusion"`.
3. If the caller-requested role WAS `"conclusion"`: same as before, just sync extras to `"conclusion"`.
4. Update the inline comment to reflect the actual behavior: "The first premise of a new argument is unconditionally auto-assigned as conclusion (core's E-7 invariant + auto-conclusion rule). We sync extras to match the engine, not the caller's requested role."

**Test in `src/engine/mutations/__tests__/premises.test.ts`:**

- Add or extend an existing test: create the first premise of a new engine with `role: "supporting"` (or `role: "criterion"` for an even-clearer test of the override semantics). Assert:
  - `engine.getConclusionPremise()?.getId() === pId` (engine state).
  - `engine.getPremise(pId).extras.role === "conclusion"` (extras stays in sync — NOT `"supporting"`).
- The existing creation tests for `role: "conclusion"` on first premise should still pass unchanged.

**P3 — Add `InvariantViolationError.violations[0].code === "ARGUMENT_NO_CONCLUSION"` assertion to slice 1E.A's throw-tests.**

In the two throw-tests added in `7ef95a1` (`mutateUpdatePremiseRole` demote refusal — single-premise + multi-premise variants), add an `expect(err.violations[0].code).toBe("ARGUMENT_NO_CONCLUSION")` assertion. Server-side route handlers (slice 1G) will pattern-match on this code to map to 409 Conflict; locking the contract via a test prevents accidental code rename in a future cycle.

### Items NOT in this fold

- **Value.Parse vs Value.Check in the schema tests (P3):** keep `Value.Check` for now. The schemas don't have defaults/coercion paths; `Check` is enough. Revisit if/when schemas get coercion behavior.
- **Slice 1G server carry-forward (P1-for-1G):** captured separately in the slice 1G briefing by the orchestrator. The shared change here is enough — the server slice fixes its own call-sites.
- **Briefing wording about `dependencies` vs `peerDependencies`:** orchestrator-side process note; no code change.

### Test plan additions

- 1 new test (or extended existing test) for `mutateCreatePremise` first-premise-supporting → extras.role === "conclusion".
- 2 new assertions in the existing slice 1E.A throw-tests for the error code.

### Exit criteria

- `pnpm run check` green.
- One commit on `ingestion-pipeline/phase-1`: `fix(engine): fold reviewer findings — mutateCreatePremise E-7 sync + ARGUMENT_NO_CONCLUSION code assertion`.

### Carry-forward (orchestrator-tracked, not for this dev)

- Slice 1G briefing must instruct `proposit-server-backend-dev` to:
  - Search for callers of `mutateUpdatePremiseRole` across `proposit-server/src/`. Reviewer already identified `src/model/logic.ts:1264-1283` and `arg-data-context/premise-actions.ts:117-138` as the two known sites.
  - **Delete the defensive "demote prior conclusion → promote new premise" two-call pattern.** Shared's promote-to-conclusion branch now atomically swaps the prior conclusion's role to supporting; the server's role-change becomes a single call to `mutateUpdatePremiseRole(newPremiseId, "conclusion")`.
  - **Add 409 mapping** for `InvariantViolationError` with `code: "ARGUMENT_NO_CONCLUSION"` in route handlers that may receive it (`onAssignConclusion` flow at `premise-gear-menu-host.tsx:82` is the only UI affordance shipping today; route handlers behind that UI need the mapping).
- Slice 1I (mobile) briefing: the reviewer confirmed mobile has ZERO callers of `mutateUpdatePremiseRole`. The dep-bump-only scope holds.
