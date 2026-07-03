# Release notes — upcoming

## Argument metrics: citation strength and enthymeme warnings

`@proposit/shared` can now compute two argument-level metrics from any argument
snapshot: a citation-strength ratio (how much of the claim pool that can only be
discharged by a citation actually has one) and enthymeme warnings (premises whose
stated antecedent looks like a single claim when the inference likely depends on
more than that). Both are pure functions consumers can call directly; neither is
wired into a UI yet — that's a separate, later decision for `proposit-server` or
`proposit-mobile`.
