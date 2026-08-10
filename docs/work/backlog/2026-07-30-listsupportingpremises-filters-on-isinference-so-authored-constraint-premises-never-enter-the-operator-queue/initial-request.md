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

---

## Merged in, 2026-08-10: "Operator queue offers the conclusion premise and omits restriction premises"

That inbox entry (escalated from `proposit-app`, found while verifying the
review-verdicts two-axes work) names the **same root cause in the same
function** — `buildOperatorQueue` sourcing from `listSupportingPremises()` plus
the conclusion — so it is folded here rather than adopted separately. Two people
fixing half each would have collided in one expression.

The item is therefore three disagreements between `buildOperatorQueue`
(`src/engine/review/step-queue.ts`) and the design it implements, not one:

1. **Constraint premises are never offered.** `listSupportingPremises()` filters
   on `isInference()`, so a premise rooted at `and`/`or` is excluded before
   either of the queue's own gates runs. (The original filing above; reachability
   still unestablished — see its authoring-surface questions.)
2. **The conclusion premise *is* offered a decision, and should not be.** The
   design is explicit that it is never strikable — striking it would delete the
   thing being proven. The engine already guards this: a `rejected` assignment on
   the conclusion premise strikes nothing, pinned by `proposit-core`'s "never
   strikes the conclusion premise or a derivation premise". So this is a UX
   defect rather than a correctness hole — a reader can record a decision that
   silently does nothing.
3. **Restriction premises are never offered**, though the design's
   decision-target rule says they use the same rule as any other premise. A
   restriction can still receive a decision through the contradiction alert's
   exit, so the two paths disagree about what is decidable.

The escalation notes that the server slice declined to fork the rule locally,
because the header and the wizard would then disagree — so this is fixed here or
the design changes. That is the decision the spec has to make first, and it has
to make it for all three at once: they are one expression, and answering them
separately is how the queue drifted from the design in the first place.

Note (2) and (3) pull in opposite directions — one removes a premise from the
queue, the other adds a class of them — which is the clearest sign this is one
item. Reachability from (1) may make it two-and-a-half in practice; establish it
before scoping.
