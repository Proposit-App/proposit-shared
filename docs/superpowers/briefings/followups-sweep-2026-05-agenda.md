# Follow-ups Sweep 2026-05 — proposit-shared agenda

**Initiative spec:** `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-05-22-followups-sweep-overview.md`
**Branch:** `followups-sweep-2026-05` off `proposit-shared/main` @ `f98d890` (current `v0.12.0`)
**Reviewer:** `proposit-shared-reviewer` after the full cycle lands (one review pass at end)
**Target release:** `@proposit/shared@0.12.1` (patch) — none of the changes break wire-format consumers (widening a union is additive; lifted extras-sync is internal helper behavior; review-context routing is internal engine plumbing). If you encounter a breaking change while implementing, surface back to orchestrator before cutting.

## Capability changes

None. All four items are internal-quality / bugfix / dead-code. `@proposit/shared` doesn't carry per-route `capabilities.md` files anyway (shared-style is engine + schema + helpers).

## Pre-flight chore

**G1 — Push `v0.11.1` tag to origin.** Tag exists locally at commit `78baa7e` but was never pushed; npm publication is already live. One command:

```
git push origin v0.11.1
```

Run this BEFORE creating your `followups-sweep-2026-05` branch so the tag lands in a clean state.

## Scope — 4 items, sequential commits on single branch

### C1 — Review-system "Indeterminate" bug

**File:** `src/engine/review/evaluation.ts:17-30`
**Investigation:** `/Users/brian/Projects/Proposit-App/docs/research/proposit-server/2026-05-16-review-indeterminate-bug.md` (already in tree, written during Grammar Tiers; read before starting).

**Symptom:** `toEvaluationContext` constructs an evaluation context manually, bypassing `ArgumentEngine.asEvaluationContext()`'s safety nets:
- no naked-Q filter (Q variables that have no defining expression get included as freely-assignable)
- no axiomatic-var forcing (axiomatic claim variables not pinned to `true`)

Result: `evaluateArgumentForReview` returns "Indeterminate" on arguments that should evaluate cleanly post-Grammar-Tiers 1.0.

**Fix:** Route `evaluateArgumentForReview` through `argEngine.evaluate()` directly (or through `argEngine.asEvaluationContext()` if a separate context object is genuinely needed by callers). The engine method has the safety nets; the duplicate path here drifted before the engine consolidated.

**TDD:** RED test exercising a representative argument (look at the investigation report for example shapes — at least one naked-Q + one axiomatic-var case) → GREEN by routing through engine.

**Wire/API impact:** zero — internal engine plumbing. No schema changes.

### C2 — `TClaimWithChildrenSchema` widening

**File:** Find via `grep -r "TClaimWithChildrenSchema" src/` (likely `src/schemas/claim/` or similar).

**Symptom:** schema is currently NormalClaim-only. R5 axiom-bugfix surfaced that AxiomaticClaim now flows through this surface (since `getClaims` no longer filters `.andWhere('s.type', 'normal')` — that filter was removed in the R5 server slice). The schema's docstring also references the now-removed filter, which is misleading.

**Fix:** Widen to `NormalClaim | AxiomaticClaim` union (or whatever the existing claim-type union helper is called in this repo's schemas). Update the docstring to drop the stale `getClaims` filter reference and describe the union accurately.

**TDD:** RED test exercising parseResponse / Schema.Check on a payload containing an axiomatic-typed child claim; GREEN after widening.

**Wire/API impact:** schema-level additive widening. Consumers that previously narrowed to NormalClaim get a wider union; this is source-compatible for typical consumers (they were already accepting whatever the server returned). If your typecheck flags any consumer that pattern-matched assuming NormalClaim-only, surface to orchestrator — that's a server-side narrowing follow-up, not a shared concern.

### C3 — `engine.setConclusionPremise` extras-sync gap

**Background:** Grammar Tiers cycle 5 patched server-side via `sharedUpdatePremiseExtras({ role })` because `engine.setConclusionPremise` only updates the role-state slot, leaving `extras.role` stale. Mobile clients consuming the engine directly would have the same bug.

**Fix:** Lift the extras-sync into the engine — likely inside `mutateUpdatePremiseRole` and possibly `mutateCreatePremise`'s override-path. The principle: any role-state change should ALSO update `extras.role` atomically so the in-memory model stays internally consistent.

**Investigation step:** Read `src/engine/mutations/` (or wherever the role-state mutations live) and verify the exact list of mutation entry points that touch role-state. The patch surface is whatever set of helpers can leave `extras.role` stale today.

**Server cleanup follow-up:** After this lifts into shared, the server's `sharedUpdatePremiseExtras({ role })` cycle-5 workaround can be deleted. That's a server-cycle concern, NOT yours — DO NOT touch server files. Note in your release-notes that consumers can drop the workaround.

**TDD:** RED test for each mutation entry point — assert that after the mutation, `extras.role` matches the new role-state. GREEN by adding the sync.

### D2 — Delete `ParticipantRoles.REVIEWER` dead enum value

**File:** `src/consts/roles.ts:39`
**User-confirmed action (2026-05-22):** delete.

**Background:** `'reviewer'` exists nowhere in any Proposit codebase. Server's `whereIn` access filter was cleaned up 2026-05-18 (`@proposit/shared@0.11.1`). The shared-side enum entry is the last surviving dead-code site.

**Fix:** Remove the `REVIEWER` entry from `ParticipantRoles`. Update any type derivations that depend on the enum (`ParticipantRole` union, `ROLE_VALUES` array if any). Run typecheck across this repo to confirm no shared internals reference it; run consumer-side spot checks via `grep -r "REVIEWER\|reviewer" src/` to confirm only legit "review" semantic uses survive (review-section component, review-evaluation engine, etc.).

**No tests needed** beyond what existing tests already cover — this is dead-code removal.

## Verification before claiming done

- `pnpm run check` passes (lint + typecheck + unit tests).
- All four items above land as separate commits or one bundled commit per orchestrator preference (either is fine — pick whatever reads cleanest in `git log`).
- `docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md` populated with entries for C1 (bugfix — user-facing review reliability), C2 (schema widening), C3 (engine extras-sync; note server-side workaround can drop), D2 (chore: dead-code removal).
- `pnpm version patch` cuts `0.12.1` as the closing commit on the branch (or whichever version the orchestrator confirms — surface if you think a different number is right).

## Out of scope

- Server dep-flip to consume the new shared version — handled by `proposit-server-dev` in Wave 2 of the initiative. Don't pre-empt.
- Mobile dep-flip — happens whenever next mobile feature lands; not part of this initiative.
- Role taxonomy DB enum expansion — deferred to its own initiative.

## Branch posture reminder

Single branch `followups-sweep-2026-05` off main @ `f98d890`. Sequential commits per item OR one bundled commit (your call). NO worktree, NO per-slice sub-branches. Reviewer runs once at the end across the full commit range; address findings in a fold commit if needed.

## Coordination notes

- If C3's mutation-entry-point audit surfaces more callsites than this briefing implies, expand scope to cover them and note in release-notes. Don't leave a half-fixed surface.
- If C2's widening flags any internal narrowing in shared itself (typecheck failures), fix those internal narrowings — they're part of the same widen.
- If the cycle uncovers a fifth dead-code site related to D2 (e.g., a `REVIEWER` string literal in a comment or doc), sweep it in the same commit.
