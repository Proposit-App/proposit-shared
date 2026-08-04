# Outcome: Curated arguments carry axiomatic support

Branch `work/curated-axiomatic-support`. Format extension `e95dcb6`, fixture
classification `ef818d4`. Server persistence lives in `proposit-server`
`work/curated-axiom-persistence` (`069cb917`).

## Format

`axiom` is an optional field on the claim it supports — one enum value, no
second claim entry:

```yaml
- symbol: laws_bring_citizen_up
  title: The laws formed Socrates
  body: The laws claim they brought Socrates into existence, …
  axiom: domain-rule
```

Omitting it produces byte-identical output to before, frozen by a digest golden
so a future field addition cannot silently make every published curated
argument report drift. Export recovers the kind by resolving each derivation
premise's antecedent variable to its axiomatic claim; the axiomatic claim's own
claim-bound variable is still dropped by the unchanged derivation-only rule, so
nothing engine-internal leaks into the YAML. `digest.ts` hashes the kind —
without that, an axiom-only change would never register as DRIFT and would
never republish.

Lowering drives the real `populateDerivationFromAxiom` helper rather than
hand-building the `IMPLIES(axiom_var, Q)` tree, so the format is proven to read
exactly the shape the engine writes.

## Classification — 20 of 68 claims

Assigned only where an axiom genuinely applies. The candidate set is the 41
**leaf** claims (those the argument never derives — the ones showing "Needs
Support"); a derived claim already has support from its own premises, and
Socrates has 6 further claims that appear in no premise at all.

| Argument | Axioms / claims |
|---|---|
| socrates-01 | 8 / 25 |
| madison-01 | 5 / 15 |
| mill-01 | 5 / 17 |
| singer-01 | 2 / 11 |

By kind: 10 `background-assumption`, 4 `domain-rule`, 3 `stipulation`,
2 `definition`, 1 `logical-principle`. No `mathematical-principle` — none of
these four arguments rests on one, and inventing a use would be exactly the
filler this item set out to avoid.

Skipped deliberately: empirical reports (`The Delos ship nears arrival`),
historical evidence (`History condemns persecution`), biographical facts
(`Socrates accepted the city`), and each author's own argued thesis
(`Large republics control faction better`). An axiom under those is a row that
tells the reader nothing.

## End-to-end verification

Against a live local database, with the shared tarball installed into
`proposit-server`:

- `reconcile:figures` reported DRIFT on all four — proving the digest sees the
  kind.
- `--apply` republished all four; a distinct-count query at the published head
  returns exactly 8 / 5 / 5 / 2 axiomatic claims, matching the classification.
- Persisted kinds are correct and their prose columns are null, as
  `AxiomaticClaimSchema` requires.
- In the browser, claims carrying an axiom render as **True**; the ones
  deliberately skipped still render **Needs Support** — the selectivity is
  visible to a reader.

`pnpm run check` passes in shared (118 files, 1172 tests) and in server
(445 files, 3391 tests, clean build).

## Still open

`.claude/skills/add-curated-argument/SKILL.md` at the workspace root should
document how to declare `axiom:` when authoring a curated argument. Root-node
owned; open at the epic level.
