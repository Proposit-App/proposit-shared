# Changelog — upcoming

## Added

- `originPassagesFor(snapshot, targetId)` is exported from
  `@proposit/shared/engine/render`. It returns the quoted origin passages one
  target of an argument was written from — `Based on origin text "…"`, with the
  source text's whitespace collapsed — and `[]` whenever there is no origin
  data. Previously module-private to `src/engine/render/markdown.ts`, which
  meant every reading surface showing a passage on screen carried its own copy
  of the lead-in and the collapsing, kept in step by nothing but a comment.
  `snapshot` is typed `Pick<TProjectReactiveSnapshot, "origin"> | undefined`, so
  a caller holding a partial snapshot, or none, needs no wrapper. No new
  `exports` subpath — `./engine/render` already existed.
- `serializeArgumentToMarkdown` states the author's fidelity claim when the
  argument's origin link carries stance `representation`: the header blockquote
  gains the line `The author says this argument represents that text faithfully.`,
  after the passage and attribution lines. Guarded on the origin _document_, not
  just the link, so a claim about a source the export never names cannot
  render.

## Changed

- `originPassage` and `anchorsFor` in `src/engine/render/markdown.ts` are
  replaced by the exported `originPassagesFor` at both call sites. Behaviour
  preserving; the export goldens are unchanged by the extraction.

## Notes

- The markdown export is byte-identical to v0.55.0 for every argument that does
  not carry a `representation` origin link — verified against the pre-change
  renderer for four shapes: no origin slice at all, an empty slice, a link that
  survived without its document, and a full document with anchors under stance
  `seed`, which emits nothing extra by design.
- Purely additive. `serializeArgumentToMarkdown`'s signature is unchanged and
  `originPassagesFor` is a new named export on an existing subpath, so nothing
  breaks on repinning.
