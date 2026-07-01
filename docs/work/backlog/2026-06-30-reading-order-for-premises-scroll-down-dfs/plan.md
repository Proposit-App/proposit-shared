# Plan — Reading-order for premises (scroll-down DFS)

Small change: one new pure module + a comparator swap in `buildTextTree` + one
test file. Phases 1–2 are the core; 3 is verification; 4 is doc-sync/closeout.

## Phase 1 — Failing tests first (TDD)

New file `src/engine/__tests__/premise-reading-order.test.ts`. Mirror the
snapshot-fixture construction in the existing
`src/engine/__tests__/text-tree.test.ts` (premises/expressions/variables/claims/
roles shape). Cover the 6 behavioral acceptance criteria from `spec.md`:

1. P1–P4 example (feed premises in scrambled input order) → `[P1,P2,P3,P4]`
   (assert P1,P2 fixed; P3/P4 either order).
2. Shared antecedent reused by two premises → proof placed once, at first
   encounter.
3. Cycle → terminates, each premise emitted exactly once, deterministic.
4. Rebuttal concluding `¬B` while an antecedent needs `B` → rebuttal appended
   off-chain, not woven into B's slot.
5. `conclusionPremiseId` undefined → equals `baseOrder`.
6. `conclusionPremiseId` set but not in `snapshot.premises` (dangling) → no
   throw; output = all premises in `baseOrder`.
7. (in `text-tree.test.ts`) `buildTextTree` emits premise-headers in the new
   order and still skips derivation premises.

Run `pnpm run test` → these fail (module/behavior absent).

## Phase 2 — Implement

**New:** `src/engine/premise-reading-order.ts` exporting
`orderPremisesForReading(snapshot: TProjectReactiveSnapshot): string[]`.

- Walk each freeform premise's expression tree from `rootExpressionId` (reuse the
  position convention from `text-tree.ts`: implies/iff → antecedent = lowest-
  position child subtree, consequent = highest-position child; collect variable
  leaves' `(claimId, negated)`, flipping `negated` under `not`).
- Build `provenBy: Map<signature, premiseId[]>` (signature = `claimId` + polarity)
  over freeform premises; a bare-assertion premise contributes no consequent.
- Compute `frontier(premise)` = antecedent signatures (or the bare premise's own
  signatures) in position order; collect premise-bound antecedent edges
  (`boundPremiseId`).
- `baseOrder` = premise ids sorted by `localeCompare` (matches engine
  `listPremiseIds`); used for the off-chain append and `provenBy` sibling
  tie-break.
- Pre-order DFS from `conclusionPremiseId` (visited-set; **guard: `visit` returns
  early if the id is missing from `snapshot.premises`** — dangling role id);
  append all remaining premise ids in `baseOrder`.
- Keep it pure/data-only (no DOM/Node globals; relative imports end in `.js`).

**Edit:** `src/engine/text-tree.ts` `buildTextTree` — replace the conclusion-
first comparator (`:198-206`) with:
`const rank = new Map(orderPremisesForReading(snapshot).map((id,i)=>[id,i]))`
then sort `Object.entries(snapshot.premises)` by `rank`. Emit loop and
derivation-skip (`:212`) unchanged. Import `orderPremisesForReading` (`.js`).

Run `pnpm run test` → green.

## Phase 3 — Verification

- `pnpm run check` (typecheck + lint + tests) green.
- Optional cross-boundary sanity: `pnpm exec tsc -p tsconfig.build.json` so a
  consumer using `file:../proposit-shared` picks up fresh `dist/`. Actual
  in-app visual confirmation is a consumer-side step, not required to close this
  shared item.

## Phase 4 — Doc-sync & closeout

- Documentation Sync (shared): add an entry to `docs/changelogs/upcoming.md` and
  `docs/release-notes/upcoming.md` (feature: premise reading-order in
  `buildTextTree`). Evaluate the shared repo's Documentation Sync triggers.
- Offer `pnpm version minor` (new behavior, additive export) and the
  upcoming.md → versioned rename.
- Follow-up note (not auto-created): when `proposit-server` / `proposit-mobile`
  bump to this shared, reconcile their argument-view `capabilities.md` wording
  (premises shown in reading order). Consumer-side; capture as a closeout
  decision.

## Touch points

- New: `src/engine/premise-reading-order.ts`
- New: `src/engine/__tests__/premise-reading-order.test.ts`
- Edit: `src/engine/text-tree.ts` (`buildTextTree` comparator + import)
- Edit: existing `src/engine/__tests__/text-tree.test.ts` (order assertion)
- Doc: `docs/changelogs/upcoming.md`, `docs/release-notes/upcoming.md`

## Verification commands

```bash
pnpm run test      # Phase 1 red → Phase 2 green
pnpm run check     # full pipeline before closeout
```

## Parallelization

Effectively sequential (Phase 1→2→3). Too small to parallelize.
