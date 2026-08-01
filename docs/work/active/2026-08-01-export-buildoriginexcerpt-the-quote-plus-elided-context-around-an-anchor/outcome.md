# Outcome

Shipped in `e9aa491` (the function) and a follow-up exporting `originPassage`,
both folded into the **unpublished v0.56.0**.

## What landed

`src/engine/render/origin-excerpt.ts` — `buildOriginExcerpt`, exported from
`./engine/render` with its `TOriginExcerpt` type. Pipeline is
`clamp → slice → collapse → snap inward → flags → trim`, over a single
`buildCodePointIndex` so a 97,000-code-point document is scanned once rather than
three times.

## Two things the spec got righter than the design

**The word-boundary trim needed two guards, not one.** The spec already said not
to trim where the window reached the document's edge — otherwise the source
text's opening word disappears. Implementation added the second: don't trim where
the character just outside the window is whitespace either, because then the
window landed on a boundary and cut nothing. Without it the excerpt drops a whole
word for no reason roughly one time in six. Both branches have a test
(`keeps a whole word when the window lands on a word boundary` /
`drops the word the window cut in half`).

**Collapse before snap, not after.** The spec originally collapsed last, which
would have left the trim hunting through `\n\n   ` runs for "the first
whitespace". Reordered so the trim only ever sees single spaces.

## Also exported: `originPassage`

Not in the original scope. The consumer needs the single-anchor renderer — it
holds an anchor, not a snapshot — and the only other way in was
`@proposit/shared/engine/render/markdown` through the `./engine/*` wildcard,
which v0.56.0's own changelog had already flagged as not a surface to depend on.
Exporting it properly is a smaller change than leaving the server with its
duplicate, which is now deleted.

## Tests

`src/engine/__tests__/origin-excerpt.test.ts`, 15 cases, one per acceptance
criterion plus the two trim branches. Three failed on first run and all three
were the **test's** arithmetic, not the function's: a fixture too short for a
60-code-point window to fall inside, an `indexOf`-based helper used on
astral-bearing text (UTF-16 indices where the function takes code points — the
exact confusion it exists to prevent), and an assertion that a well-formed
surrogate pair contains no surrogate code units. The astral fixtures now use a
code-point-aware helper, and the lone-surrogate assertion is written as one.

Package: 1137 tests, `pnpm run check` clean.

## Consumer verification

Verified in `proposit-server` against a real curated argument ("On Liberty", 23
anchors) through a `file:` tarball: the excerpt renders with context either side
and a leading ellipsis, and its own 41 unit tests plus the full 143-test e2e
suite pass.

## Not done here

Publishing. 0.56.0 is built, tagged and packed; the server holds the tarball.
`proposit-mobile` has not adopted `buildOriginExcerpt` — it exists here rather
than in the server precisely so it can, later.
