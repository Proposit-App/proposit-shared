# Outcome

Fixed in `ffd6db3`, folded into the unpublished **v0.56.0** (that version was cut
and tagged locally but never published, so the tag moved rather than a 0.56.1
being cut).

## What changed

One line in `markableContent` (`src/engine/origin-derivation.ts`):

```ts
for (const premiseSnapshot of Object.values(snapshot.premises)) {
    if (premiseSnapshot.premise.type === "derivation") continue
```

Skipping the derivation premise whole handles both halves of the bug at once —
the titleless phantom premise **and** the shadow claim-bound expression, which
lives inside that premise as its consequent. `buildTextTree` already skipped
derivation premises the same way, so this is the established shape rather than a
new rule. Both `deriveEnthymemeSuggestions` and `deriveEnthymemeContradictions`
read the generator, so the contradiction path is fixed by the same edit.

## Tests

`src/engine/__tests__/origin-derivation.test.ts` gains a
`engine-synthesized derivation premises` block, backed by a new
`addDerivationPremise()` in `origin-fixtures.ts` that builds the real shape via
`mutateCreateDerivationPremise` in **adopt** mode — so the derivation's consequent
expression binds the same claim-bound variable the authored expression does,
which is what the persisted model does and what made the walk double-count.

Three of the four new tests failed before the fix:

- neither the derivation premise nor its consequent is suggested
- a claim is suggested once, not once per expression bound to it
- anchoring and marking the authored expression silences the claim entirely
- every derived target names content present in the authored snapshot

Suite: 527 engine tests, 1122 across the package, `pnpm run check` clean.

## Consumer verification

Verified live in `proposit-server` against the QA database the finding came
from, via a `file:` tarball install of 0.56.0. On argument
`019fbdcd-12b8-74ee-aa8c-4690bcab2eb3/1` — the one measured in the report — the
suggestion panel went from **5 rows to 2**: one for the author's own untitled
conclusion premise, one for the single unanchored claim. The claim that is both
marked and anchored is absent from the suggestions and present once as a
contradiction, which is criteria 3 and 4 met.

Note the argument still carries a stray `enthymeme = true` on the
derivation-premise expression `019fbdce-f7bd…`, written by the QA session before
the fix. It is now inert — nothing walks it — but pre-existing data of that shape
exists in the wild and stays invisible rather than being cleaned up.

## Not done here

Publishing. `@proposit/shared` 0.56.0 is built, tagged and packed; the server is
pinned at the tarball pending the npm release, and `proposit-mobile` still needs
its repin afterwards.
