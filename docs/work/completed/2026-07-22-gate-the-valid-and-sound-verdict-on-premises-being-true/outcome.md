# Outcome — Gate the Valid and Sound verdict on premises being true

Shipped as `@proposit/shared` **0.48.0** (not published — tarball only).

## Failing test first

Against unmodified `overlay.ts` with core 3.2.0 installed:

```
Test Files  1 failed (1)
     Tests  22 failed | 112 passed (134)
AssertionError: expected 'Valid and Sound' to be 'Indeterminate'
AssertionError: expected 'Vacuous' to be 'Indeterminate'
```

The 22 were exactly the right ones: every permutation with `conclusion=true` and
premises ∈ {false, null, undefined}, plus the cross-check and three named cases.

## The change

```ts
if (e.isCounterexample === true) return "Logically Invalid"
if (e.conclusionTrue === false) return "Failing"
// Soundness requires the supporting premises to be true. Unknown or absent
// is not true, so neither verdict below can be awarded on it.
if (e.allSupportingPremisesTrue !== true) return "Indeterminate"
…vacuous → "Vacuous"; conclusionTrue === true → "Valid and Sound"
```

`!== true` covers `null` and `undefined` identically. The
`conclusionTrue === false → "Failing"` check moved above the vacuity block — no
behavior change (vacuity already required `conclusionTrue === true`), it just
makes the whole thing read as one ordered ladder.

**No schema edit**, as planning predicted:
`TReviewResult.evaluation` is `TCoreArgumentEvaluationResultSchema`, which
already declared `allSupportingPremisesTrue`. The value was on the wire and
persisted the whole time; `verdictOf` simply never read it.

`buildInlineReviewOverlay`'s `grade: gradeEvaluation(result).grade` needed no
change — it delegates to core, which carries the same gate at 3.2.0.

## Agreement with core, asserted

All 128 permutations (premises × conclusion × counterexample over
true/false/null/undefined, × vacuous/non-vacuous), holding `ok: true` and
`isAdmissibleAssignment: true`. The two vocabularies are not one-to-one, so the
test maps grade → verdict. **Zero disagreements.**

### One documented divergence, on unreachable input

`isCounterexample === true` combined with `allSupportingPremisesTrue !== true`
or `conclusionTrue !== false` is incoherent — core defines a counterexample as
"constraints satisfied ∧ all supporting true ∧ conclusion false", so no real
evaluation can produce it. On such input core answers `unsound` (it checks
unsound before counterexample) while `verdictOf` answers "Logically Invalid"
(counterexample first).

The test still exercises `verdictOf` on those inputs but skips the cross-check,
with a comment saying why. Left as-is rather than reordering `verdictOf` to
match core's precedence exactly: reordering would change behavior on inputs that
cannot occur, to satisfy a test rather than a user. Flag if the exact-mirror
property is wanted for its own sake.

## Verification

`pnpm run check` exit 0 in the worktree against the real core 3.2.0 tarball
(installed via a temporary `file:` dev dep, reverted before committing):
typecheck, prettier, eslint, 980 tests, build.

On `main` after merge, the cross-check test **fails against core 3.1.0**, which
is correct — 3.1.0 predates the gate. Re-verified on `main` with a temporary
`pnpm.overrides` mapping core to the 3.2.0 tarball: **980/980 pass**.
`package.json` is left at the true post-publish state (`^3.2.0` peer + dev) with
no overrides committed, so `pnpm install` will resolve properly the moment core
3.2.0 is published, and the local failure until then is expected, not a defect.

## Release

Version **0.48.0**. `pnpm version`'s tag deleted (tagging triggers publish).
Tarball packed and moved out of the package root. `pnpm-lock.yaml` still records
core 3.1.0 and settles on the repin after core ships.

**Not published, not tagged.**
