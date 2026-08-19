# Changelog — upcoming

## Fixed

**`does-not-reach` no longer prescribes a remedy the reader has already
performed.** `conclusion-came-from-you` fired on one trigger covering two
materially different situations whose advice is opposite: a reader whose
answers can still move the finding, and a reader who has answered everything
and cannot. Only the first was described, so a reader who answered true to
every claim and accepted every premise was told the argument's reasons were
"still waiting on claims you left open" and sent back to settle them.

`TArgumentReason` gains
`"conclusion-came-from-you-nothing-left-to-settle"` for the second case, with
its own `ARGUMENT_REASON_TEXT` entry and its own
`does-not-reach:conclusion-came-from-you-nothing-left-to-settle` explainer. The
new explanation states what the assessment established and stops there — it
names no cause the reader could act on, because there is none.

The discriminator cannot be read off the evaluation. A persisted claim binds two
variables — an authored one plus an engine-synthesized derivation one — and the
synthesized variable reports `{ value: null, origin: "unassigned" }` whenever
the reader has not granted that derivation's step, though no reader can ever
answer it; scanning `variableProvenance` would therefore classify the reader
this fix is for as the reader it is not. `composeAssessment` instead takes an
optional `TAssessmentOptions` with `unsettledAnswerableClaimIds`, and the new
reason fires only when that array is present and empty. Absent means the caller
could not tell, which selects the existing reason — the safe direction, since
telling a reader with claims outstanding that nothing is left is the worse of
the two errors. An explicit unknown and a skip both count as outstanding: either
can still be changed to a definite value.

Three call sites supply the set. `ReviewEngine.getState()` filters its claim
queue against `draft.claimAssignments`. `buildReviewOverlay` does the same
against `buildClaimQueue(argEngine)`, and passes nothing when there is no draft
to read. `buildInlineReviewOverlay` filters the same queue against the effective
values it already computes, where a contested value counts as decided rather
than outstanding.

## Changed

**The five `does-not-reach` explanations rewritten in one voice.** Three
wordings could not be resolved from the reader's side and are gone: "withhold
that one input" never said which input, "nothing here gets to it" was unclear on
both halves, and chains of bare "it"s left the referent to guess.
`CONCLUSION_ONLY_ASSERTED_STATEMENT` now reads "The conclusion holds only
because you assigned it." rather than opening on a pronoun that had to be
resolved against whichever statement preceded it.

`explainer.test.ts` now asserts the module-wide constraints over the exported
records rather than the file text: no proof language anywhere, no grading or
accept/reject vocabulary in `ARGUMENT_OUTCOME_LABELS`, and no remedy wording in
the entry for the reader who has nothing outstanding.
