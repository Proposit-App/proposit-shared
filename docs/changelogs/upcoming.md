# Changelog — upcoming

<changes starting-hash="877234b" ending-hash="HEAD">

## Added

- **Curated claims can declare axiomatic support** — `CuratedClaim` gains an
  optional `axiom` field (`src/fixtures/curated-argument/index.ts`), mirrored as
  `Type.Optional(AxiomKindSchema)` on the YAML contract
  (`src/fixtures/argument-yaml/schema.ts`). The kind is declared on the supported
  claim rather than as a second claim entry: an axiomatic claim carries no prose
  of its own, and the `IMPLIES(axiom, Q)` derivation tree that attaches it is
  synthesized by `populateDerivationFromAxiom`. A claim that declares nothing
  emits no key at all, so its YAML is byte-identical to before.

    `lowerArgumentToCurated` (`src/fixtures/argument-yaml/lower.ts`) no longer
    discards the support on the way back out: an axiomatic claim sitting as a
    derivation premise's antecedent has its kind carried onto the claim that
    premise derives (`derivedClaimId`), while the axiomatic claim's own
    claim-bound variable — like every derivation-only variable — still never
    becomes a curated claim.

    `curatedArgumentContentDigest` (`src/fixtures/argument-yaml/digest.ts`)
    hashes the kind last in the per-claim projection. `JSON.stringify` omits the
    key when it is `undefined`, so an argument with no declared support hashes
    exactly as it did before the field existed (frozen in a test), while
    changing a kind changes the digest and therefore registers as drift for a
    consumer reconciling against a published copy.

## Changed

- **All 28 premise titles in the four curated argument fixtures rewritten by
  hand** (`src/fixtures/historical-figures/historical-figures-{socrates,madison,mill,singer}/*.argument.yaml`):
  Socrates 5, Madison 11, Mill 6, Singer 6. Each title was a lossless
  restatement of the premise's own claims — the same rows a consumer renders
  underneath it — and is now a short noun phrase naming the inferential move
  (e.g. `Limits of the crowd's power`, `Two paths from an incurable cause`,
  `Extending the principle beyond the law`). Claim titles remain sentences
  asserting a proposition; the grammatical split is what keeps a premise title
  from collapsing back into a restatement of its consequent claim.

    Hand-authored, not regenerated: `claims`, `tree`, `role`, `description`, and
    `provenance` are byte-identical. Retitling does not make it a new pipeline
    run.

    `curatedArgumentContentDigest` hashes `premise.title`
    (`src/fixtures/argument-yaml/digest.ts`), so the content digest of all four
    curated arguments changes and consumers reconciling against a published copy
    will see drift and republish.

- **`src/fixtures/historical-figures/content.generated.ts` regenerated** by
  `pnpm run gen:fixtures` to pick up the new titles. Title strings only.

## Fixed

- **`composeArgumentDiff` now reports a premise `title` change**
  (`src/engine/diff.ts`). `title` is application-level display text and is
  deliberately excluded from the premise checksum (`src/checksum.ts` leaves
  `premiseFields` at core's default), so `@proposit/proposit-core`'s structural
  diff cannot see it — a version whose only edit was premise titles composed to
  an entirely empty diff. The composition now compares titles across the
  caller-supplied `premisesBefore` / `premisesAfter` arrays and emits the
  premise under `premises.modified` with state `modified-own` and a
  `{ field: "title" }` entry in `changes`, which `buildDiffRenderMaps` renders
  as the `origin` cue.

    A premise core already reported as modified absorbs the title change rather
    than producing a second entry, and a `modified-within` premise is promoted
    to `modified-own` when its own title moved. Derivation premises stay
    filtered out, and absent / `null` / `""` titles compare equal so they never
    register as an edit.

</changes>
