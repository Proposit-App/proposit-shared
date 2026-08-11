# Changelog — upcoming

<changes starting-hash="f4d303e" ending-hash="HEAD">

## Added

**`@proposit/shared/ui/argument/review/consts` — the review surface's copy.**
Re-exports the engine-owned `CONCLUSION_VALUE_LABELS` and
`ARGUMENT_OUTCOME_LABELS` so a client has one import site, and adds
`REVIEW_PILL_LABELS` (`Record<TAssignmentPill, string>` — the engine's three
truth words plus `"Skipped"`), `REVIEW_PROVENANCE_TOOLTIPS`
(`Record<TAssignmentProvenance, string>`), `REVIEW_DEFAULT_VALUE_ORIGIN`,
`REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP` and `REVIEW_STANCE_LABELS`. The engine
constants are re-exported rather than moved: importing them from `ui/` would
point `engine/` at the UI layer.

Both clients declared these strings independently, over the same shared types —
`PROVENANCE_TOOLTIP` was a `Record<TAssignmentProvenance, string>` in each, with
the same `user` value and a different `default` one. Two wording divergences are
resolved in the shared value: the default-origin sentence ends
`"claims the argument still has to reach start unknown"` (the web app's
`"still awaiting support"` collided with the stance word and with the engine's
own `reaches-conclusion` vocabulary), and the composed tooltip reads as one
sentence — `"Default — derived from …"`, not `"Default — Derived from …"`.

`REVIEW_DEFAULT_VALUE_ORIGIN` (the fragment, opening a sentence) and
`REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP` (the whole tooltip) are both exported
because the web app interpolates the fragment at a second call site; they share
one copy of the words, differing only in the first letter.

**`@proposit/shared/ui/argument/review/icons` — `REVIEW_ICON_NAMES` and
`TReviewIconName`.** Names only, no components and no glyphs: the clients draw
from incompatible sources, so what they share is the vocabulary. Each declares
its own review-scoped map `satisfies Record<TReviewIconName, …>`, which makes an
unmapped name a compile error there. Starts at the two assessment-axis marks —
the only review concept both clients draw today — and grows by adding a name,
which is then a compile error in both repos until both map it.

No `package.json` change: `"./ui/*"` already spans `/`, the same way
`"./engine/*"` serves `@proposit/shared/engine/review/assessment` today. Neither
module is added to `src/ui/index.ts`, which the web app re-exports wholesale.

</changes>
