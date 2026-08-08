---
from: proposit-app
---

# Review taxonomy still names the deleted grade vocabulary



The capability master was updated for the two-axis assessment, but
`docs/taxonomy/review/**` was not, and it is a different axis (`tcw-taxonomy`).

Stale entries: `review` still reads "evaluation of an argument's *soundness* —
per-claim truth *verdicts* and per-*operator* accept/reject decisions";
`review/conclusion-verdict` still enumerates "Valid and Sound, Failing,
Logically Invalid, Vacuous, or Indeterminate"; `review/operator-assignment`
describes a decision per operator; `review/claim-assignment` says "truth verdict".

Two slugs are themselves dead vocabulary — `conclusion-verdict` and
`operator-assignment` — so renaming ripples into both consumers' `extends`.
That is why it was left out of the initiative rather than done hastily at the end.
`proposit-core`'s `argument-evaluation` feature is already correct.
