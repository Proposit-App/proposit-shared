# Initial request

Shared owns the vocabulary a review result is reported with
(`src/engine/review/assessment.ts`). It does not yet own the material that
*explains* that vocabulary — the server's old explainer was keyed on grades that
no longer exist and was deleted with them.

Author the explanatory material here, as data, so both clients render one
vocabulary: a definition, a worked example in Proposit's own notation, and a
further-reading list per assessment key. Nine keys — three conclusion values,
six argument outcome/reason combinations. Plus the attribution statements, the
vacuous-inference note, and a helper that states a counterexample assignment in
the argument's own claim titles.

Shared has no React and compiles against `lib: ["ES2022"]`, so the material is
structured data only; each client draws it with its own primitives.

Parent epic spec: `/Users/brian/Projects/Proposit-App/docs/work/active/2026-08-08-explain-the-review-result-don-t-just-label-it/spec.md`
