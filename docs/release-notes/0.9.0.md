# Upcoming release notes

## `./schemas/grammar` wire format (cross-repo Grammar Tiers initiative)

Adds a new exports-map entry `./schemas/grammar` shipping the cross-repo wire format for the Grammar Tiers initiative (spec at `proposit-orchestration/docs/superpowers/specs/2026-05-13-grammar-tiers-design.md`):

- `GrammarTierSchema` / `TGrammarTier` — the four tiers (`structural` ⊇ `evaluable` ⊇ `derivable` ⊇ `presentable`).
- `GrammarRuleCodeSchema` / `TGrammarRuleCode` — canonical rule-code union (S-1..S-14, E-1, E-3..E-7, D-1..D-6, P-1..P-5; codes `E-2` and `D-7` are reserved).
- `ViolationSchema` / `TViolation` — the per-violation envelope returned by core's `validate(tier)` and surfaced inline by server/mobile UIs. Allows additional properties so rule-specific context fields can be attached without a wire-format break.

Adoption: `import { TViolation, ViolationSchema } from "@proposit/shared/schemas/grammar"`.

Both server and mobile consume this module; coordinate with `proposit-core@^1.0` once it ships its `validate(tier)` API against this union. Adding/renaming a rule code is a coordinated shared + core publish — see `CLAUDE.md` "Grammar rule-code coordination protocol" for the flow.

## `./schemas/api/grammar-violations` — 422 envelope

Adds `GrammarViolationsResponseSchema` / `TGrammarViolationsResponse` — the standardized response server endpoints return when submit/publish requests fail a grammar-tier gate. Discriminated by `error: "GRAMMAR_VIOLATIONS"` so clients can switch on response type without sniffing tier/codes. Mobile consumes this same schema to render violations inline.

## Mutation-generator contract alignment (no runtime change)

`@proposit/shared/engine/mutations` no longer documents its behavior in terms of specific `proposit-core` `autoNormalize` flag names (`wrapInsertFormula`, etc.) that are being removed in `proposit-core@1.0.0`. The runtime behavior of the mutation generators is **unchanged** on `0.9.0` against any `@proposit/proposit-core@0.12.x` peer.

When consumers upgrade to `proposit-core@^1.0`, mutation-generator outputs become structural-only shapes; the engine's post-mutation AN hook (assistive behavior) inserts formula buffers and other Presentable-tier cleanup. In permissive (advanced) behavior, no AN runs — and that's intended (D-1 treats `formula` nodes as transparent when matching the populated-form skeleton).

**Action for server + mobile consumers:** none required at the `0.9.0` bump. The breaking behavioral change surfaces only when you bump `proposit-core` to `^1.0.0` (a separate coordinated step — see the cross-repo spec).

## Deprecated: `populateDerivationFromCitations`

The helper continues to function against `proposit-core@0.12.x` and is **not** removed in `0.9.0`. Once `proposit-core@^1.0` is the peer dep, prefer the engine's native `populateFromCitations` / `populateFromAxioms` and remove this helper in a subsequent shared minor.

## New documentation

`CLAUDE.md` gains a "Grammar rule-code coordination protocol" section codifying the shared + core publish flow for rule-code changes.

## `AxiomKindSchema` literals now carry descriptions

Each of the six axiom-kind literals in `AxiomKindSchema` now declares a TypeBox `description` annotation. The descriptions explain what each axiom kind means at the schema layer, so consumers reading the generated JSON Schema (or any tooling that introspects the TypeBox metadata) see the intent inline rather than having to cross-reference `AXIOM_KIND_LABELS` / `AXIOM_KIND_DESCRIPTIONS` in `@proposit/shared/consts`.

No runtime behavior change. No type-shape change. Purely additive metadata.

## Versioning intent

Pre-1.0 minor bump (`0.8.0` → `0.9.0`) per the policy in `CLAUDE.md`. The mutation-generator contract change is the breaking-behavior driver under the pre-1.0 minor-may-break rule; runtime behavior against `core@0.12.x` is unchanged, so the practical impact on consumers at the `0.9.0` bump itself is zero — the break surfaces when they also bump core to `^1.0.0`.

## See also

- `docs/changelogs/upcoming.md` — developer changelog with commit hashes.
- Cross-repo spec: `proposit-orchestration/docs/superpowers/specs/2026-05-13-grammar-tiers-design.md` (§7.1 API surface, §10.2 shared scope).
