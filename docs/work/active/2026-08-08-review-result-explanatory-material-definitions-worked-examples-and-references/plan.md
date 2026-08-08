# Plan

1. `src/engine/review/explainer.ts` — types, the two explainer tables, the
   attribution map, the vacuous-inference note, `argumentExplainerKey`, and
   `describeCounterexample`. One module: the tables and the resolver that keys
   into them belong together, and the counterexample helper is the same
   "state the result in the reader's words" concern.
2. `src/engine/review/__tests__/explainer.test.ts` — the invariants prose can
   break silently (see spec's *Done when*).
3. `pnpm run check`; prettier over the new `docs/work/**` files.
4. Changelog + release notes, `pnpm version minor`, rotate `upcoming.md`, tag.
5. `pnpm run pack:branch`. No publish, no push.

No package.json change: `./engine/*` already maps `engine/review/explainer` with
all three conditions.
