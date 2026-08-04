# Plan: `destructiveAsText`

Spec: [`spec.md`](./spec.md). Compressed — one additive token in one file, following a
convention already established three times over.

## Tasks

1. **Pick the two values.** Search for the nearest hue to the existing fill that clears
   4.5:1 on all three grounds of its own scheme; do not settle for "clears the page
   ground" — `muted` is the tightest of the three in both schemes.
   *Verified by:* recomputing all six ratios before writing them down.
2. **Add the token.** `destructiveAsText` in `TColorPalette` and in both palettes of
   `src/ui/colors.ts`, with the doc comment matching its siblings. Amend the file header
   comment, which currently claims dark `*AsText` is generally the fill itself, and add a
   comment at the dark value naming the 4.32:1 muted measurement that makes it an
   exception.
   *Verified by:* `pnpm run test` — the suffix-enumerating guard at
   `src/ui/__tests__/colors.test.ts:61` picks it up, and the key-parity test at :32 fails
   if only one palette gets it.
3. **Prove the guard actually reaches it.** Temporarily set both values to the raw fill,
   confirm the suite goes red naming `destructiveAsText`, then revert.
   *Verified by:* the red run. This is the task the spec's risk section exists for; the
   suite passing after step 2 does not distinguish "covered and passing" from "not
   covered".

No ordering risk: one file, additive, green at every boundary.

## Documentation Sync

`AGENTS.md` declares no Documentation Sync section, but this repo maintains
`docs/release-notes/` + `docs/changelogs/` per version and a token addition is a
consumer-visible API change.

4. **Changelog + release notes** entries for the release that carries the token, with the
   measured ratios in the changelog and the plain-language "destructive controls drawn as
   text now clear the contrast floor" framing in the release notes.

## Verification

The suite covers the whole claim — the acceptance criteria are contrast arithmetic, and
the test computes it. Nothing here needs a browser: this repo ships no UI, and the visual
check belongs to the consumer item that adopts the token.

Consumer adoption is out of scope and already tracked as
`proposit-server/2026-07-30-adopt-destructiveastext-and-bring-the-six-unfilled-error-controls-up-to-aa`,
recorded as a blocker on that item rather than as prose here.
