---
from: proposit-app
initiative: 2026-08-06-review-only-user-authored-claims
---

# Narrow the review claim queue to user-authored claims

Epic: [Review only user-authored claims](tcw://W/proposit-app/2026-08-06-review-only-user-authored-claims)

Adopt with `tcw work new --initiative 2026-08-06-review-only-user-authored-claims`,
not `tcw work inbox accept` — accept double-dates the slug and drops the
initiative link on a delegated slice. Then `git rm` this file.

## Problem

The review wizard presents a blank claim card as the first step of most cited
arguments: no title, no body, just True/False/Unknown. Reproduced in the running
web app on a curated 8-claim argument (4 of them citation claims) — the wizard
opens at "Step 1 of 8" with an empty card. Locally, **379 arguments** have
citation claims bound to variables and 6 have axiomatic ones.

## Root cause

`buildClaimQueue` (`src/engine/review/step-queue.ts`) returns
`collectArgumentReferencedClaims(...).claimIds` — every claim bound to any
variable. That includes claims the reviewer was never meant to judge:

- A claim carrying at least one citation mints a derivation premise shaped
  `implies(citation_var, Q)`, so the **citation claim** is claim-bound and gets
  queued as its own step.
- **Axiomatic** claims are claim-bound and queued the same way.

Neither carries prose — `CitationClaimSchema` and `AxiomaticClaimSchema` both
declare `title: Null` / `body: Null`, since identity lives in `citation` /
`axiom`. Any consumer rendering a queued claim's title renders nothing.

`buildOperatorQueue`, directly below it in the same file, already encodes the
equivalent narrowing for premises with the matching rationale: engine-generated
wiring is not something a reviewer can meaningfully accept or reject. The claim
queue is missing its half of that gate.

Note for axioms specifically: `buildExpressionAssignment` already excludes
axiom-bound variables from the assignment map (the engine forces them `true`;
`evaluate()` throws `AXIOM_VARIABLE_ASSIGNMENT_FORBIDDEN` on any supplied key).
An axiomatic step today asks a question whose answer is then discarded.

`proposit-core` is not in scope — `collectArgumentReferencedClaims` is a
general-purpose collector and its contract is correct as written. The
review-specific narrowing belongs here.

## Proposed fix

`buildClaimQueue` keeps only claims whose bound claim is `type === "normal"`.
Document the narrowing the way `buildOperatorQueue` documents its own, including
the consequence for callers: queue length is not the argument's claim count, so
no consumer may infer one from the other.

## Evaluation impact — verify before calling it safe

The worry: dropping citation claims leaves their variables unassigned, and
`buildExpressionAssignment` maps an undecided claim to `null` while the
`implies(citation_var, Q)` premises remain in the evaluation context
(`toEvaluationContext` filters only naked-Q derivation premises).

Evidence from the running app: on the curated 8-claim argument, skipping **all
four** citation claims ("Proceed as unknown" → their variables enter evaluation
as `null`), answering the four normal claims True and accepting both
relationships still yields **"Valid and Sound"**.

That is one argument shape. Before treating the narrowing as safe, test the
shape where the conclusion is reachable only through a cited claim. If that
degrades, stop and escalate rather than compensating in a consumer.

## Also in this slice

- Capability wording: `reviews/walk-through-and-decide-each-claim`
  (`cap-154720`). The description says claims are "presented in proof order and
  deduplicated so a shared claim is reviewed once" but never says *which*
  claims. State that the walk covers user-authored claims only — sources and
  axioms are not put to the reviewer. No status change on any node.
- Release notes, changelog, version cut, tag. The publish itself is user-gated
  (NPM MFA) and runs after consumer-side tarball validation.

## Test cases

1. An argument with one normal claim carrying a citation → the queue has length
   1 (the normal claim); the citation claim is absent.
2. An argument with an axiomatic claim bound to a variable → that claim is
   absent from the queue.
3. An argument with neither → the queue is unchanged.
4. The conclusion-through-a-citation shape still reaches a decided verdict with
   only its normal claims answered.

## Consumers

`proposit-server` (the wizard's `ClaimStep`) and `proposit-mobile`
(`src/arguments/use-argument.ts` calls `buildClaimQueue` directly). Both have
their own slices under the epic and are blocked on this one.
