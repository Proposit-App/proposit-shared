# Curated arguments carry axiomatic support

Epic: [Premise titles name the inference, not restate it](tcw://W/proposit-app/2026-08-04-premise-titles-name-the-inference-not-restate-it)

## Product changes

Curated showcase claims currently stand unsupported — the reader sees a
"Needs Support" badge on every one. Give the claims that genuinely rest on a
self-evident basis an axiomatic support claim, attached through the claim's
hidden derivation premise, so the showcase demonstrates the axiom feature
rather than leaving it unexercised.

**Only where one genuinely applies.** An axiom is not decoration. Claims that
report what a source text says (`The Delos ship nears arrival`,
`Crito urges escape`) rest on the document, not on a self-evident truth, and
get nothing. Forcing a `background-assumption` under all 68 manufactures rows
that carry no information for the reader.

An axiomatic claim carries **no prose**: `title`, `body`, `url` and `citation`
are all `null`, and `axiom` is one of six kind literals
(`AxiomKindSchema`, `src/schemas/model/claims.ts:25`):

| Kind | Applies when |
|---|---|
| `definition` | true by what the words or categories mean |
| `stipulation` | assumed locally, for this argument's purposes |
| `logical-principle` | a principle of valid reasoning |
| `mathematical-principle` | a mathematical identity or quantitative rule |
| `domain-rule` | from a rule, doctrine, contract, or authority inside a system |
| `background-assumption` | a foundational premise the argument relies on but never proves |

So the editorial task is **classification**, not writing.

## Technical changes

### The blocker: the curated format cannot express this

- `CuratedClaimYamlSchema` (`src/fixtures/argument-yaml/schema.ts:58`) is exactly
  `{ symbol, title, body }` — no `type`, no `axiom`.
- `lower.ts:122-125` drops every claim-bound variable referenced only by
  derivation-premise expressions, and its own comment notes that this "also
  drops engine-added axiomatic background claims". The format discards them on
  export and cannot recreate them on import.

So this is a format extension, not a fixture edit.

### What already exists — do not rebuild it

- `populateDerivationFromAxiom(engine, derivationPremiseId, axiomaticClaim)`
  (`src/engine/mutations/premises.ts:900`) builds the `IMPLIES(axiom_var, Q)`
  tree on a claim's derivation premise. It is idempotent and throws
  `DERIVATION_TYPE_MISMATCH` on a non-derivation premise.
- The server already exposes `POST /api/v1/argument/[id]/[v]/claims/[claimId]/axiom`.
- `AxiomaticClaimSchema` (`src/schemas/model/claims.ts:180`) is the persisted shape.

The engine and the server are done. Only the curated round-trip is missing.

### Scope

1. **Schema** — extend the curated claim shape so a claim may declare its
   axiomatic support. Prefer a field on the supported claim (e.g. an optional
   `axiom: <kind>`) over a second claim entry: the support is one enum value,
   and a separate entry would need its own symbol and a hand-authored
   derivation tree that the engine already synthesizes.
2. **Lowering** — `lower.ts` must stop discarding axiomatic claims and must
   route each declared kind through `populateDerivationFromAxiom` rather than
   hand-building the derivation tree.
3. **Export** — the inverse path must round-trip: an argument lowered from YAML
   and exported again yields the same YAML. This is the assertion that proves
   the extension is real rather than write-only.
4. **Digest** — `digest.ts` must hash the axiom kind, or a curated argument
   whose only change is its axioms will not register as DRIFT and will never
   republish.
5. **Fixtures** — classify the 68 normal claims (socrates 25, mill 17,
   madison 15, singer 11) and declare a kind on the ones that warrant it.

### Consumer impact

`proposit-server` republishes curated arguments through
`republishCuratedArgument`, which must persist the new axiomatic claims and
their derivation wiring. Verify locally with `reconcile:figures --apply`
against a seeded database before any publish; the version diff should show the
added support.

## Sequencing

This ships **with** the premise-title change, not after it: curated arguments go
v0 → v1 once, carrying both. Shared is therefore held from publishing until
this lands.

## Meta changes

- `docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md`.
- `.claude/skills/add-curated-argument/SKILL.md` (workspace root) — document
  how to declare axiomatic support when authoring a curated argument.
