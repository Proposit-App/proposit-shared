# Outcome — Narrow the review claim queue to user-authored claims

Cut as **v0.59.1** (patch), tagged `v0.59.1` on branch
`fix/review-claim-queue-user-authored-claims`. Not published — the publish is
user-gated (NPM MFA) and runs after consumer-side validation.

## What changed

`buildClaimQueue` (`src/engine/review/step-queue.ts`) keeps only claims whose
bound claim resolves to `type === "normal"`, looked up through the engine's
claim library using the `claimVersion` the collector reports in `byId`. The
narrowing is documented on the function the way `buildOperatorQueue` documents
its own, including the caveat that queue length is not the argument's claim
count.

`@proposit/proposit-core` untouched, as the request specified —
`collectArgumentReferencedClaims` stays a general-purpose collector.

Capability `reviews/walk-through-and-decide-each-claim` (`cap-154720`) now says
which claims the walk covers. No status change.

## Test cases from the request

| # | Case | Where |
|---|---|---|
| 1 | Cited claim → queue holds the normal claim, not the source | `step-queue.test.ts` |
| 2 | Axiomatic claim bound to a variable → absent from the queue | `step-queue.test.ts` |
| 3 | Neither → queue unchanged | `step-queue.test.ts` |
| 4 | Conclusion-through-a-citation still decides | `evaluation.test.ts` |

Gate: `pnpm run check` — typecheck, lint, 1183 tests, build. All green.

## The evaluation question, answered

Case 4 was the one the epic said to settle before calling the narrowing safe.
It holds: `implies(unknown, true)` is true, so a derivation premise
`implies(citation_var, Q)` stands on the derived claim alone even with the
source unassigned. Verified on a fixture where the *only* path to the
conclusion runs through a cited claim, not just on a shape where the citation
sits off that path.

One combination does not settle — rejecting a sourced claim while the
conclusion holds gives `implies(unknown, false)` → unknown →
`allSupportingPremisesTrue === null` → "Indeterminate". Pinned by test and
**escalated as its own item** rather than grown into this slice, per the spec's
instruction. It is not a regression this slice introduced: the pre-fix path to a
decided verdict there ran through answering the blank card, and skipping it —
what a reviewer actually did — already produced the same `null`.

Escalated to the root as
`2026-08-06-rejecting-a-sourced-claim-leaves-soundness-undetermined`.

## Incidental fixes

Two review fixtures were structurally invalid and no assertion had looked. They
minted a second claim-bound variable for a claim that already had one; the mint
path removes the claim's existing variable, which cascaded away `pSupport`'s
child expressions and left its IMPLIES root childless
(`EXPR_CHILD_COUNT_INVALID`). Both now adopt the existing variable — the shape
production uses — and both pass `validateEvaluability()`.

`buildEngineWithCitationBackedDerivationPremise` also used a *normal* claim as
its citing source, which could not exercise a type-based gate. It is a real
`TCitationClaim` now, and the fixture gained an axiom-backed derivation premise
so both derivation-only claim types are covered.

`node_modules` was stale on this machine (core 3.2.0 against a `^3.4.0`
requirement), which failed 70 tests across 37 files with
`codePointLength is not a function` before any of this work. `pnpm install`
resolved it; no lockfile change.

## Consumer handoff

Tarball for consumer-side validation, built from this branch:

```
proposit-shared/proposit-shared-0.59.1-fix-review-claim-queue-user-authored-claims.tgz
```

Verified by content — `dist/engine/review/step-queue.js` carries the type gate,
not just the version string. Remove it from the package root before the publish
or `pnpm publish` fails with an EUSAGE "two package-specs" error.
