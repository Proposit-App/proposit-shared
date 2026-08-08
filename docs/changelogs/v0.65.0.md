# Changelog — upcoming

<changes starting-hash="2a9868b" ending-hash="HEAD">

Third review pass over the contested-value branch. One defect, three fixes
worth having, two nits.

## Fixed

- **`setOperatorAssignment` still recorded the rejection v0.64.0 was cut to
  remove.** The load path (`dropStaleAssignments`), the exits and the queue
  were all guarded; the **write** path was not, and it is reachable from
  shared's own public API. `{ cA: true, cB: false }` plus
  `setOperatorAssignment({ premiseId: "pConclusion", decision: "rejected" })`
  gave `phase: "done"`, `isReviewComplete: true`, `coherent`,
  `blocksCompletion: false` — where `accepted` on the same input gives
  `blocked` / `reader-resolvable`. Both gates went quiet at once: a rejected
  premise leaves `detectContradictions`' accepted set, and core never applies
  the forward rule through a rejected operator, so `contestedVariableIds` came
  back empty too. Only two unwritten client UIs stood between it and a user.

    The predicate lifted out of `dropStaleAssignments` into
    `isInertRejection`, called from both the write path and hydration. One rule,
    one definition — writing it twice is the shape that has produced several of
    the defects on this branch.

- **The snapshot could contradict itself.** Since v0.64.0, `blocked` can mean
  _not re-checked yet_ as well as _a finding blocked_, so a snapshot could carry
  `phase: "blocked"` beside `coherence.state: "coherent"` with no
  contradictions — and a client drawing the blocked screen from
  `coherence.contradictions` renders an empty dead end. `coherence` is now
  withheld from the snapshot whenever the result does not describe the draft, so
  `blocked` with no coherence means "re-evaluate", which clients already handle.
  One `freshCoherence()` predicate serves the gate and the snapshot, so the
  phase a reader is held at and the explanation shown cannot disagree.

- **The gate fired only on entry to the results step.** `setClaimValue`,
  `skipClaim` and `setOperatorAssignment` did not re-derive it, so an edit made
  while already at `done` left the phase alone and the debounced persist wrote a
  complete review over a collision nothing had evaluated. Reachable precisely
  because `change-assignment` exits carry `claimId`/`variableId` to invite an
  inline edit. The three material mutators now call `recordMaterialEdit()`,
  which stamps `updatedAt` and re-derives the phase when the reader is standing
  on the results step. Reason-only setters are deliberately excluded, matching
  `materialFingerprint`.

    `resultsPhase()` also counts a **stored** result that no longer describes
    the draft, not only this session's finding. Without that the mutator fix is
    inert for the commonest case there is: a finished review reopened later
    carries a result but no finding, so an edit had nothing to compare against
    and left the review `done`.

- **`CONCLUSION_ASSERTED_STATEMENT` overclaimed.** Core sets the flag behind it
  when the reader answered _any_ claim the conclusion premise references, so on
  a conclusion `A → B`, answering `cA` and leaving `cB` unknown produced
  "Conclusion: Unknown — You assigned this." for a value nobody assigned. Now
  "Your answers contributed to this.", matching the explainer copy corrected in
  v0.64.0. The gated sibling is unchanged — it only appears beside a `true`
  conclusion, where it reads correctly.

- `materialFingerprint` called `operatorAssignmentKey` instead of re-deriving
  the key inline. The two agreed, but the completion gate now turns on whether
  two drafts hash the same, so a second copy of the identity rule would decide
  whether a reader is held at the gate.

- `contradiction.test.ts`'s "still offers rejection on a premise core does
  strike" asserted through `Array.every`, which passes on an empty array.
  Non-empty assertion added.

</changes>
