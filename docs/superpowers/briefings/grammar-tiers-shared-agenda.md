# proposit-shared — Grammar Tiers Agenda

**Cross-repo spec:** `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-05-13-grammar-tiers-design.md` — read first. This briefing is shared's slice.

**Initiative status:** PAUSED 2026-05-14 pending core 1.0.0 publish. Design was restructured — types now live in `@proposit/proposit-core` (single source of truth: defs + schemas + validators co-located), shared re-exports them. Publish order flipped to **core → shared**. See the updated cross-repo spec §10.5.

## Capability changes

Shared exposes no user-facing capabilities directly. Its part of this initiative is wire-format and contract-shape work that _enables_ the per-app capability changes documented in the spec's §1 (advanced mode, inline violation surface, Tidy + toggle-confirmation auto-clean, two-slot grounding affordance, save-accepts-Structural). No `capabilities.md` files are authored or updated in this repo.

## Where shared fits

You publish **second** after core 1.0.0 lands. Core owns the wire-format types and rule-code namespace; you re-export them from `@proposit/shared/schemas/grammar` for consumer ergonomics, and add the 422 response envelope composing core's `TViolation`. The cross-repo publish order is **core → shared → (server + mobile in parallel)** per spec §10.5. _(Pre-2026-05-14 drafts had shared publishing first — that was rolled back when the dep direction (shared depends on core via peerDeps) was reconciled. See §10.5 of the spec.)_

Current baseline: `@proposit/shared@0.8.0` on main + public npm. `@proposit/proposit-core@0.12.3` is the pinned peer dep — _do not bump core's peer here_; core will publish a new major after you ship.

## Work items

### 1. Re-export the grammar wire format from core

After `@proposit/proposit-core@^1.0.0` publishes (it ships `TGrammarTier`, `TGrammarRuleCode`, `TViolation` as TypeBox schemas + derived types from core's own source), add a re-export module under `src/schemas/grammar/`:

- `src/schemas/grammar/index.ts` — re-export the wire-format module from `@proposit/proposit-core`. Server and mobile import from `@proposit/shared/schemas/grammar` for the ergonomic wire-format path; the re-export keeps consumers from having to switch import paths.

Add a new exports-map entry `./schemas/grammar` with `types` + `import` + `default` conditions pointing at the re-export file.

*The TypeBox schemas authored on the `grammar-tiers/shared` branch in the original (pre-restructure) `src/schemas/grammar/{tier,rule-code,violation,index}.ts` should be deleted — those concepts now live in core. The work isn't lost; core-dev pulled the schemas directly from that branch into core's source.*

### 1.5. Add the 422 response envelope

Create `src/schemas/api/grammar-violations.ts` exporting `GrammarViolationsResponseSchema` (TypeBox) and `TGrammarViolationsResponse` — the standardized 422 envelope for grammar-rejected submit/publish requests. The envelope **composes `TViolation` imported from `@proposit/proposit-core`** (this fits the existing dep direction: shared depends on core for types it uses in composition). Add an exports-map entry `./schemas/api/grammar-violations`.

Tests in `src/schemas/__tests__/grammar-violations-response.test.ts`.

### 2. Align mutation-generator commentary with the new contract (audit finding: minimal code-level change)

The original framing of this work item assumed `@proposit/shared/engine/mutations` emits flag-driven cleanup ops inline — formula buffers, double-negation collapse, etc. **Audit (2026-05-14) shows that's not the case in shared.** Shared's mutation helpers delegate to `proposit-core`'s `PremiseEngine.wrapExpression(...)` etc. and rely on **core's** auto-normalization to insert formula buffers. There's no flag-named control flow to remove in shared's source. The actual work for this slice is:

- **Comment-only updates** at `src/engine/mutations/expressions.ts:385`, `src/engine/mutations/premises.ts:573`, and `src/engine/mutations/premises.ts:605` (each currently references the soon-to-be-removed `wrapInsertFormula` flag by name). Update them to describe the new model: the engine's post-mutation AN pass in `assistive` behavior handles the buffer insertion uniformly.
- **Add a `@deprecated` JSDoc note** above `populateDerivationFromCitations` (`src/engine/mutations/premises.ts:478`) directing future consumers to core 1.0's `populateFromCitations` / `populateFromAxioms` on the engine. The helper stays in 0.9.0 — removing it would break server/mobile still on core 0.12.x at shared 0.9.0 publish time. A later shared version can drop it once consumers have bumped to core 1.x.
- **Runtime behavior on 0.9.0 is unchanged against any core 0.12.x peer.** The breaking behavioral change for consumers surfaces only when they bump core to `^1.0`; that coordination is the consumer agents' problem, not yours. Call this out explicitly in shared's release notes.

Spec §10.2's forward-looking wording ("no more flag-driven cleanup logic in mutation generators") still holds in spirit — there isn't any in shared today; the contract change is the engine-side promise that core 1.0 codifies.

### 3. Rule-code namespace coordination protocol

Document (in shared's CLAUDE.md or a new `docs/` note) the publish protocol for rule-code additions:

> Adding or renaming a rule code is a coordinated shared + core publish:
>
> 1. Bump shared minor (extend the `TGrammarRuleCode` union).
> 2. Bump core (ship the validator referencing the new code).
> 3. Server + mobile pick up the change via dep bumps.
>
> Do not let core ship a code that isn't in shared's union — TypeScript catches this at build time once the dependency is wired through.

### 4. **Do NOT** add `intendedForm` to `TCoreDerivationPremise`

An earlier draft of the design spec added an `intendedForm: 'citation' | 'axiomatic'` field to the derivation-premise schema; that field is **explicitly removed** in the current spec (§10.2 and §12). Grounding form is derived from antecedent claim types at read time, not stored. **Do not add this field** even if you see references to it in old comments or stale doc fragments.

## Publish process

1. Spec + plan in `proposit-shared/docs/superpowers/specs/` and `.../plans/`.
2. Branch: `grammar-tiers/shared` (or your preferred naming).
3. Run `pnpm run check` — all tests + typecheck + lint + build green.
4. Version bump: `pnpm version minor` — `0.8.0 → 0.9.0`. Minor bump because pre-1.0 convention allows breaking behavior on minor; mutation-generator contract change qualifies.
5. `pnpm publish --access public` (human completes OTP).
6. Push branch + tag.
7. PR → main, merge.
8. Post on the broker (initiative thread `grammar-tiers`): `READY: @proposit/shared@0.9.0 published — re-exports core's grammar wire format under /schemas/grammar + adds 422 response envelope. Server and mobile can bump.`

## Coordination

- **Broker thread:** `grammar-tiers` (post `READY:` / `BLOCKED:` / `DECISION:` / `QUESTION:` signals there).
- **Dependency on others:** `@proposit/proposit-core@^1.0.0` must publish first — your re-exports import from it.
- **Downstream consumers waiting on you:** server + mobile (both bump shared in parallel after your publish; they also bump core to `^1.0.0` in the same change).

## What good progress looks like

- Day 1–2: scope confirmation. Read spec §4 (rule inventory), §7.1 (API surface), §10.2 (your scope). Write a small plan in `docs/superpowers/plans/`. Open the broker thread.
- Day 3–5: implement the wire-format schemas + mutation-generator rewrite. `pnpm run check` green.
- Day 6: publish + merge. Post `READY:` on broker.

Total: ~5 working days.

## Out of scope

- Implementing validators for the rules (that's core's job).
- Server/mobile UI changes (downstream).
- Migration scripts (server runs them).
- Authoring `capabilities.md` anywhere — shared has no user-facing surface.
- Mobile's typebox + `babel-preset-expo` interaction (a known mobile toolchain quirk noted in `phase-1-shared-agenda.md`; unrelated to this initiative).
