# Changelog — upcoming

<changes starting-hash="5223fb4" ending-hash="HEAD">

Follow-up to v0.62.0, from a review of that branch. Five defects that reach a
reader, two that lose their data, and one new core field adopted.

## Fixed

- **The conclusion axis claimed a non-`true` value "holds".**
  `composeConclusion` pushed `CONCLUSION_REACHED_STATEMENT` or, in its `else`,
  `CONCLUSION_ONLY_ASSERTED_STATEMENT` off `conclusionAttribution` alone. Core
  defines `reachedWithoutAssertion` as "the conclusion premise root still comes
  back **true**", so it is necessarily `false` for every other value and the
  `else` fired unconditionally: `{ cA: true, cB: false }` on
  `buildEngineWithTwoPremises` produced `Conclusion: False You assigned this. It
holds only because you assigned it.` Both statements are claims about a value
  that holds and are now gated on `value === "true"`.

- **`conclusion-came-from-you` fired for a conclusion that came out false.**
  `reasonFor` tested only `assertedByReader`, which core defines as "the reader
  supplied a value for at least one claim the conclusion premise references" —
  not "supplied the conclusion's value". Same input as above rendered
  `Doesn't reach its conclusion — the conclusion came from you` beside a
  conclusion labelled **False**, under a definition opening "The conclusion
  holds, but only because you assigned it". Now conditioned on the conclusion
  value being `"true"`; otherwise the reason falls through.

- **Contradiction detection never scanned the conclusion premise.**
  `detectContradictions` built its candidates from `supportingPremises` +
  `constraintPremises`; the conclusion premise lives on `evaluation.conclusion`.
  `buildOperatorQueue` offers that premise whenever it carries a decidable
  operator, so the reader is invited to accept the very step that can collide —
  and accepting `pConclusion` under `{ cA: true, cB: false }` gave
  `conclusionTrue: "contested"` with
  `reviewCoherence() → { state: "coherent", blocksCompletion: false }`. The
  byte-identical collision one premise down blocks the review, so the only
  unblocked route to a contested conclusion was the one with no alert, no
  provenance and no exits, completing as `done`. `evaluation.conclusion` is now
  a candidate; nothing else in `buildContradiction` needed to change.

- **A restored `blocked` review flipped to `done` without being re-evaluated.**
  `resultsPhase()` read `lastCoherence`, which only `runEvaluation` sets, so a
  draft rehydrated at `phase: "blocked"` started `undefined` and every route to
  the results step — `jumpToResults`, `advanceStep`, the edit-and-return path —
  opened the gate. A page reload defeated it. `resultsPhase()` now fails closed
  against `blockedBeforeThisSession`, seeded from the hydrated draft in the
  constructor and in `reloadFromStore`, and cleared by `runEvaluation`.
  `reloadFromStore` also drops `lastCoherence`, which described a draft that is
  no longer loaded. Mirror bug: `clear()` reset neither, so a brand-new empty
  review inherited the previous one's block — both are reset there now.

- **The `premises-hold-conclusion-does-not-follow` worked example drew the
  contested collision.** Conclusion false, operator **accepted**, child true is
  structurally identical to `CONCLUSION_EXPLAINERS.contested`'s own example
  under the confluent closure, and on the equivalent real shape gives
  `premisesHoldConclusionFalse: false` with the coherence gate blocking. The
  accepted step is gone: the example now shows a supporting premise standing
  true beside a false conclusion with no granted step between them, which is
  what the outcome is.

- **Same entry: the definition read as a verdict on entailment.** "This is what
  a counterexample looks like from the inside" and "the argument's form does not
  carry its content" state the stronger claim `checkValidity` answers. Core is
  explicit that `premisesHoldConclusionFalse` is "a reader-relative gap under
  one assignment — **not** a countermodel to entailment". Reworded, and the two
  formal-fallacy references swapped for the logical-consequence and
  validity/soundness ones already defined in the module.

- **`does-not-reach:conclusion-came-from-you` allocated fault.** "the argument
  asserts its conclusion rather than supporting it" breaks this module's
  standing rule and is contradicted by the entry's own worked example, which
  shows an argument that does offer a reason the reader left unsettled.
  Reworded to describe what follows from the reader's values.

- **`LocalStorageReviewStore.load` destroyed reviews two ways.** The
  `await this.save(...)` after a migration sat inside the `try`, so a write
  failure (quota, Safari private mode) was caught by the corrupted-blob branch
  and `clear(key)` deleted a review that had decoded perfectly — the save is now
  outside the `try` and its failure is not treated as corruption. And any decode
  failure anywhere in the optional `lastResult` mirror discarded `draft`, the
  reader's irreplaceable work, even though `{ draft, lastResult: undefined }` is
  a valid `TReviewState`; `decodeDraftOnly` now salvages the draft before the
  blob is written off.

## Changed

- **Adopted core's `contestedVariableIds`.** `TReviewCoherence` carries it, and
  a non-empty list blocks completion on its own. It is not derivable from
  `contradictions`: the forward rule transfers only the told-true component, so
  a contested variable can yield an uncontested `true` downstream and leave
  every aggregate — conclusion, admissibility, satisfiability, struck premises —
  reading clean, with no contested premise root for any premise-level test to
  find. The field is sorted, always present when `ok`, and not gated behind
  `includeDiagnostics`.

- The `@proposit/proposit-core` devDependency is a **relative** tarball path
  again (`file:../proposit-core/…`) rather than an absolute one under a
  developer's home directory. Repin to `^4.0.0` when core publishes.

</changes>
