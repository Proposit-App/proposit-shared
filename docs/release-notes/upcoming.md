# Release notes — upcoming

## Two argument metrics nobody imported are gone

`@proposit/shared/engine/argument-metrics` no longer exports
`computeCitationStrength`, `detectEnthymemeWarnings`, or the
`computeArgumentMetrics` wrapper around the pair (nor the
`TCitationStrengthMetric`, `TEnthymemeWarning`, and `TArgumentMetrics` types).
They have been in the package since 0.33.0 and neither app ever called one.

The enthymeme detector had a second problem. It decided from structure alone
that a premise left something unspoken — any `P implies Q` whose antecedent was
not an explicit conjunction of two or more claims. In the product an enthymeme
is something an author declares about their own argument; nothing derives it.
Shipping both under one name meant the package could tell a consumer a premise
was enthymematic when its author had said no such thing.

`getClaimProofState`, `TClaimProofState`, and `consequentClaimIds` are
unchanged and stay on the same subpath.

## Repinning

Breaking on paper, and nothing to do in practice: no code in `proposit-server`
or `proposit-mobile` imports any of the removed symbols, so upgrading past this
version needs no change. If you have a branch that started consuming one of
them, the citation-strength ratio and the antecedent-conjunct heuristic are
recoverable from this repo's history at the commit before the removal — but
treat the enthymeme heuristic as retired product-wise, not just code-wise: read
the author-declared `enthymeme` marker on a premise or expression instead.
