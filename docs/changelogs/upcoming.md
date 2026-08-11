# Changelog — upcoming

<changes starting-hash="c8243c2" ending-hash="HEAD">

## Changed

**`ARGUMENT_OUTCOME_LABELS` shortened to chip-width wording.**
`"Reaches its conclusion"` → `"Reaches"`, `"Doesn't reach its conclusion"` →
`"Falls short"`, `"Its premises contradict each other"` → `"Contradictory"`.
Both clients render these in a small chip next to a one-word conclusion value,
and the sentence form had to be truncated or wrapped on every surface that drew
it.

The constraints on the new strings are documented on the map itself, because
two of the obvious short candidates are wrong rather than merely worse.
"Acceptable" borrows the reader's own accept/reject vocabulary, which
`TStruckBadges` reports beside the outcome — it would produce
`Acceptable · 1 premise rejected`, contradicting itself over a state
`composeArgument` deliberately allows. "Valid" is a term of art about form
regardless of premise truth, which is a different question (and one the app
answers separately); the existing "no proof language" test bars it mechanically.
"Unreachable" would report the commonest reason for `does-not-reach` — not
enough settled, which the reader can change — as a property of the argument.

**Worked-example results now reference the label map** instead of repeating it.
The four `result` fields in `ARGUMENT_EXPLAINERS` restated the outcome wording
as literals, so an explainer could teach a label the chip no longer used; the
field is documented as "the assessment label this example comes out to", and it
now is one.

**`warning` is an orange rather than a mustard**, light and dark:
`#b08a2c` → `#b9682a` (light fill), `#826621` → `#8f5120` (light as-text),
`#d9b84c` → `#dd9750` (dark fill), `#d9b84c` → `#e8a869` (dark as-text). Every
consumer of the token repaints; `argumentUnpublished` and `nodeWarning` are
separate tokens and stay amber.

`warningAsText` splits from the fill in dark mode, which previously reused it.
An orange sits lower in luminance than a mustard at the same lightness, and the
fill measures 4.36:1 on the lightest ground it can be read on (a selected claim
card in the web app), under the 4.5:1 body-text floor. `destructive` already
splits for the same reason. As text the new values clear AA on every measured
ground: 5.23:1 light and 5.18:1 dark at worst, against 4.55:1 and 5.52:1 before.

The light fill also improves the pairing it carries: white on `warning`
measures 4.14:1, up from 3.22:1 — still short of AA, which is why both clients
draw the "falls short" chip outlined rather than filled.

</changes>
