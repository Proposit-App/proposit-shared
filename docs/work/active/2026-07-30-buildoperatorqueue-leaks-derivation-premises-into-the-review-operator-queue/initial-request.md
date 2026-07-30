---
from: proposit-server
---

# proposit-shared: buildOperatorQueue leaks derivation premises into the review operator queue

**Target node:** `proposit-shared`. Consumer: `proposit-server` backlog item
`2026-07-29-premise-counts-disagree-between-the-argument-header-and-the-review-panel`.

## Problem

The argument header and the sidebar Review panel report different premise counts
for the same argument. Measured across 297 argument-versions on a local database:
the review count is **higher** on 200, **lower** on 51, and equal on only 46. It
disagrees in both directions, so it is not an off-by-one and cannot be fixed by
relabelling one of the two numbers.

The dominant direction — review over-counting — is a user-visible leak of
engine-managed rows into a user-facing review flow.

## Root cause

`buildOperatorQueue` (`proposit-shared/src/engine/review/step-queue.ts:19-34`)
does not filter on `premise.type`:

```ts
const premises = [
    ...argEngine.listSupportingPremises(),
    ...(argEngine.getConclusionPremise() ? [argEngine.getConclusionPremise()!] : []),
]
for (const p of premises) {
    if (p.getDecidableOperatorExpressions().length > 0) { out.push(...) }
```

A claim carrying ≥1 citation mints a hidden derivation premise of the form
`IMPLIES(citation_var, Q)` (see `proposit-server/docs/architecture-notes.md:181`).
That is an inference with a decidable operator, so it passes both gates, enters
the queue, and `PremiseStep` renders it to the user as "Premise N (Supporting)".

Only *naked-Q* derivation premises self-exclude, and only incidentally — they
have no operator expressions. `toEvaluationContext`
(`src/engine/review/evaluation.ts`) does filter naked-Q, but `buildOperatorQueue`
does not call it.

## Proposed fix

Make `step-queue` consistent with its sibling in the same repo.
`computeArgumentMetrics` already does exactly the right thing, with the rationale
written out — `proposit-shared/src/engine/argument-metrics.ts:265`:

```ts
if (premiseSnap.premise.type !== "freeform") continue
```

documented as *"derivation premises are engine-managed single-antecedent wiring,
not user-authored inference steps."*

That reasoning applies verbatim to the review queue: a user cannot meaningfully
render a verdict on wiring the engine generated on their behalf. So this is not
"add a filter" so much as "apply the filter the neighbouring module already
established."

## Consumer impact

- **proposit-server** — the Review panel count drops to the reviewable set, and
  the review wizard stops presenting citation-derivation premises as steps. The
  header count (which already filters `type !== "derivation"`,
  `argument-text-view.tsx:622`) is unaffected, so the two converge on the same
  reading for the common case.
- **proposit-mobile** — adopted the shared ReviewEngine under root item
  `2026-07-10-unify-review-step-ordering-on-proposit-shared-mobile-adopts-shared-reviewengine`,
  so it inherits the same fix. Worth confirming no mobile snapshot pins the
  current step count.
- Existing in-flight reviews whose queue was built pre-fix will shorten. Whether
  that needs a migration or is acceptable drift is a call for the shared node.

## Why this is not covered elsewhere

The only root-node item touching `buildOperatorQueue` is the **completed**
`2026-07-10-unify-review-step-ordering-…`, whose scope was unifying *ordering*
(mobile adopting shared's primitives) — never a premise-`type` filter. Its
`spec.md:43` defines the contract as "premises (supporting + conclusion) whose …"
with no type predicate. No backlog, active, or inbox item at root or in shared
covers this.

## Test cases

- An argument whose only citation-bearing claim mints an `IMPLIES(citation_var, Q)`
  derivation premise → that premise does **not** appear in `buildOperatorQueue`'s
  output, and `totalPremises` matches the count of `type === "freeform"` premises
  with decidable operators.
- A freeform premise with a decidable operator is still queued (no regression).
- The conclusion premise is still queued when it qualifies — it is appended
  separately and must not be caught by the new filter.
- An argument with zero citations produces an identical queue before and after.

## Related, same file family — worth one release

`proposit-shared/docs/work/inbox/2026-07-16-review-engine-skip-empty-phase-on-entry.md`
is still unadopted and also filed from `proposit-server` (the review wizard
dead-ending at "Step 1 of 0"). Different bug, adjacent code. Landing both in one
shared publish saves the consumers a second repin cycle.
