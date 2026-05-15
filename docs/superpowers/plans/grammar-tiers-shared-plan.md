# Grammar Tiers — `proposit-shared` Implementation Plan (post-pivot, executed)

> **Status (2026-05-15):** Phase 2 implementation complete on branch `grammar-tiers/shared`. Awaiting orchestrator/human review + Phase 3 publish authorization.

This plan documents the **executed shape** of the cross-repo Grammar Tiers initiative's `proposit-shared` slice, after the 2026-05-15 scope expansion absorbed the engine-wrappers refactor and the 2026-05-14 design restructure relocated wire-format ownership from shared to core. The original plan (pre-pivot) authored grammar schemas locally in shared and would have published shared FIRST in the cross-repo sequence; that scope no longer reflects reality. This file replaces the pre-pivot draft and is the source of truth for what `0.9.0` ships.

**Goal:** Publish `@proposit/shared@0.9.0` shipping (a) a re-export of the four-tier grammar wire format from `@proposit/proposit-core@^1.0.0`, (b) a 422-equivalent grammar-violations response envelope composing core's `TViolation`, (c) an engine-wrapper layer aligned with core 1.0's API (no `grammarConfig`; `behavior`-driven; AN as a post-hook; `validateInvariants` for the legacy invariant sweep), and (d) updated documentation (CLAUDE.md rule-code protocol in the correct **core → shared → consumers** order; release notes + changelog covering the post-pivot scope).

**Publish order:** core (`v1.0.0` published 2026-05-15) → shared (this release) → server + mobile in parallel. See cross-repo spec §10.5.

---

## What landed on the branch (commit-by-commit)

| #             | Hash               | Summary                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 (pre-pivot) | `e52663c..3ef52f7` | 14 commits authoring the pre-pivot local grammar schemas + 422 envelope + mutation-generator commentary + `AxiomKindSchema` description annotations + initial CLAUDE.md "Grammar rule-code coordination protocol" section (wrong order, fixed in commit 7) + `pnpm version minor` to `0.9.0` + initial release-notes / changelog drafts (rewritten in commit 8) + briefing reconciliations through 2026-05-15. |
| 1             | `ee7b841`          | `chore(deps): bump @proposit/proposit-core peer + devDep to ^1.0.0`.                                                                                                                                                                                                                                                                                                                                           |
| 2             | `dccc37a`          | `refactor(engine): align engine.ts with core 1.0 (validateInvariants, drop grammarConfig, rename getClaim → getProjectClaim)`.                                                                                                                                                                                                                                                                                 |
| 3             | `1bc022a`          | `refactor(engine): align derivation.ts with core 1.0 (drop deleted MDPE/DERIVATION_* surface)`. Decision on `populateDerivationFromCitations`: kept with strengthened `@deprecated` JSDoc.                                                                                                                                                                                                                     |
| 4             | `aafa50f`          | `refactor(engine, schemas): align optimistic + review wrappers with core 1.0` (`verification.ts`, `review-engine.ts`, `schemas/review.ts`).                                                                                                                                                                                                                                                                    |
| 5             | `5a47b57`          | `test, refactor(engine): align engine wrapper tests with core 1.0; flip populateDerivationFromCitations to permissive build`.                                                                                                                                                                                                                                                                                  |
| 6             | `692e110`          | `refactor(schemas): replace local grammar schemas with re-exports from @proposit/proposit-core`.                                                                                                                                                                                                                                                                                                               |
| 7             | `dfeb423`          | `refactor(schemas, docs): re-point 422 envelope to grammar re-export; fix CLAUDE.md rule-code protocol order`.                                                                                                                                                                                                                                                                                                 |
| 8             | `dc43db8`          | `docs(release): rewrite 0.9.0 release notes + changelog for post-pivot scope`.                                                                                                                                                                                                                                                                                                                                 |
| 9             | (this commit)      | `docs(plan): publish-prep — 0.9.0 ready for review (post-pivot)`.                                                                                                                                                                                                                                                                                                                                              |

---

## Final state

- **Branch:** `grammar-tiers/shared` (in the orchestrator's main checkout — the agent worked in a subagent worktree branched from the same HEAD).
- **Version:** `0.9.0` (from pre-pivot commit `d046e35`; verified unchanged).
- **`pnpm exec tsc --noEmit`:** GREEN at `@proposit/proposit-core@^1.0.0`.
- **`pnpm run test`:** 316 tests across 46 files passing (vs 328/48 baseline at the pre-pivot HEAD). Net delta reflects the three deleted local-schema test files (whose property tests' equivalents live in core's grammar-types suite) plus the slimmed `derivation.test.ts`, partially offset by the new `grammar-reexport.test.ts` (7 tests).
- **`pnpm run prettify:check`:** has a pre-existing warning on the briefing file `docs/superpowers/briefings/grammar-tiers-shared-agenda.md`. The briefing is orchestrator-authored content and the agent intentionally did not reformat it (running prettier on it would touch the workspace orchestrator's source-of-truth content; that's outside this agent's commit scope). The substantive `check` pipeline (typecheck + test + build) is green.
- **NOT pushed to origin. NOT merged to main. `pnpm publish` NOT run.** Per dispatch instructions, those are post-review steps.

---

## Decisions made during execution

### 1. `populateDerivationFromCitations`: keep with strengthened deprecation

The briefing (§2 of the dispatch) offered two options: (a) delete the legacy helper, (b) keep with `@deprecated` JSDoc. The dispatch recommended (a); the agent chose (b). Rationale:

- The helper's IMPLIES/OR tree construction uses the unchanged `wrapExpression`/`appendExpression` mutation surface and continues to function correctly against core 1.0 (subject to the n ≥ 2 behavior change below).
- Server has **two production callsites** for `populateDerivationFromCitations`: `proposit-server/src/model/claim.ts:600` and `proposit-server/src/app/api/v1/argument/[argumentId]/[version]/citations/[edgeId]/route.ts:115`. (Separately, `proposit-server/src/app/view/[argumentId]/[version]/contexts/arg-data-context/claim-actions.ts:93` is the `getClaim` → `getProjectClaim` rename callsite — distinct migration; not a `populateDerivationFromCitations` callsite.) Deleting would force server's bump to absorb the migration in the same change cycle as the peer bump, doubling downstream churn for the server agent.
- Shared's test suite for the helper (`derivation-premises.test.ts:487+`) covers the IMPLIES-OR build semantics the UI exercises; deletion would also delete that suite.

Target removal: shared `^1.0.0`. Documented in release notes + JSDoc.

### 2. `populateDerivationFromCitations` n ≥ 2: behavior change (unbuffered output)

Pre-1.0 the helper produced the canonical formula-buffered `IMPLIES(formula(OR(c1, …, cn)), Q)` tree, relying on core's pre-1.0 `wrapInsertFormula` auto-rule to slip the formula in during the `wrapExpression` call itself. Core 1.0 runs the AN rule set asynchronously after each mutation in `assistive` behavior, and AN-3 (delete 0-child operators/formulas) would have destroyed the transient 0-child OR between the wrap and the children-append.

The helper now flips the engine to `'permissive'` for the duration of the n ≥ 2 build, suppressing AN throughout the build, and emits the unbuffered `IMPLIES(OR(c1, …, cn), Q)` tree. The unbuffered shape is Structural-valid in core 1.0 — only the P-1 Presentable rule complains. Consumers that need the canonical formula-buffered shape run `engine.normalize()` after the helper returns.

The release notes explicitly call this out for server. Server's persistence flow uses the helper's returned changeset to drive `persistChangeset()`; the changeset does NOT include the additional state changes that `normalize()` would emit, so server needs to choose between (a) accepting the unbuffered shape at storage and materializing the buffer on read, (b) snapshot-diffing post-normalize to capture the additional changeset, or (c) migrating to `engine.populateFromCitations` whose `{ kind, state }` return shape integrates with the four-tier model.

### 3. `getClaim` → `getProjectClaim` rename

Core 1.0 promoted `getClaim(claimId, claimVersion)` to the `ArgumentEngine` base surface, returning the minimal `TCoreClaim` shape. Shared's domain accessor returning the richer `TClaim` from the per-engine `claimsMap` can't override that signature (incompatible return types). The agent considered three resolutions:

- (A) Rename shared's domain method. Cleanest. Affects shared's internal callsites + 1 server callsite.
- (B) Widen shared's `TClaim` to extend `TCoreClaim` (add `frozen` + `checksum` fields). Heavy schema change with database-layer cascade.
- (C) Synthetic union covering both forms. Hacky; doesn't compose.

Chose (A). The new name `getProjectClaim` matches the existing `getProjectSnapshot` convention. The base `getClaim(claimId, claimVersion)` inherited from core is now also available on `PropositArgumentEngine` for engine-internal use. Server's `claim-actions.ts:93` callsite will need to migrate.

### 4. Test fixtures default to permissive behavior

Three test files (`expressions.test.ts`, `derivation-premises.test.ts`, `review/__tests__/fixtures.ts`) build their engine state through repeated `addExpression` / `mutateCreateExpression` calls in the pattern "operator root → child → child". Under core 1.0's default `'assistive'` behavior, AN-3 would delete the 0-child operator root before its children can land.

The agent updated the shared test helpers (`createTestEngine`, `buildEngineWithTwoPremises`) to return engines in `'permissive'` behavior. Tests that explicitly exercise the AN post-hook opt back in via `engine.setBehavior('assistive')`. This matches the cross-repo spec §11 "incremental tree-build" pattern that core's own test suite adopted in Phase D2b.

---

## What's out of scope for this cycle (deferred)

- **Server's `propositional-persistence.ts` migration off `LOAD_GRAMMAR` / `STRICT_GRAMMAR`.** Server's CLAUDE.md documents this pattern; it's server-agent work, kicked off when server bumps both `@proposit/proposit-core` to `^1.0.0` and `@proposit/shared` to `^0.9.0`.
- **Mobile's typebox + `babel-preset-expo` interaction.** Known mobile toolchain quirk; out of scope per the briefing's "out of scope" section.
- **`intendedForm` on `TCoreDerivationPremise`.** Explicitly forbidden by the briefing §4 and spec §10.2/§12 (grounding form is derived at read time, not stored).
- **Adding `engine.populateFromCitations` / `engine.populateFromAxioms` wrappers in shared.** Core's methods are already exposed via the inherited `ArgumentEngine` surface that shared's `PropositArgumentEngine` extends; no shared wrappers needed.

---

## Phase 3 — Publish (gate-locked, post-review)

The publish process per the briefing is **merge to local main → human smoke-test → human `pnpm publish` (irreversible) → orchestrator pushes main + tag**. Origin should reflect npm state, not state ahead of npm. Do NOT push branch/tag before publish.

Sequenced:

1. **Orchestrator / reviewer cycle.** Confirm the post-pivot scope, validate the test + check state, sign off on the behavior change to `populateDerivationFromCitations` and the `getClaim` rename.
2. **Merge `grammar-tiers/shared` into local `main`** (`git checkout main && git merge --no-ff grammar-tiers/shared -m "Merge grammar-tiers/shared: v0.9.0 release"`). NOT done by this agent; orchestrator after sign-off.
3. **(Human) Smoke-test if applicable.** Local consumer (e.g., server) builds against the new shared via `file:`-link briefly to confirm no surprise breaks before the irreversible publish.
4. **(Human) `pnpm publish --access public` with OTP from local `main`.**
5. **(Orchestrator) After publish succeeds:** push `main` to origin, push the `v0.9.0` tag, update the cross-repo `INDEX.md` ledger with the published-version state, post the `READY:` signal on broker thread `grammar-tiers` for server + mobile.

The local `v0.9.0` tag created by the pre-pivot `pnpm version minor` commit stays unchanged.
