# Upcoming changelog

## Schemas — Grammar Tiers wire format

- **Add:** `src/schemas/grammar/{tier,rule-code,violation,index}.ts` — TypeBox schemas + derived TypeScript types for the grammar-tiers wire format. Tests in `src/schemas/__tests__/grammar-{tier,rule-code,violation}.test.ts`.
- **Add:** `src/schemas/api/grammar-violations.ts` — 422 response envelope (`GrammarViolationsResponseSchema` / `TGrammarViolationsResponse`). Tests in `src/schemas/__tests__/grammar-violations-response.test.ts`.

## Package

- **Add:** Exports-map entry `./schemas/grammar` with `types` + `import` + `default` conditions, pointing at `dist/schemas/grammar/index.{d.ts,js,js}`.
- **Add:** Explicit exports-map entry `./schemas/api/grammar-violations` (alongside the other `./schemas/api/*` siblings) for symmetry and tooling discoverability, even though the existing `./schemas/*` multi-segment glob would cover it.

## Engine — mutation-generator contract alignment

- **Modify:** `src/engine/mutations/expressions.ts` — comment update describing the new AN post-hook model (no specific `wrapInsertFormula` flag-name reference).
- **Modify:** `src/engine/mutations/premises.ts` — two comment updates aligning with the new AN model. Added JSDoc `@deprecated` annotation to `populateDerivationFromCitations` directing future consumers to core 1.0's native `populateFromCitations` / `populateFromAxioms`.
- **No runtime behavior change.** All 303 baseline tests remain green; the helpers continue to function correctly against `core@0.12.x`.

## Schemas — AxiomKindSchema metadata

- `AxiomKindSchema` literals (`definition`, `stipulation`, `logical-principle`, `mathematical-principle`, `domain-rule`, `background-assumption`) now declare TypeBox `description` annotations explaining each kind. Metadata-only; no runtime or type-shape change.

## Docs

- **Add:** `CLAUDE.md` "Grammar rule-code coordination protocol" section under "Key design rules".
- **Add:** `docs/superpowers/briefings/grammar-tiers-shared-agenda.md` — the orchestrator-authored briefing this release tracks against.
- **Add:** `docs/superpowers/plans/grammar-tiers-shared-plan.md` — Phase 1 implementation plan.
