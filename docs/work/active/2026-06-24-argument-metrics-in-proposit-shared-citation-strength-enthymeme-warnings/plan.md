# Plan — Argument metrics in @proposit/shared: citation strength & enthymeme warnings

One new engine module (plain pure functions, no schema/wire changes), test
file, and doc-sync. Additive-only — no existing exports change shape.

## Phase 1 — Failing tests first (TDD)

New file `src/engine/__tests__/argument-metrics.test.ts`. Mirror the
snapshot-fixture construction style already used in
`src/engine/__tests__/text-tree.test.ts` and
`src/engine/__tests__/premise-reading-order.test.ts` (hand-built
`TProjectReactiveSnapshot` objects — premises/expressions/variables/claims/
citations — no DB, no engine mutation calls needed).

Cover the spec's acceptance criteria:

**`getClaimProofState` / `consequentClaimIds`** (ported building blocks — test
directly since they're exported, not just indirectly through the metrics):

- Claim with a citation edge → `"citation-backed"`.
- Claim with a derivation premise whose antecedent resolves to an axiomatic
  claim, no citation → `"axiom-backed"`.
- Claim with no citation, no derivation premise (or a naked-Q derivation
  premise) → `"empty"`.
- A claim appearing as the consequent (highest-position child) of a freeform
  `implies`/`iff` → included in `consequentClaimIds`.
- A claim appearing only in a derivation premise's structure → NOT included
  (freeform-only scan).

**`computeCitationStrength`:**

1. Empty snapshot (no claims) → `{ eligibleClaimCount: 0, citedClaimCount: 0, strength: 1 }`.
2. Consequent claim, no citation → excluded from `eligibleClaimCount`.
3. Axiom-backed claim, no citation → excluded from `eligibleClaimCount`.
4. Cited, non-consequent claim → counted in both `eligibleClaimCount` and
   `citedClaimCount`.
5. Uncited, non-consequent, non-axiom-backed claim → counted in
   `eligibleClaimCount` only.
6. Axiomatic-typed and citation-typed claims never enter the denominator even
   if otherwise structurally eligible.
7. A claim that is both a consequent AND has its own citation edge →
   excluded from `eligibleClaimCount` entirely (not counted in numerator or
   denominator) — pins the two exclusions as independent filters, not a
   fallback chain.
8. A snapshot with normal-claim-free content (only axiomatic/citation-typed
   claims present) → `eligibleClaimCount: 0` via the type filter →
   `strength: 1` (distinct from the zero-claims case in #1 — this exercises
   the filter, not just an empty input).
9. Mixed fixture (2 cited + 1 uncited eligible + 1 consequent + 1
   axiom-backed) → exact `strength` arithmetic (`2/3`).

**`detectEnthymemeWarnings`:** build fixtures with the real, AN-1-normalized
shape — a compound antecedent is `implies(formula(and(...)), Q)` /
`implies(formula(or(...)), Q)`, NOT `implies(and(...), Q)` directly (see
spec.md's Current-state findings on AN-1). A test fixture that hand-builds
`implies(and(...), Q)` without the formula buffer would not exercise the
unwrap step and would pass even with the (wrong) un-unwrapped algorithm — so
double-check the fixture shape before trusting a green result.

10. `(P and R) implies Q`, stored as `implies(formula(and(P,R)), Q)` → no
    warning.
11. `P implies Q` (bare antecedent, no formula) → warning,
    `antecedentConjunctCount: 1`.
12. `not(P) implies Q` (negated bare antecedent — `not` is AN-1-exempt, no
    formula wrap) → warning, `antecedentConjunctCount: 1`.
13. `(P or R) implies Q`, stored as `implies(formula(or(P,R)), Q)` → warning
    (decided: `or` does not exempt, even after unwrapping).
14. `implies` with antecedent slot entirely absent (mid-edit premise) →
    warning, `antecedentConjunctCount: 0`.
15. A derivation-type premise shaped like `implies` with a single antecedent
    → NOT in the output (freeform-only).
16. A bare-assertion premise (no `implies` root), an `and`/`or`-rooted
    premise, and an `iff`-rooted premise → none appear in the output.

**`computeArgumentMetrics`:**

17. Combines both sub-results unchanged from calling them standalone on the
    same snapshot.

Run `pnpm run test` → new suite fails (module doesn't exist yet).

## Phase 2 — Implement

New file `src/engine/argument-metrics.ts`:

- `TClaimProofState`, `getClaimProofState(claimId, snapshot)`,
  `consequentClaimIds(snapshot)` — port the algorithm from
  `proposit-server/src/app/view/[argumentId]/[version]/contexts/text-derivations.ts`
  (read-only reference; do not edit that file — it lives in a different repo
  and is out of scope). Keep the same names deliberately (see spec's Risks
  section on future consolidation). Use `TProjectReactiveSnapshot` from
  `./engine.js`, `TClaim`/`isNormalClaim`/`isAxiomaticClaim` from
  `../schemas/model/claims.js`, `TPropositionalExpressionCombined` from
  `../schemas/logic.js` — all relative imports end in `.js` per this repo's
  ESM rule.
- `TCitationStrengthMetric`, `computeCitationStrength(snapshot)` per the
  spec's algorithm (filter `isNormalClaim`, exclude consequents, exclude
  axiom-backed, ratio against citation-backed count; `1` when denominator is
  `0`).
- `TEnthymemeWarning`, `detectEnthymemeWarnings(snapshot)`: iterate
  `snapshot.premises`, skip non-`"freeform"`, skip non-`implies` roots, take
  the antecedent child (lower position of the arity-2 root), **unwrap one
  `formula` layer if present** (AN-1 wraps a compound `and`/`or` antecedent in
  `formula` — see spec.md's Current-state findings; skipping this step is the
  one identified way to get this function wrong), then count `and` direct
  children on the (possibly-unwrapped) node vs. treat any other present shape
  as `1` vs. absent as `0`, push a warning when `< 2`.
- `TArgumentMetrics`, `computeArgumentMetrics(snapshot)` — thin wrapper.
- No `package.json` edit needed — `"./engine/*"` already covers the new
  subpath.

Run `pnpm run test` → green.

## Phase 3 — Verification

- `pnpm run check` (typecheck + lint + test + build) green.
- Optional cross-boundary sanity: `pnpm exec tsc -p tsconfig.build.json` so a
  consumer on `file:../proposit-shared` picks up fresh `dist/` immediately if
  someone wants to smoke-test the import shape from `proposit-server` during
  implementation. Not required to close this item (no consumer wiring in
  scope).

## Phase 4 — Doc-sync & closeout

- Documentation Sync (shared): add entries to `docs/changelogs/upcoming.md`
  and `docs/release-notes/upcoming.md` (new feature: argument-level citation
  strength + enthymeme-warning detection in `@proposit/shared/engine/argument-metrics`).
  Create these `upcoming.md` files fresh if absent (last cut renamed them to
  `v0.32.0.md`).
- Offer `pnpm version minor` (new additive feature, no breaking change) plus
  the `upcoming.md` → versioned rename per this repo's convention.
- Follow-up notes (not auto-created — closeout decision for whoever completes
  this item):
  - Suggest a `proposit-server` work item to migrate
    `text-derivations.ts`'s local `getClaimProofState`/`consequentClaimIds`
    onto the new shared exports, removing the duplication this item
    intentionally leaves in place.
  - Suggest a `proposit-server` (and/or `proposit-mobile`) work item to
    actually surface citation strength / enthymeme warnings in a UI, if
    wanted — this item only ships the computation.

## Touch points

- New: `src/engine/argument-metrics.ts`
- New: `src/engine/__tests__/argument-metrics.test.ts`
- Doc: `docs/changelogs/upcoming.md`, `docs/release-notes/upcoming.md`
- No edits to any existing `src/` file, no `package.json` change, no
  `proposit-core` change, no consumer-repo change.

## Verification commands

```bash
pnpm run test      # Phase 1 red → Phase 2 green
pnpm run check     # full pipeline before closeout
```

## Parallelization

Sequential (Phase 1 → 2 → 3 → 4). The two metrics are logically independent
and could be split across two subagents in Phase 2 if desired, but both are
small enough (~80-120 lines combined, per the reading-order precedent's scale)
that splitting adds more coordination overhead than it saves.
