# Refined Outcome

## User verification decision

Approved for closeout (2026-07-03), via dual review: an independent subagent review plus a
local-LLM review (`bllm-review-many`). No incorrect logic found in either pass. One small,
comment-only fix requested and applied before sign-off (see Refinements below).

## Refinements made after initial implementation

- `getClaimProofState` (`src/engine/argument-metrics.ts`) locates the derivation-premise
  antecedent via a hardcoded `expr.position === 0` check. This is correct today because
  `proposit-core`'s `src/lib/grammar/populate-from.ts` writes a literal `position: 0` for the
  antecedent slot of engine-synthesized derivation premises — verified this path never goes
  through the sparse/midpoint position-assignment scheme freeform premises use. `proposit-core`'s
  `src/lib/grammar/repair.ts` (~line 276) already documents this exact pattern as "brittle in
  principle" should the populated-form writer ever switch to midpoint spacing, but nothing in
  this new shared module cross-referenced that warning. Added a short comment at the
  `position === 0` line pointing at `repair.ts`'s fragility note, so a future reader/reviewer on
  either side of the core/shared boundary knows to check the other before changing either. Logic
  unchanged — `position === 0` is still correct.

## Deferred work

- Migrating `proposit-server`'s private `text-derivations.ts` (`getClaimProofState` /
  `consequentClaimIds`) onto these new shared exports, removing the intentional duplication this
  item leaves in place — tracked separately; the orchestrator is routing this to the server node
  via `tcw work delegate`, not created as a shared-node item here.
- Surfacing citation-strength / enthymeme-warning metrics in a UI (server and/or mobile) — this
  item only ships the computation; also being routed by the orchestrator via `tcw work delegate`,
  not created here.

## Final verification evidence

- `pnpm run check` green after the comment-only fix: typecheck clean, prettier + eslint clean,
  **665 tests** passed (unchanged — no logic touched), build produced
  `dist/engine/argument-metrics.js`.
- Both review passes (independent subagent, local-LLM) traced the formula-unwrap step, the
  antecedent-slot mid-edit detection, and `computeCitationStrength`'s eligibility check against
  the spec and acceptance-criteria tests; no correctness findings survived either pass (see
  `outcome.md` for the subagent's dismissed local-model false positives from its own
  `bllm-review-many` run during initial implementation).

## Closeout choices

- Resolution: `done`.
- Completion route: stays on `main` (no separate branch/worktree was used for this item).
- Version bump: `minor` (pre-1.0 policy — minor is the normal increment for new additive public
  surface; not a patch-level fix). `docs/changelogs/upcoming.md` and
  `docs/release-notes/upcoming.md` rotate to the new version file as part of the bump.
- No new follow-up TCW items created from this node — both follow-ups above are being opened by
  the orchestrator against the appropriate consumer repos via `tcw work delegate`.
