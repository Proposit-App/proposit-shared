# proposit-shared — Grammar Tiers Agenda

**Cross-repo spec:** `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-05-13-grammar-tiers-design.md` — read first. This briefing is shared's slice.

**Initiative status:** UNBLOCKED 2026-05-15 — `@proposit/proposit-core@1.0.0` published to npm at `2026-05-15T15:05:39Z`. Design was restructured 2026-05-14 — types now live in `@proposit/proposit-core` (single source of truth: defs + schemas + validators co-located), shared re-exports them. Publish order: **core (done) → shared → server+mobile parallel**. See spec §10.5.

**Scope-expansion 2026-05-15:** the original briefing's audit ("§2: comment-only, runtime-unchanged against core 0.12.x peer") was based on a partial read. A subsequent dispatch attempt bumped the peer to `^1.0.0` and uncovered **141 typecheck errors across 15 files** in shared's own engine wrappers — shared consumes the broken core 0.x surface (`ManagedDerivationPremiseEngine`, `TGrammarConfig`, `setGrammarConfig`, the old `validate()` return shape, removed `DERIVATION_*` codes). The wrappers must be refactored against core 1.0 in this cycle; see §2.5 below.

## Capability changes

Shared exposes no user-facing capabilities directly. Its part of this initiative is wire-format and contract-shape work that _enables_ the per-app capability changes documented in the spec's §1 (advanced mode, inline violation surface, Tidy + toggle-confirmation auto-clean, two-slot grounding affordance, save-accepts-Structural). No `capabilities.md` files are authored or updated in this repo.

## Where shared fits

You publish **second** after core 1.0.0 lands. Core owns the wire-format types and rule-code namespace; you re-export them from `@proposit/shared/schemas/grammar` for consumer ergonomics, and add the 422 response envelope composing core's `TViolation`. The cross-repo publish order is **core → shared → (server + mobile in parallel)** per spec §10.5. _(Pre-2026-05-14 drafts had shared publishing first — that was rolled back when the dep direction (shared depends on core via peerDeps) was reconciled. See §10.5 of the spec.)_

Current baseline: `@proposit/shared@0.8.0` on main + public npm; branch `grammar-tiers/shared` at `c512769` has 14 pre-pivot commits (schemas + 422 envelope + commentary + CLAUDE.md doc + version-bumped to `0.9.0`) — those build on `@proposit/proposit-core@^0.12.3`. This cycle's first step is to **delete the pre-pivot grammar schemas** (work is preserved in core) and **bump the peer to `^1.0.0`**, then absorb the engine-wrappers refactor that bump uncovers.

## Work items

### 1. Re-export the grammar wire format from core

After `@proposit/proposit-core@^1.0.0` publishes (it ships `TGrammarTier`, `TGrammarRuleCode`, `TViolation` as TypeBox schemas + derived types from core's own source), add a re-export module under `src/schemas/grammar/`:

- `src/schemas/grammar/index.ts` — re-export the wire-format module from `@proposit/proposit-core`. Server and mobile import from `@proposit/shared/schemas/grammar` for the ergonomic wire-format path; the re-export keeps consumers from having to switch import paths.

Add a new exports-map entry `./schemas/grammar` with `types` + `import` + `default` conditions pointing at the re-export file.

*The TypeBox schemas authored on the `grammar-tiers/shared` branch in the original (pre-restructure) `src/schemas/grammar/{tier,rule-code,violation,index}.ts` should be deleted — those concepts now live in core. The work isn't lost; core-dev pulled the schemas directly from that branch into core's source.*

### 1.5. Add the 422 response envelope

Create `src/schemas/api/grammar-violations.ts` exporting `GrammarViolationsResponseSchema` (TypeBox) and `TGrammarViolationsResponse` — the standardized 422 envelope for grammar-rejected submit/publish requests. The envelope **composes `TViolation` imported from `@proposit/proposit-core`** (this fits the existing dep direction: shared depends on core for types it uses in composition). Add an exports-map entry `./schemas/api/grammar-violations`.

Tests in `src/schemas/__tests__/grammar-violations-response.test.ts`.

### 2. Align mutation-generator commentary with the new contract

- **Comment-only updates** at `src/engine/mutations/expressions.ts:385`, `src/engine/mutations/premises.ts:573`, and `src/engine/mutations/premises.ts:605` (each currently references the soon-to-be-removed `wrapInsertFormula` flag by name). Update them to describe the new model: the engine's post-mutation AN pass in `assistive` behavior handles the buffer insertion uniformly.
- **Decide on `populateDerivationFromCitations`** at `src/engine/mutations/premises.ts:478`. With the engine-wrappers refactor in §2.5 below, the legacy helper has nothing to delegate to (MDPE is gone in core 1.0). Two options: (a) **delete** it as part of §2.5's API rewrite — cleanest, since callers must migrate to `populateFromCitations`/`populateFromAxioms` anyway; (b) **rewrite** it as a thin wrapper around the new factories with a `@deprecated` JSDoc directing consumers to call core's factories directly. Either is defensible; dev's call. Document the choice in release notes.

### 2.5. Engine-wrappers refactor against core 1.0 (scope-expansion 2026-05-15)

**Audit findings from 2026-05-15:** the original §2 framing ("comment-only, runtime-unchanged against core 0.12.x peer") was based on a partial audit. Bumping the peer to `^1.0.0` surfaces **141 typecheck errors across 15 files** in shared's engine wrappers. The wrappers must be refactored against core 1.0 in this cycle.

**Files needing refactor against core 1.0** (verified by the 2026-05-15 audit):

- `src/engine/derivation.ts` — imports `ManagedDerivationPremiseEngine` (removed; replaced by `populateFromCitations`/`populateFromAxioms` on `ArgumentEngine`); imports `DERIVATION_ANTECEDENT_NON_EMPTY` + `DERIVATION_STRUCTURE_INVALID_AT_EVALUATION` engine-error constants (removed); imports `TVariableMaterializer` (removed — MDPE-only type).
- `src/engine/engine.ts` — imports `TGrammarConfig` (removed); calls `setGrammarConfig` on `PremiseEngine` (removed); destructures `.ok` and `.violations` from `engine.validate()` (return shape changed to bare `readonly TViolation[]`; the legacy invariant-sweep is now `engine.validateInvariants()`).
- `src/engine/optimistic/verification.ts` — same `setGrammarConfig` + `validate()` shape pattern.
- `src/engine/review/overlay.ts`, `src/engine/review/review-engine.ts` — use the old `TCoreValidationCode` / `TCoreValidationResult` types (renamed/restructured); reference the old `PropositArgumentEngine` shape that's missing the new `frozen`/`checksum` discriminator fields on claim types.
- Test files in `src/engine/__tests__/`, `src/engine/mutations/__tests__/`, `src/engine/optimistic/__tests__/`, `src/engine/review/__tests__/` — reference `setGrammarConfig`, the old `validate()` return shape, and the removed `grammarConfig` option on engine constructors.

**Migration mapping** (from core 1.0 changelog at `proposit-core/docs/changelogs/v1.0.0.md`):

| Core 0.x | Core 1.0 |
|---|---|
| `engine.validate()` returning `{ ok, violations }` | `engine.validateInvariants()` (same return shape) for the legacy invariant sweep; `engine.validate(tier)` returns `readonly TViolation[]` for the new four-tier grammar check |
| `pe.setGrammarConfig(config)` + `TGrammarConfig` | gone. Replaced by `engine.behavior` setting (`'assistive' \| 'permissive'`) + `engine.setBehavior(b)`. Behavior is the only configurable knob; no flags |
| `new ManagedDerivationPremiseEngine(...)` + `mdpe.populateFromSupports(...)` | `engine.populateFromCitations(claimId, lookup)` + `engine.populateFromAxioms(claimId, lookup)` — sequential; mixing is forbidden by D-3 |
| `DERIVATION_ANTECEDENT_NON_EMPTY`, `DERIVATION_TYPE_MISMATCH`, `DERIVATION_CONSEQUENT_LOCKED`, `DERIVATION_ROOT_OPERATOR_INVALID` engine-error constants | gone. Surface via `validate('derivable')` returning `TViolation[]` with codes `D-1`..`D-6` |
| `DERIVATION_STRUCTURE_INVALID_AT_EVALUATION` | gone (D4 deletion). Pre-1.0 evaluation-time throw on naked-Q is now an evaluation-skip per spec §4.2; broken-tree premises surface as `DERIVATION_STRUCTURE_INVALID` |
| `TVariableMaterializer`, `TGrammarOptions`, `DEFAULT_GRAMMAR_CONFIG`, `PERMISSIVE_GRAMMAR_CONFIG`, `EXPR_FORMULA_BETWEEN_OPERATORS_VIOLATED` | all gone (D2). Confirm none are imported anywhere in shared |
| `pe.normalizeExpressions()`, `engine.normalizeAllExpressions()` | gone. AN runs automatically via the post-mutation hook in `assistive` mode; call `engine.normalize(tier?)` explicitly in `permissive` mode (default `tier` = `'presentable'`) |
| Engine construction with `{ grammarConfig: ... }` option | dropped. Pass `{ behavior: 'assistive' \| 'permissive' }` instead. Default is `'assistive'`. Incremental tree-build patterns (multiple consecutive `addExpression` calls) should use `'permissive'` during build and call `engine.normalize()` at the end |
| `LOAD_GRAMMAR` / `STRICT_GRAMMAR` snapshot config split | gone. Snapshot loading accepts any Structural state; non-Structural snapshots throw with a structured error |

**Test rewrites:** any test that asserted on the legacy inline AN cascade (formula collapse after removeExpression, removeVariable triggers operator collapse, changeOperator absorption, etc.) needs to switch to the v1.0 pattern: build in permissive, flip to assistive, trigger via an AN-inert mutation, observe the global AN sweep result. See core's `test/grammar/auto-normalize.test.ts` (post-D2b rewrites) for the canonical pattern.

**Forking:** if any shared code calls `forkArgumentEngine` and asserts on the forked engine's `behavior`, note that v1.0 threads parent's `behavior` through by default (per spec §11, D5 implementation). Override via `forkArgumentEngine(engine, { behavior: 'permissive' })`.

**Realistic scope:** ~3–4 days of focused work after the cleanup of the 14 pre-pivot commits already on the branch. The order that worked for core's own D2+D2b cycle: bump peer first, fix typecheck errors file by file, run `pnpm test` after each file group to catch behavioral regressions early. Don't bundle the re-export work until typecheck is green at the new peer.

### 3. Rule-code namespace coordination protocol

The pre-pivot commits on `grammar-tiers/shared` added a "Grammar rule-code coordination protocol" section to `CLAUDE.md` that has the old (pre-pivot) order — shared bumps first, then core. **That's wrong now** that core owns the union and shared re-exports.

Rewrite it to match the post-pivot reality:

> Adding or renaming a rule code is a coordinated **core → shared → consumers** publish chain:
>
> 1. Bump core (extend `TGrammarRuleCode` union + ship the validator emitting the new code). Major if any consumer-visible behavior changes; minor if purely additive.
> 2. Bump shared minor — the re-export at `src/schemas/grammar/index.ts` automatically reflects core's union via the dep range. No shared code changes are needed unless the 422 envelope shape changes.
> 3. Server + mobile pick up via dep bumps.

### 4. **Do NOT** add `intendedForm` to `TCoreDerivationPremise`

An earlier draft of the design spec added an `intendedForm: 'citation' | 'axiomatic'` field to the derivation-premise schema; that field is **explicitly removed** in the current spec (§10.2 and §12). Grounding form is derived from antecedent claim types at read time, not stored. **Do not add this field** even if you see references to it in old comments or stale doc fragments.

## Publish process

**Lessons-learned from core's 1.0.0 publish:** the right order is **merge to local main → human smoke-test → human `pnpm publish` (irreversible) → orchestrator pushes main + tag**. Origin should reflect npm state, not state ahead of npm. Do not push branch/tag before publish.

1. Run `pnpm run check` — all tests + typecheck + lint + build green at the new peer.
2. Version is already bumped to `0.9.0` (pre-pivot commits on the branch did `pnpm version minor`). Verify `package.json` reads `0.9.0`; the version commit + local tag `v0.9.0` should already exist from those pre-pivot commits. If they don't, re-bump.
3. Verify `docs/release-notes/v0.9.0.md` and `docs/changelogs/v0.9.0.md` exist and accurately reflect the post-pivot work (re-exports + 422 envelope + engine-wrappers refactor + `populateDerivationFromCitations` decision).
4. **Merge `grammar-tiers/shared` into local `main`** (`git checkout main && git merge --no-ff grammar-tiers/shared -m "Merge grammar-tiers/shared: v0.9.0 release"`). **STOP HERE.** Do not push, do not run `pnpm publish`. Report back to the orchestrator.
5. *(Human)* Smoke-test if applicable.
6. *(Human)* `pnpm publish --access public` with OTP from local `main`.
7. *(Orchestrator)* After publish succeeds: push `main` to origin, push `v0.9.0` tag, update INDEX with the published-version state, post the `READY:` signal for server+mobile.

## Coordination

- **Broker thread:** `grammar-tiers` (post `READY:` / `BLOCKED:` / `DECISION:` / `QUESTION:` signals there).
- **Dependency on others:** `@proposit/proposit-core@^1.0.0` must publish first — your re-exports import from it.
- **Downstream consumers waiting on you:** server + mobile (both bump shared in parallel after your publish; they also bump core to `^1.0.0` in the same change).

## What good progress looks like (revised 2026-05-15)

- Day 1: scope confirmation. Read spec §4 (rule inventory), §7.1 (API surface), §10.2 (your scope), and §2.5 above (the engine-wrappers refactor scope). Read core's `docs/changelogs/v1.0.0.md` for the full migration mapping. Write a small plan in `docs/superpowers/plans/`.
- Day 2–4: engine-wrappers refactor against core 1.0 (the bulk of the work). Bump peer to `^1.0.0`, fix typecheck errors file by file, run `pnpm test` after each file group.
- Day 5: delete pre-restructure schemas, add re-exports, verify 422 envelope, fix the rule-code coordination protocol in `CLAUDE.md`, update release notes to reflect the post-pivot work, mutation-generator commentary refresh, `populateDerivationFromCitations` decision.
- Day 6: merge to local main + STOP. Report back for orchestrator review + human publish.

Total: ~5–6 working days.

## Out of scope

- Implementing validators for the rules (that's core's job).
- Server/mobile UI changes (downstream).
- Migration scripts (server runs them).
- Authoring `capabilities.md` anywhere — shared has no user-facing surface.
- Mobile's typebox + `babel-preset-expo` interaction (a known mobile toolchain quirk noted in `phase-1-shared-agenda.md`; unrelated to this initiative).
