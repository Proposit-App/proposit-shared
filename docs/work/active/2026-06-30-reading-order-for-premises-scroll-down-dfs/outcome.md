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

- `pnpm run check` green: typecheck, lint (prettier + eslint), **628 tests**,
  build all pass. Core tests followed red→green (watched each fail first: the
  `premise-reading-order` suite failed on the missing module; the `buildTextTree`
  case failed showing `[a-concl, m-leaf, z-proof-a]` before the comparator swap).
- **Test suite broadened** to 27 `orderPremisesForReading` cases across argument
  shapes: linear chains, diamonds/shared sub-proofs, wide fan-out, iff and
  disjunctive antecedents, negated antecedents/conclusions, multiple
  premise-bound edges, and degenerate/nonsensical constructions (self-loop,
  2/3-cycles, cycle below the conclusion, disjoint components, empty premises,
  antecedent-less implication) plus a permutation+determinism invariant on a
  large mixed snapshot.
- **Live server verification (PASS):** ran `proposit-server` on :3000 against the
  local DB with the local shared build swapped in; drove the client-rendered
  `/view` with Playwright. On "Trial of Socrates: Crito" (v2), the premise that
  proves the conclusion moved from **last** (published order) to **directly under
  the conclusion**, then its supports followed — the DFS reading order, confirmed
  visually. `/view` and `/explore` both 200. Test rig reverted afterward
  (server `node_modules` restored to pristine 0.31.0; dev server stopped).

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

## Release

- Cut **v0.31.1** (patch, at user's direction): `package.json` bumped;
  `docs/{changelogs,release-notes}/upcoming.md` rotated to `v0.31.1.md`; committed
  `chore(release): cut v0.31.1` and tagged `v0.31.1`. Tag not pushed.

## Closeout still to decide (with user)

- Completion route: merge `premise-reading-order` → `main`, PR, or leave as-is.
- Whether to push the branch + `v0.31.1` tag (publishing — needs explicit ok).
- Whether to publish `@proposit/shared@0.31.1` and repin consumers (server/mobile),
  then reconcile their argument-view `capabilities.md` wording.
- `tcw work complete` once the above are settled.
