# Changelog — upcoming

<changes starting-hash="877234b" ending-hash="HEAD">

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

</changes>
