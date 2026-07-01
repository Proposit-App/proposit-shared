# Refined outcome — Reading-order for premises (scroll-down DFS)

## Verification decision

**Approved.** Verified live in `proposit-server` (local, :3000) against the local
DB on "Trial of Socrates: Crito" (v2): the premise proving the conclusion moved
from rendered **last** (old order) to **directly under the conclusion**, with its
supports following — the DFS reading order. User confirmed ("Works well").

## Refinements after initial implementation

- **Broadened the test suite** 8 → 27 `orderPremisesForReading` cases spanning
  well-formed (linear chain, diamond/shared sub-proof, wide fan-out, iff,
  disjunctive antecedent, implication-as-conclusion, multi-prover), polarity
  (rebuttal appended, negated antecedent↔prover, negated bare conclusion),
  premise-bound edges, and degenerate/nonsensical constructions (self-loop, 2/3-
  cycles, cycle below the conclusion, disjoint components, empty premise,
  antecedent-less implication) plus a permutation+determinism invariant on a
  large mixed snapshot. Full suite: 628 tests green.

## Release

- **`@proposit/shared` v0.31.1** (patch): new `./engine/premise-reading-order`
  export + `buildTextTree` reordering. Branch `premise-reading-order`
  fast-forward-merged to `main` and deleted; tagged `v0.31.1`. Published by the
  user.
- **Consumer repin — `proposit-server` v0.33.2**: bumped `@proposit/shared`
  `^0.31.0`→`^0.31.1`; full `check` gate green (2235 tests, typecheck, lint,
  `next build`). During the repin an accidental server-version downgrade
  (`0.33.1`→`0.33.0`) and a stripped trailing newline were caught and reverted,
  keeping only the intended dep bump. Tagged `v0.33.2`.

## Deferred work (not auto-created as items)

- **`proposit-mobile` repin** to `@proposit/shared@^0.31.1` — outstanding
  (mobile is on an older shared line; tracked separately as mobile-node drift).
- **Consumer capability wording**: reconcile the argument-view `capabilities.md`
  in `proposit-server` (and mobile) to note premises render in reading order.
- Shared is a library with no `capabilities.md`, so there was no shared-node
  capability to reconcile.

## Final verification evidence

- Shared: `pnpm run check` green — typecheck, lint, **628 tests**, build.
- Server: `pnpm run check` green — **2235 tests**, typecheck, lint, `next build`
  (118 static pages). `test:e2e` not run (left to the user's push, covered by the
  pre-push hook on `main`).

## Closeout choices (user-selected)

- Completion route: **merge to `main` locally** (both repos), user pushes +
  publishes.
- Version bumps: **patch** (shared `v0.31.1`, server `v0.33.2`).
- Resolution: **done**.
