# Outcome

Shipped on branch `explain-review-result-explainer`, cut as **v0.61.0** (tagged
locally, not pushed, not published).

## What landed

`src/engine/review/explainer.ts`, reachable as
`@proposit/shared/engine/review/explainer`. Exports:

| Symbol | What it is |
| --- | --- |
| `TExampleValue`, `TExampleItem`, `TWorkedExample`, `TReference`, `TExplainer`, `TReferenceOnlyExplainer` | The data shapes an explainer is made of |
| `CONCLUSION_EXPLAINERS` | `Record<TConclusionValue, TExplainer>` — 3 keys |
| `TArgumentExplainerKey`, `ARGUMENT_EXPLAINERS` | 6 keys; `does-not-reach` composes with its reason |
| `argumentExplainerKey` | `TArgumentAssessment` → key |
| `CONCLUSION_ATTRIBUTION_EXPLANATIONS` | Keyed by the three statement constants themselves |
| `VACUOUS_INFERENCE_EXPLANATION` | `TReferenceOnlyExplainer` |
| `TCounterexampleRow`, `describeCounterexample` | A failing case, in claim titles |

`src/engine/review/__tests__/explainer.test.ts` — 42 assertions over the
invariants prose can break silently.

## Decisions worth recording

- **No `package.json` change.** The existing `./engine/*` pattern already maps
  `engine/review/explainer` with all three conditions (`types` / `import` /
  `default`) — it is how the server already resolves
  `@proposit/shared/engine/review/review-engine`. An explicit entry would have
  been a duplicate of the pattern that already works.
- **`describeCounterexample` takes `TCoreExpressionAssignment`, not a flat
  record.** `TCoreCounterexample["assignment"]` is
  `{ variables, operatorAssignments }`; the helper reads `.variables`. Taking a
  flat record would have pushed the unwrapping into both clients.
- **One module, not two.** The counterexample helper is the same "state the
  result in the reader's words" concern as the explainer tables and is ~15
  lines; a sibling file would have been a second import path for one function.

## Not in this slice

Rendering. Web draws these on the results stage, mobile from its assessment
chips — those are the clients' slices of the epic. The five `Missing`
capabilities under `docs/capabilities/reviews/results/` stay `Missing` until a
client actually surfaces the material.

## Follow-up: v0.61.1 — the example's framing copy

An external design review found the worked example is drawn with primitives
identical to the real argument, so past a small `EXAMPLE` label nothing tells a
reader the illustration is not their own work. The web had fixed it locally
(`proposit-server/src/components/client/review/assessment-explainer.tsx`);
mobile had no equivalent sentence and labelled its result line `Result:`, which
reads as *the reader's* result.

That is the failure this module exists to prevent — one client able to say
something the other cannot — so the three framing strings moved here:
`WORKED_EXAMPLE_HEADING`, `WORKED_EXAMPLE_DISCLAIMER` (the web's wording
verbatim) and `WORKED_EXAMPLE_RESULT_LABEL` (`"Result of this example:"`, the
web's, because the bare form is the confusion being fixed). They are named and
commented as chrome for a `TWorkedExample` rather than more of its content: a
label a reader can mistake for their own result is a correctness problem, not a
styling one.

No definition, example or reference changed. Tests extended to pin all three
non-empty and to pin that the disclaimer says plainly the example is not the
reader's own work.

## Publish state

`proposit-shared-0.61.1-explain-review-result-explainer.tgz` built in the
package root (the 0.61.0 tarball was removed — a stray `.tgz` makes a later
`pnpm publish` fail with EUSAGE). Rides the existing unpublished core-4.0.0 / shared-0.60.x window
per the epic spec — nothing published, nothing pushed.

## Follow-up: v0.62.0 — the tenth entry, and one concept instead of two

Core gained a fourth truth value. Its constraint closure was nondeterministic
when two accepted steps drove one variable to opposite values, and the product
decision was explicitly *not* to resolve that to unknown — "it's not that the
value is unknown, it's that the user is saying it is both true and false" — so
core now implements Belnap's four-valued logic, with `CONTESTED` reachable only
by evaluation and never by assignment.

This module had already invented the same concept, in `resolveClaimValue`, for a
different cause: two variables bound to one claim carrying opposite values. It
resolved to unknown and reported the fact on `conflictedClaimIds` — the
resolution the product owner rejected, arrived at independently. The two are now
one value. `conflictedClaimIds` is deleted rather than kept as a derived
convenience: it is a one-line filter over `claimPropagatedValues`, and its
existence *was* the second vocabulary.

The tenth `CONCLUSION_EXPLAINERS` entry follows the nine in voice and structure.
Its definition carries the two loads the value exists for: contested is the
opposite of unknown rather than a shade of it, and it is always the reader's to
resolve, because both halves came from them. Further reading points at
four-valued logic, paraconsistent logic and the bilattice — a curious reader now
has somewhere real to go.

The dangerous edits were the ones the compiler could not flag:
`conclusionValueOf`'s fall-through to `"unknown"` (the exact outcome the product
decision rejected), `detectContradictions`' `rootValue !== false` (which would
have silently stopped blocking reviews it used to block, because a colliding
chain now comes out contested rather than false), `describeCounterexample`'s
truthiness test (contested is a truthy string), `provenanceSentences`' `origin
!== "derived"` skip, and the evaluation-result schema mirror — where a rejected
decode makes the review store drop the whole stored review as corrupt.

The argument axis is unchanged, deliberately and on the record: `premises-
contradict` is about the premise set alone and a contested conclusion can arise
over a perfectly consistent one.

## Publish state

`proposit-shared-0.62.0-explain-review-result-explainer.tgz` built in the package
root (the 0.61.2 tarball was removed — a stray `.tgz` makes a later
`pnpm publish` fail with EUSAGE). Still riding the unpublished core-4.0.0 window;
nothing published, nothing pushed.

## Follow-up: v0.63.0 — what the review of v0.62.0 found

Five defects that reach a reader, two that lose their data.

Three of the five are the same shape: a field read for something adjacent to
what it means. `reachedWithoutAssertion` is defined by core as "the root still
comes back **true**", so the `else` branch beside it fired on every False,
Unknown and Contested conclusion — "It holds only because you assigned it",
printed under the word False. `assertedByReader` means the reader supplied a
value for *some* claim the conclusion premise references, not the conclusion's
own value, so `conclusion-came-from-you` fired the same way, under a definition
that opens by asserting the conclusion holds. Both are now gated on the
conclusion actually coming out true.

The fourth is a gap in coverage rather than a misreading: `detectContradictions`
scanned supporting and constraint premises, and the conclusion premise lives on
its own field. The operator queue offers that premise, so the reader could be
invited to accept the one step the detector could not see — making the sole
unblocked route to a contested conclusion the one with no alert, no provenance
and no exits.

The fifth is the gate itself. `resultsPhase()` read a field only
`runEvaluation` sets, so a rehydrated `blocked` draft started `undefined` and
every route to the results step opened. Absence of a coherence finding was being
read as a finding of coherence; it now fails closed, and `clear()` no longer
lets a fresh review inherit the previous one's block.

Two explainer entries were teaching the wrong thing. The
`premises-hold-conclusion-does-not-follow` example drew an accepted step between
a true premise and a false conclusion — which under the confluent closure is the
contested collision, structurally identical to the contested entry's own
example. Its definition described the finding as a verdict on entailment, which
is the stronger claim the validity check answers, not this one. And
`conclusion-came-from-you` said the argument "asserts its conclusion rather than
supporting it", which allocates fault and is contradicted by its own example.

The two data-loss paths were both in `LocalStorageReviewStore.load`: a failed
re-save after migration was caught by the corrupted-blob branch and deleted a
review that had decoded perfectly, and any decode failure in the optional result
mirror took the draft with it.

Core's `contestedVariableIds` is adopted as the gate's backstop. It is not
derivable from the contradictions list — the forward rule transfers only the
told-true component, so a contested variable can leave every aggregate reading
clean with no contested premise root for any premise-level test to find.

## Publish state

`proposit-shared-0.63.0-explain-review-result-explainer.tgz` built in the package
root (the 0.62.0 tarball was removed). The core devDependency is a relative
tarball path again rather than an absolute one under a developer's home
directory. Still riding the unpublished core-4.0.0 window; nothing published,
nothing pushed.

## Follow-up: v0.64.0 — the second review pass

Two defects, both in controls rather than in copy.

The first is the worse one. Rejecting the conclusion premise was offered in two
places — as a walkthrough step and as the *first* exit out of a contradiction —
and core exempts that premise from striking, so the verdict was recorded and
then ignored. Three user-visible consequences fell out of the one cause: the
exit's copy promised to take the premise "out of the reckoning" when the premise
kept deriving the conclusion's value; `struckPremiseIds` stayed empty so no
badge appeared where rejecting any other premise gives one; and the struck
branch of `reasonFor` could not fire, so the argument line read "not enough was
settled" to a reader who had settled everything. Worse than a dead control, it
*unblocked* the review — a rejected premise leaves `detectContradictions`'
accepted-set filter, so the collision vanished from the report while remaining
in the argument. The exit is gone, `TOperatorQueueEntry.rejectable` carries the
constraint to both clients, and `dropStaleAssignments` prunes any rejection an
older build already persisted against it.

The second is a one-line omission with the same shape as the schema work in
v0.62.0: `contestedVariableIds` was added to the engine and to `TReviewCoherence`
but not to the persisted mirror, and TypeBox drops what it does not declare. The
gate added last release therefore evaporated on reload — in precisely the case
it exists for, where every aggregate reads clean and the list is the only
evidence left. The fix is one field; the test is the whole result mirror
compared field by field through `Encode` → `JSON` → `Decode`, because the
omission was not visible by reading either file alone.

The moderate is the reverse direction of v0.63.0's reload fix: a coherence
finding could outlive the draft it described, so a clean review edited into a
collision kept reporting itself finished. `done` now requires a finding whose
fingerprint matches the current draft. The prescribed fix was to clear
`lastCoherence` on divergence; that would have left the reported scenario
landing on `done` anyway, since the fallback treats absence as coherent for a
never-blocked review. Testing freshness at the point of use achieves the stated
goal and actually closes the case.

## Publish state

`proposit-shared-0.64.0-explain-review-result-explainer.tgz` built in the package
root (the 0.63.0 tarball was removed). Still riding the unpublished core-4.0.0
window; nothing published, nothing pushed.
