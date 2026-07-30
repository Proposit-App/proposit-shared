# listSupportingPremises filters on isInference, so authored constraint premises never enter the operator queue

Found while fixing the derivation-premise leak in `buildOperatorQueue`
(2026-07-30). Flagged rather than fixed there, because there is no evidence of
this shape in real data and building for it speculatively was out of scope.

## Product changes

A user who authors a constraint premise — one whose expression tree is rooted at
`and` or `or` rather than an implication — is never asked to decide its operators
during review, even though the engine evaluates it and fans operator assignments
over it. The review walk silently skips part of the argument.

## Technical changes

`buildOperatorQueue` (`src/engine/review/step-queue.ts`) sources its premises
from `argEngine.listSupportingPremises()` plus the conclusion premise.
`listSupportingPremises()` filters on `isInference()`, so a root-`and`/`or`
premise is excluded before either of the queue's own gates runs.

This is a *different* mechanism from the two characterised in the premise-count
investigation, and it is not covered by the derivation filter added there.

Before building anything, establish whether the shape can occur at all:

- Can any authoring surface (server web UI, mobile, ingestion) produce a premise
  with a root `and`/`or`, or does authoring always wrap it in an implication?
- Does any curated fixture or production row carry one?

If it cannot occur, close this as not-reachable and leave a comment at the call
site recording why the filter is safe. That is a legitimate outcome and cheaper
than the fix.

## Meta changes

None. No capability change; this is a correctness gap in an existing flow.
