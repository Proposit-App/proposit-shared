# Plan — Lift AI_QUOTA_EXHAUSTED breaker code into @proposit/shared

Small change; compressed plan. The whole effort is ~3 one-line edits plus a
minor bump. Detail kept only where cross-node sequencing needs it.

**Coordination:** this item is the **anchor slice** of the cross-node epic
`2026-07-10-lift-ai-quota-exhausted-breaker-code-into-proposit-shared-and-adopt-in-consumers`
(root node). This slice owns Phase 1 (the shared change). Consumer adoption
(former Phases 2–3) is delegated to the `proposit-server` and `proposit-mobile`
nodes as separate slices — see each node's `docs/work/inbox/` request. They are
retained below as reference for the coordinated sequence, but are executed by
those nodes, not here.

## Phase 1 — shared: add the const (this node)

1. Create `src/consts/quota.ts` exporting
   `AI_QUOTA_ABORT_CODE = "AI_QUOTA_EXHAUSTED" as const` with the doc comment
   from spec.md.
2. Add `export * from "./quota.js"` to `src/consts/index.ts` (keep the existing
   ordering convention).
3. Verify: `pnpm run check` (typecheck + lint + test + build). No new test
   needed — it's a constant; the build + the consumer tests downstream cover it.
4. Docs: this repo has no release-notes/changelog sync obligations for an
   additive const beyond the version cut. Offer `pnpm version minor` and rotate
   `docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md` per the
   documentation-sync `cut-version` flow at closeout.

**Touch points:** `src/consts/quota.ts` (new), `src/consts/index.ts`.

## Publish gate (root-coordinated)

Do **not** publish `@proposit/shared` from this node. Per ORCHESTRATOR-AGENTS,
the minor release + consumer-side validation is coordinated at the workspace
root. Phases 2–3 unblock only once the new shared version is published and the
consumers repin.

## Phase 2 — server adoption (proposit-server node; after publish)

1. `src/types/quota.ts`: replace the local
   `export const AI_QUOTA_ABORT_CODE = "AI_QUOTA_EXHAUSTED"` with
   `export { AI_QUOTA_ABORT_CODE } from "@proposit/shared/consts"`. Keep
   `AI_QUOTA_ABORT_MESSAGE` / `AI_UNAVAILABLE_TOOLTIP`.
2. Repin `@proposit/shared` to the published version.
3. No call-site edits — the 4 importers keep importing from `@/types/quota`.
4. Verify: `pnpm run check` (the existing
   `use-arg-view-task-streaming.test.tsx` breaker cases are the regression net).

**Touch points:** `src/types/quota.ts`, `package.json` (pin).

## Phase 3 — mobile adoption (proposit-mobile node; after publish)

1. `src/arguments/quota.ts`: replace the local const with
   `import { AI_QUOTA_ABORT_CODE as AI_QUOTA_EXHAUSTED } from "@proposit/shared/consts"`.
   `isQuotaAbort` and its references unchanged. Drop the stale "Follow-up: lift
   it into @proposit/shared" comment.
2. Repin `@proposit/shared`.
3. Verify: `pnpm run check` (`use-argument.test.ts` /
   `argument-building-view.test.tsx` breaker cases cover it).

**Touch points:** `src/arguments/quota.ts`, `package.json` (pin).

## Parallelization & dependencies

- Phase 1 is standalone.
- Phases 2 and 3 are independent of each other but both depend on the publish
  gate. They can run in parallel once shared is published.

## Decision (resolved 2026-07-10)

Consumer adoption is handled via **route (b): a cross-node epic** with two
delegated child slices (server + mobile), driven to completion after the shared
publish. Epic:
`2026-07-10-lift-ai-quota-exhausted-breaker-code-into-proposit-shared-and-adopt-in-consumers`.
Slice requests are dropped in each consumer node's `docs/work/inbox/`; those
nodes adopt them (process-inbox → `tcw work new --initiative <epic>`) once the
shared version is published, setting `blocked-by` on the publish until then.

## Documentation sync

- shared: version-cut only (release-notes/changelog rotation at the minor bump).
- server / mobile: `docs/changelogs/upcoming.md` [Any-Code-Change] fires — a
  one-line "AI breaker code now sourced from @proposit/shared" entry. No
  user-facing release-note (no behavior change). No capability delta.
