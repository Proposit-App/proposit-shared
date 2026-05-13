# Upcoming release notes

## `AxiomKindSchema` literals now carry descriptions

Each of the six axiom-kind literals in `AxiomKindSchema` now declares a TypeBox `description` annotation. The descriptions explain what each axiom kind means at the schema layer, so consumers reading the generated JSON Schema (or any tooling that introspects the TypeBox metadata) see the intent inline rather than having to cross-reference `AXIOM_KIND_LABELS` / `AXIOM_KIND_DESCRIPTIONS` in `@proposit/shared/consts`.

No runtime behavior change. No type-shape change. Purely additive metadata.
