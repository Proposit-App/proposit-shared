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

## Resolution 2026-07-30 — over-count fixed here; under-count is the consumer's

The reported disagreement is TWO independent mechanisms. The arithmetic:

    review = header - 1 + (count of citation-populated derivation premises)

0 citations -> under by 1 (the 51 measured cases); exactly 1 -> equal (46);
2 or more -> over (200). That closes all three measured buckets exactly.

**Fixed here (the over-count).** `src/engine/review/step-queue.ts:53` now skips
`type === "derivation"`. A citation-populated derivation premise is
`IMPLIES(citation_var, Q)` — an inference, so `listSupportingPremises()` returned
it, with a decidable operator, so the second gate passed — and it rendered to the
user as "Premise N (Supporting)".

**NOT fixed here, and deliberately so (the constant -1).**
`getDecidableOperatorExpressions()` is empty for a bare-variable premise, and the
standard authored conclusion IS a bare variable (confirmed in the shipped curated
fixtures, e.g. `historical-figures-mill/mill-01.argument.yaml:190-194`, which has
`role: conclusion` with `tree: {type: variable}`). A bare-variable conclusion has
no operator to accept or reject, so manufacturing a queue step for it would
produce a review prompt with nothing to decide.

The remaining defect is a labelling bug in `proposit-server`:
`TReviewProgress.totalPremises` is the LENGTH OF THIS QUEUE, not a premise count,
and the Review panel renders it as "N premises". `step-queue.ts:19-42` now carries
a doc comment stating that contract explicitly so the next reader does not repeat
the mistake. Tracked on the consumer side at
`proposit-server/2026-07-29-premise-counts-disagree-between-the-argument-header-and-the-review-panel`,
which is annotated not to close on the repin alone.

Failing test first: `src/engine/review/__tests__/step-queue.test.ts:57` with
fixture `buildEngineWithCitationBackedDerivationPremise`
(`__tests__/fixtures.ts:656`). Pre-fix:
`expected [ 'pDerivation', 'pSupport' ] to deeply equal [ 'pSupport' ]`.
A second test at :72 pins the under-count mechanism — it passes before AND after,
which is the point: it documents the bare-variable exclusion as intended.

Latent gap found and filed rather than speculatively fixed:
`2026-07-30-listsupportingpremises-filters-on-isinference-so-authored-constraint-premises-never-enter-the-operator-queue`.
