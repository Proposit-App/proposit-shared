---
date: 2026-07-22
---

# Release notes — upcoming

- An argument whose premises have not been proven no longer reports as "Valid
  and Sound". Soundness means the argument holds together _and_ its premises are
  true, so a review that leaves supporting premises Unknown now reads
  "Indeterminate" instead. The same gate applies to the "Vacuous" verdict.
- Nothing else about a verdict changes: a counterexample still reads "Logically
  Invalid", a false conclusion still reads "Failing", and an argument whose
  premises are all reviewed True still reads "Valid and Sound" (or "Vacuous").
- Verdicts are computed when a review is displayed, not stored, so already-saved
  reviews pick up the corrected verdict as soon as this version ships — there is
  nothing to migrate.
