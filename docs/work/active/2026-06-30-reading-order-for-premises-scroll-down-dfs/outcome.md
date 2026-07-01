# Outcome — Reading-order for premises (scroll-down DFS)

Work completed successfully; awaiting user verification.

## What changed

- **New** `src/engine/premise-reading-order.ts` — pure, display-only
  `orderPremisesForReading(snapshot): string[]`. Builds the antecedent→consequent
  graph over freeform premises (consequent = highest-position child of an
  `implies`/`iff` root; antecedents = the rest; polarity tracked through `not`),
  then pre-order DFS from `conclusionPremiseId`. Cycle-safe (visited set),
  deterministic (`baseOrder` = ids sorted by `localeCompare`, used for sibling
  tie-break and off-chain append), dangling-conclusion-id guarded, and follows
  premise-bound antecedents (`boundPremiseId`) as direct premise→premise edges.
  Exposed publicly via the `./engine/*` wildcard export.
- **Edit** `src/engine/text-tree.ts` — `buildTextTree` now ranks premise rows by
  `orderPremisesForReading` instead of the conclusion-first-then-insertion-order
  comparator. Emit loop and derivation-skip unchanged. Both web and mobile render
  through `buildTextTree`, so both inherit the order.
- **Tests** — new `src/engine/__tests__/premise-reading-order.test.ts` (8 cases:
  the P1–P4 example, reused-antecedent, cycle, rebuttal polarity, premise-bound
  edge, off-chain append, no-conclusion, dangling-conclusion). Added one
  `buildTextTree` ordering case to `text-tree.test.ts` (insertion order
  deliberately ≠ reading order to prove the re-sort).
- **Docs** — `docs/changelogs/upcoming.md` (Added + Changed) and
  `docs/release-notes/upcoming.md` (user-facing note).

## Verification performed

- `pnpm run check` green: typecheck, lint (prettier + eslint), **609 tests**,
  build all pass. New tests followed red→green (watched each fail first: the
  `premise-reading-order` suite failed on the missing module; the `buildTextTree`
  case failed showing `[a-concl, m-leaf, z-proof-a]` before the comparator swap).

## Deviations from plan.md

None material. Implementation used structural variable checks (`"claimId" in v` /
`"boundPremiseId" in v`) rather than importing core's `isClaimBound` guard —
simpler and avoids cross-package type wrangling; behavior identical.

## Follow-up notes (not auto-created)

- **Consumer capability reconcile:** when `proposit-server` / `proposit-mobile`
  bump to this `@proposit/shared`, update their argument-view `capabilities.md`
  wording (premises shown in reading order). Consumer-side; capture as a closeout
  decision.
- **Root-wrapped implications:** `orderPremisesForReading` treats a premise as an
  implication only when its *root* expression is `implies`/`iff`. If real data
  ever wraps the implication in a `formula` root, that premise degrades to a bare
  assertion (still correct, just less ideal locality). Existing fixtures put the
  operator at the root, matching the renderer. Revisit only if such data appears.
- **Off-chain premises** are appended flat in `baseOrder`, not DFS-expanded among
  themselves. Fine for the conclusion-centric goal; a disconnected sub-argument's
  internal structure isn't re-ordered.

## Closeout still to decide (with user)

- Version bump (`pnpm version minor` — additive export + behavior change) and the
  `upcoming.md` → versioned rename.
- Completion route: merge `premise-reading-order` → `main`, PR, or leave as-is.
