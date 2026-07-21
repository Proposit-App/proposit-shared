# Review overlay: resolve override/reaction/default provenance + inline-review capabilities

Layer 2 of the cross-repo epic **usage-based default variable assignments +
inline T/F/U review in the argument text view**.

- Initiative: `2026-07-21-usage-based-default-assignments-and-inline-t-f-u-review-cross-repo`
- Layer 1 (`proposit-core` v3.1.0): DONE — ships `deriveDefaultAssignment()`,
  `evaluateWithDefaults()`, `getVariableIdForClaim` / `getClaimIdForVariable`,
  and `gradeEvaluation()` / `TCoreEvaluationGrade`.
- Authoritative design: the seed item's `spec.md`, **Layer 2** section, in the
  core repo:
  `proposit-core/docs/work/active/2026-07-21-usage-based-default-variable-assignments-and-inline-t-f-u-review-in-the-argument-text-view/spec.md`

## Ask

Give `@proposit/shared` a runtime-agnostic resolver that merges core defaults,
the user's claim reactions, and in-review overrides into a per-claim effective
T/F/U assignment plus a `"user" | "default"` provenance, self-evaluates the
merged assignment (operators accepted) for the propagated `unknown → true`
per-claim values and the argument grade, and declares the master inline-review
product capabilities that `proposit-server` + `proposit-mobile` federate from.
