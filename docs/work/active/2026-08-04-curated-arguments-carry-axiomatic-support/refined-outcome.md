# Verification: Curated arguments carry axiomatic support

**Accepted** 2026-08-04.

## Verified against a live database, not only in unit tests

- `reconcile:figures` reported DRIFT on all four fixtures — proving `digest.ts`
  hashes the axiom kind, without which an axiom-only change would never
  republish.
- `--apply` republished all four; a distinct-count query at the published head
  returned exactly 8 / 5 / 5 / 2 axiomatic claims, matching the classification
  claim for claim.
- Persisted kinds are correct and their prose columns are null, as
  `AxiomaticClaimSchema` requires.
- In the browser, claims carrying an axiom render **True** while the ones
  deliberately skipped still render **Needs Support** — the selectivity is
  visible to a reader rather than only true in the data.

## The judgment accepted

20 of 68 claims. Candidates were restricted to the 41 leaf claims (those no
premise derives); a derived claim already has support from its own premises.
Empirical reports, historical evidence, biographical facts, and each author's
own argued thesis were skipped deliberately — an axiom under those is a row
carrying no information. No `mathematical-principle` is used because none of
these four arguments rests on one.

## Format

Non-axiom claims lower and export byte-identically to before, frozen by a digest
golden so a future field addition cannot silently make every published curated
argument report drift.
