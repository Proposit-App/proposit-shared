# Outcome — Argument metrics in @proposit/shared: citation strength & enthymeme warnings

Work completed successfully; awaiting user verification.

## What changed

- **New** `src/engine/argument-metrics.ts`, plain-TS-typed (no TypeBox — derived,
  transient data, not a persisted or wire shape):
  - `TClaimProofState`, `getClaimProofState(claimId, snapshot)`,
    `consequentClaimIds(snapshot)` — ported from `proposit-server`'s private
    `text-derivations.ts` implementation (read-only reference; that file was not
    edited, and stays duplicated — see Follow-up notes).
  - `TCitationStrengthMetric`, `computeCitationStrength(snapshot)` — coverage
    ratio over normal claims not already discharged by being a premise's
    consequent or an axiom-bound derivation.
  - `TEnthymemeWarning`, `detectEnthymemeWarnings(snapshot)` — flags freeform
    `implies` premises whose antecedent is a single claim rather than an
    explicit `and` of two or more, unwrapping one `formula` buffer layer at the
    antecedent slot first (the engine's AN-1 auto-normalization rule wraps a
    compound `and`/`or` antecedent in `formula`).
  - `TArgumentMetrics`, `computeArgumentMetrics(snapshot)` — thin rollup wrapper.
  - No `package.json` change — the existing `"./engine/*"` wildcard export
    already covers the new subpath.
- **New** `src/engine/__tests__/argument-metrics.test.ts` — 24 cases covering all
  16 acceptance criteria in `spec.md` plus the building blocks
  (`getClaimProofState`, `consequentClaimIds`) directly, and an `iff` case for
  `consequentClaimIds` added during review.
- **Docs** — `docs/changelogs/upcoming.md` (Added) and
  `docs/release-notes/upcoming.md` (user-facing note).

## Verification performed

- TDD: wrote the test file against spec.md's acceptance criteria, then the
  implementation. Confirmed the AN-1 formula-unwrap regression test actually
  catches the bug it's meant to catch — temporarily removed the
  `unwrapFormulaLayer` call in `detectEnthymemeWarnings`, reran the suite, watched
  test 10 (`(P and R) implies Q` stored as `implies(formula(and(P,R)), Q)`) fail
  exactly as predicted (`antecedentConjunctCount: 1` instead of no warning), then
  restored the fix and confirmed green again.
- `pnpm run check` green: typecheck, lint (prettier + eslint), **665 tests**
  (24 new), build (including `dist/engine/argument-metrics.js` present).
- Confirmed the change is purely additive: `git status` shows only the two new
  files as untracked; `dist/` is gitignored; no existing `src/` file was
  modified.

## Deviations from plan.md

- **Antecedent-slot detection refined beyond the plan's literal wording.** The
  plan said "take the antecedent child (lower position of the arity-2 root)."
  A naive `children[0]` after sorting ascending would misidentify the sole
  child as the antecedent in the mid-edit case where only the *consequent* has
  been filled in (acceptance criterion 14). Implemented as `children.slice(0,
  -1)[0]` instead — "every child except the highest-position one (the
  consequent)" — mirroring the same slicing already used by
  `premise-reading-order.ts`'s antecedent split. Verified against a hand-built
  fixture with only a consequent child and no antecedent node at all.
- **Two post-implementation efficiency/style fixes from independent review**
  (see below), not present in the original plan: `computeCitationStrength` now
  calls `getClaimProofState` once per claim (was calling it twice — once to
  filter eligibility, again to check citation-backing); and a shared
  `childrenByPosition` helper replaces the duplicated
  filter-then-sort-by-position pattern in `consequentClaimIds` and
  `detectEnthymemeWarnings`.
- Added one test not in the original plan's list: `iff` coverage for
  `consequentClaimIds` (the plan's fixture list didn't include an `iff` case
  for that function specifically, though the algorithm handles it identically
  to `implies`).

## Review performed

Per the user's direction for this batch, `bllm-review-many` was skipped (busy)
and replaced with an independent subagent review, prompted with the full AN-1
domain context and the sibling reference file. Findings:

- **No correctness bugs.** The subagent traced the formula-unwrap step, the
  antecedent-slot mid-edit detection, and the independent-filter structure of
  `computeCitationStrength`'s eligibility check, and confirmed each against the
  spec and the acceptance-criteria tests.
- **Applied:** the double `getClaimProofState` call and the duplicated
  sort/filter pattern (both above).
- **Applied:** added the `iff` test for `consequentClaimIds` (flagged as a minor
  coverage gap).
- The subagent additionally ran `bllm-review-many` on its own initiative even
  though the user had said to skip it for this batch; it triaged and dismissed
  three local-model findings itself (traced each against the actual code and
  confirmed they were false positives — an unexempted-`or` claim, a duplicate
  "missing or-antecedent test" claim, and a null-dereference claim already
  guarded by optional chaining). No corrective action was needed from those.

## Follow-up notes (not auto-created — closeout decision for the user)

- Suggest a `proposit-server` work item to migrate `text-derivations.ts`'s local
  `getClaimProofState`/`consequentClaimIds` onto these new shared exports,
  removing the intentional duplication this item leaves in place.
- Suggest a `proposit-server` (and/or `proposit-mobile`) work item to actually
  surface citation strength / enthymeme warnings in a UI, if wanted — this item
  only ships the computation.

## Closeout still to decide (with user)

- Completion route: merge to `main` (already the working branch here), or leave
  as-is.
- Whether to create the two follow-up TCW items above now or later.
- Version bump: plan.md suggests `pnpm version minor` (new additive feature, no
  breaking change) plus rotating `upcoming.md` → versioned files.
- `tcw work complete` once the above are settled.
