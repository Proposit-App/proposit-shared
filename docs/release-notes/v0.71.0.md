# Release notes — upcoming

## `TArgumentReason` gains a fifth member

`@proposit/shared/engine/review/assessment` exports one more reason an argument
can fall short: `"conclusion-came-from-you-nothing-left-to-settle"`. It splits
the old `"conclusion-came-from-you"` in two.

The two describe the same finding — the conclusion holds because the reader
supplied it — but their advice is opposite. The existing member now means only
what its explanation always described: the argument's reasons are still waiting
on claims the reader left open, so answering those claims can move the outcome.
The new member is for the reader who has answered everything and still gets the
same verdict; nothing further is outstanding for them, and the explanation says
so rather than sending them back to settle claims they have already settled.

`ARGUMENT_REASON_TEXT` and `ARGUMENT_EXPLAINERS` both carry an entry for it
(`"does-not-reach:conclusion-came-from-you-nothing-left-to-settle"`), so
anything that renders `reasonText` or looks the explainer up by
`argumentExplainerKey()` picks it up with no change.

**Neither app needs a source change.** Both render `reasonText` verbatim and key
their lookup records by `outcome`, not by `reason`. A consumer that switches
exhaustively on `TArgumentReason` gains a new case and will fail to compile
until it handles it — that is the intended signal, since the two members must
not share a screen.

## `composeAssessment` takes an optional second argument

```ts
composeAssessment(
    evaluation: TCoreArgumentEvaluationResult | undefined,
    options?: TAssessmentOptions
): TReviewAssessment | undefined
```

`TAssessmentOptions` is newly exported from the same module and carries one
field, `unsettledAnswerableClaimIds?: readonly string[]` — the claims the reader
could have answered and left unsettled. The new reason fires only when that
array is **present and empty**; absent means the caller could not tell, which is
not the same as nothing being outstanding and keeps the existing reason. Every
existing call compiles and behaves exactly as before.

Do not try to derive the set from `evaluation.variableProvenance`. A persisted
claim binds two variables — an authored one plus an engine-synthesized
derivation one — and the synthesized variable reports itself unassigned whenever
its derivation's step is ungranted, even though the reader answered every claim
they can see and can never answer that variable. Provenance would classify a
reader with nothing outstanding as one with claims still open, which is the bug
this release fixes. Supply the set from your own record of what the reader was
asked and what they answered; an explicit unknown and a skipped claim both count
as outstanding.

## `unsettledAnswerableClaimIds` — build the set with this, not by hand

`@proposit/shared/engine/review/step-queue` exports the predicate, so a consumer
that composes its own assessment does not hand-copy it:

```ts
import {
    buildClaimQueue,
    unsettledAnswerableClaimIds,
} from "@proposit/shared/engine/review/step-queue"
import { composeAssessment } from "@proposit/shared/engine/review/assessment"

composeAssessment(evaluation, {
    unsettledAnswerableClaimIds: unsettledAnswerableClaimIds(
        buildClaimQueue(engine),
        draft.claimAssignments
    ),
})
```

```ts
unsettledAnswerableClaimIds(
    claimQueue: readonly UUID[],
    claimAssignments: Record<UUID, TClaimAssignment>
): UUID[]
```

The queue bounds the answer: `buildClaimQueue` is the set of claims a reader is
actually asked about, so an assignment outside it is not evidence about this
reader, and a queued claim with no assignment is one they never reached. A skip
and an explicit unknown both come back as outstanding.

**Any surface that composes its own assessment needs this call, not just the
ones that render the chip.** Passing the options at the render site does
nothing if the `composeAssessment` upstream of it was called bare — the reason
is fixed by then. Check every `composeAssessment` call, not every render.

The call sites inside this package already do so: `ReviewEngine.getState()` and
`buildReviewOverlay` (which passes nothing when there is no draft to read).
`buildInlineReviewOverlay` is deliberately not one of them — it has no draft,
and its own predicate treats a contested value as decided rather than
outstanding, which is a different question.

## Six user-visible strings changed

`CONCLUSION_ONLY_ASSERTED_STATEMENT` now reads "The conclusion holds only
because you assigned it." — it opened on a bare "It" that had to be resolved
against whichever attribution statement preceded it. Both apps import the
constant rather than the literal, so nothing breaks; a snapshot or a test that
hardcodes the old sentence will need updating.

The five `does-not-reach` explainer definitions are rewritten in one voice.
Three wordings a reader could not resolve are gone — "withhold that one input"
never said which input, "nothing here gets to it" was unclear on both halves,
and dense chains of "it" left referents to guess.

Both attribution explanations also stop claiming the reader answered the
conclusion itself. `assertedByReader` is set when the reader supplied a value
for any claim the conclusion premise references, so "because you answered it
yourself" was false for a reader who answered only an antecedent. Both entries
now open "because of answers you supplied". If you assert on this copy, that is
the phrase to expect.

## Repinning

Nothing to change in either app. `TArgumentReason` gaining a member is breaking
only for a consumer that switches exhaustively on it, and neither
`proposit-server` nor `proposit-mobile` does — both render `reasonText`
verbatim and key their explainer and icon records by `outcome`. If you have a
branch that added such a switch, handle
`"conclusion-came-from-you-nothing-left-to-settle"` as its own case rather than
folding it into `"conclusion-came-from-you"`; the whole point of the split is
that the two must not show the same text.

To get the new reason at a call site of your own, pass
`unsettledAnswerableClaimIds`. Leaving it off is a supported choice, not an
oversight — it keeps today's behaviour, and it is the right answer wherever you
cannot tell what the reader was asked.

A test that hardcodes the old `CONCLUSION_ONLY_ASSERTED_STATEMENT` sentence
("It holds only because you assigned it.") needs the new wording; importing the
constant avoids the problem entirely.
