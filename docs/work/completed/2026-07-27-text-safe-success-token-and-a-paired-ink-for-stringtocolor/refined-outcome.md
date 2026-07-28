# Refined outcome

One round of local multi-model review (`bllm-review-many`, qwen25-coder + gemma4-26b) over the
implementation commit, with the deliberate decisions supplied as context so they would not be
re-litigated. Two findings applied, one rejected as false, the rest dismissed with reasons.

## Applied

**The test's contrast helper was unpinned** (qwen: "the correctness of the luminance calculation
should be verified"). The sweep asserts `contrastRatio(fill, ink) >= 4.5` using a *second copy* of
the WCAG formula living in the test file. That copy is what makes the sweep meaningful, and nothing
held it to the standard — a typo shared by both copies would have passed. Now anchored to published
values: white/black = 21:1, white/white = 1:1, `#777777` on white = 4.478:1, and the relative
luminance of pure red = 0.2126.

**The sweep only fed the hash ASCII** (both reviewers, as an edge-case gap). Display names are
user-supplied, so it now also covers accented Latin, Japanese, an emoji pair (surrogate pairs
through `charCodeAt`), and a 10,000-character name. All hold.

`9866bca`. Full `pnpm run check` re-run green: **997 tests / 102 files**.

## Rejected

**gemma4's only blocking finding is false.** It reported that `i` in `stringToColor`'s loops is an
implicit global that "will cause a reference error in strict mode". `let i` is declared four lines
above, alongside `let hash = 0` — pre-existing code the diff did not touch, and the reviewer read
the loop without its declaration. The repo compiles under `strict` TypeScript and the whole suite
passes; an implicit global would not survive either.

## Dismissed, with reasons

- **"Add unit tests for `relativeLuminance` and `inkFor`."** Both are module-private. The sweep
  exercises them through the public contract, which is the level the guarantee is stated at;
  testing private helpers directly would pin an implementation detail we want free to change.
- **"`relativeLuminance` is duplicated between source and test."** Deliberate, and now the point:
  a test that imported the source's own helper would be checking the code against itself. The
  duplicate copy is the independent check — which is exactly why it needed the pinning above.
- **"The `stringToColor` return-type change is a backward-compatibility risk."** Correct, and
  intended. Pre-1.0, one consumer in the workspace, a compile error rather than a silent change,
  documented with a one-line migration. Keeping a fill-only overload would leave the defective call
  shape reachable.
- **"`successAsText` is an API-surface change consumers must be aware of."** It is purely additive
  to an interface; nothing existing changes shape or value.
- **"Does the hash clump — do similar names get similar colours?"** Out of scope. The hash is
  untouched by this change and every fill is byte-identical to before; visual variety is a separate
  question from legibility, and nobody has reported it.
- **"How was WCAG compliance verified?"** Answered in `outcome.md`: an exhaustive sweep of the
  colour cube (worst pairing 4.582:1 at `#ae5d6c`) plus per-token ratios measured against every
  ground each token can land on.

## State

Nothing outstanding. Ready for closeout on approval — no version bump and no publish, both of which
are gated on consumer-side validation at the workspace root.
