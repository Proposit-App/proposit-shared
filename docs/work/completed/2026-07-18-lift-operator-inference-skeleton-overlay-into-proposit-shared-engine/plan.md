# Plan — Lift operator-inference (skeleton overlay) into @proposit/shared/engine

Anchor slice of the cross-node epic
`2026-07-18-add-claims-with-relationships-on-mobile-lift-operator-inference-to-proposit-shared`
(root node). This slice owns the shared extraction only. Consumer adoption
(mobile consumes; server drops its local copy) are separate epic slices gated on
a root-coordinated publish — not executed here.

Mechanical extraction; the inputs are already the shared snapshot type, so the
plan is short. TDD: failing tests first, then the lift.

## Step 1 — failing tests

Add `src/engine/__tests__/skeleton-inference.test.ts`. Build synthetic
`TProjectReactiveSnapshot`s with a small local expression-tree helper (mirroring
the `buildExprTree`/`makeFreeformPremise`/`makeSnapshot` pattern in
`argument-metrics.test.ts`). Cases:

- `defaultSkeletonOperator`: root → `implies`, non-root → `and`.
- `computeWrap`:
  - missing premise / missing expression → `null`.
  - lone claim at root (no operator ancestor) → `{ root: true, operator: "implies", cyclable: true }`.
  - direct parent `and` → `{ root: false, operator: "and", cyclable: false }` (pinned); same for `or`.
  - nested under `implies` (parent not and/or) → `{ root: false, operator: "and", cyclable: true }`.
  - `not`-only ancestor chain does not clear `root` (still counts as root).
- `rootNegationUnitId`:
  - `not(A)` at root, expr = A → outermost NOT id.
  - `not(not(A))` → outermost NOT id.
  - positive lone claim → `null`.
  - negation nested under `and` → `null`.
- `planSkeletonCommit`:
  - `empty-leg` target → `{ route: "lone" }`.
  - lone-negation wrap target → `wrap-nest` on the NOT unit, `direction: "before"`.
  - wrap target with `and`/`or` parent → `wrap-associative` (parentId + afterExpressionId).
  - wrap target otherwise, `existingIsConsequent` unset → `wrap-nest`, no `direction`.
  - wrap target otherwise, `existingIsConsequent: true` → `wrap-nest`, `direction: "before"`.

Run `pnpm exec vitest run skeleton-inference` — expect red (module absent).

## Step 2 — extract

Create `src/engine/skeleton-inference.ts`:

- Import `type TProjectReactiveSnapshot` from `./engine.js`, `type
  TPropositionalExpressionCombined` from `../schemas/logic.js` (relative `.js`
  per ESM rule).
- Copy `TSkeletonOperator`, `computeWrap` (now `export`),
  `defaultSkeletonOperator`, `TSkeletonCommitTarget`, `TSkeletonCommitPlan`,
  `rootNegationUnitId`, `planSkeletonCommit` verbatim.
- Strip the `(B3)` planning tag from `computeWrap`'s comment (keep the technical
  rationale). Keep all other doc comments (they explain behavior/invariants).
- No DOM/Node globals; nothing else from the server file (no ATV imports).

## Step 3 — wire the export

`package.json` `exports`: add explicit `./engine/skeleton-inference` block with
`types`/`import`/`default` all pointing at `./dist/engine/skeleton-inference.*`,
placed beside `./engine/optimistic` (before the `./engine/*` wildcard).

## Step 4 — verify

`pnpm run check` (typecheck + lint + test + build) green. Confirm
`dist/engine/skeleton-inference.js` + `.d.ts` emitted and the sub-path resolves.

## Step 5 — dual review

Subagent code review + `bllm-review-many` on the diff. Apply clear fixes; record
judgment calls. (bllm advisory + unreliable on large diffs — verify against
source; empty ≠ clean.)

## Step 6 — docs + version cut

`docs/changelogs/upcoming.md` + `docs/release-notes/upcoming.md` entries, then
`pnpm version minor --no-git-tag-version` and rotate both `upcoming.md` files to
the new version. Commit `chore(release): cut vX.Y.Z`. **No git tag** — the
orchestrator tags at the publish gate.

## Hard stops

No `pnpm publish` / `pnpm pack`; no `tcw work complete`. The orchestrator owns the
publish gate and slice closeout.

## Touch points

- `src/engine/skeleton-inference.ts` (new)
- `src/engine/__tests__/skeleton-inference.test.ts` (new)
- `package.json` (`exports` + version)
- `docs/changelogs/upcoming.md`, `docs/release-notes/upcoming.md` (→ vX.Y.Z)
