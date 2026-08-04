# Outcome — Quote origin passages in the markdown export

## What shipped

`serializeArgumentToMarkdown` (`src/engine/render/markdown.ts`) now renders
origin anchors off `snapshot.origin`. Three additions to the function, no new
export, no signature change:

- `ORIGIN_LEAD` + `originPassage(anchor)` — the single source of the phrase
  `Based on origin text "…"`. Collapses whitespace so a passage spanning lines in
  the source text stays on one markdown line. Renders no offsets.
- `anchorsFor(snapshot, targetId)` — optional-chained through `origin`, because a
  snapshot rehydrated from wire data predating the slice omits it, as the golden
  fixture does.
- Three call sites: header blockquote (argument anchors), premise heading
  (premise anchors), nested bullet under the claim bullet (expression anchors).

The whole-argument line carries the document's `reference` via the existing
`getInlineSourceLabel`. A document with a reference but no argument-level anchor
still emits `> Based on origin text — {label}`, so passages quoted further down
are attributed to something.

Rendered shape, from the committed inline snapshot:

```markdown
# The golden argument

A worked example.

> Version 3 — Published on 2026-01-15
> Based on origin text "All men are mortal." — The Republic

## Logic

### Conclusion

- Q follows
    - Based on origin text "Therefore Socrates is mortal."
- _is true if_
- P is true

### Supporting premise — Ground

Based on origin text "Socrates is a man."

- P is true
```

(The nested bullet is indented two spaces in the actual output; the block above
is reflowed by the docs formatter.)

## Both presentation decisions, as specced

1. **Under the logic item, not the claim glossary.** Anchor `targetType` is
   `expression | premise | argument` — never `claim` — and `## Claims` is keyed
   by claim id, so attaching there would need an invented claim → expression
   mapping and would render wrong for a claim used in two differently-anchored
   premises. `buildTextTree` items already carry `premiseId` and `expressionId`,
   which are exactly the `anchors` keys. No new section.
2. **Whole-argument passage in the header blockquote**, beside the version line,
   with the source reference appended after an em dash. It is metadata about the
   argument, so it has no logic item to hang off.

## Tests

`src/engine/__tests__/derived-view.test.ts`, four added, written before the
implementation and watched fail (3 red for the right reason; the guard passed
from the start, which is its point):

- **the no-origin guard, written first** — a snapshot with an explicitly empty
  origin slice serializes identically to the bare golden, and the pre-existing
  inline snapshot for `goldenSnapshot()` (which has no `origin` key at all) is
  untouched and still passes.
- **anchored export** — an inline snapshot over `originGoldenSnapshot()`, which
  carries one anchor of each target type plus a structured document reference.
- **no offsets** — the three `Based on origin text` lines are asserted to match
  no digit at all, so `startCodePoint` cannot be reintroduced silently.
- **reference without a whole-argument anchor** — the header falls back to
  `> Based on origin text — The Republic`.

Fixtures added to `derived-view-goldens.ts`: `originGoldenSnapshot`,
`emptyOriginGoldenSnapshot`, `unanchoredOriginGoldenSnapshot`. The expression
anchor's passage spans a newline on purpose, so whitespace collapsing is proven
by the golden output rather than a separate test.

## Verification

`pnpm run check` — typecheck, prettier, eslint, 1090 tests in 115 files, build:
all pass. `tcw capabilities check` — `capabilities OK`.

## Capability

`arguments/copy-to-clipboard` (`cap-778431`) reworded to say the exported
document carries the quoted source passage beside anything linked to it.
Recorded in `capabilities.yaml` under `changed:` with the bare `arguments/…`
path form. Status stays `Missing` — this node produces the string; the surfaces
that let a user invoke the copy are server- and mobile-side.

## Deviations and incidental fixes

- `docs/capabilities/authoring/import-from-source/description.md` failed
  `prettier --check` on `*started*` vs `_started_`, left by the sibling slice, and
  blocked `pnpm run check`. Fixed with `prettier --write`; whitespace-equivalent,
  no wording change.
- Nothing in the request turned out wrong. The two decisions it left open were
  genuinely open; the third combination it does not mention — a referenced
  document with no argument-level anchor — was chosen here and recorded in the
  spec.

## Known gaps (accepted, in the spec's Risks)

- An anchor whose target is an **operator** expression renders nowhere:
  `TTextTreeItem`'s operator variant carries no `expressionId`. Exposing it is a
  separate request already filed against this node.
- An anchor on a **derivation** premise renders nowhere, because `buildTextTree`
  skips derivation premises. Matches what the text view shows.
- `serializeArgumentText` is unchanged: it takes a header + items pair rather
  than a snapshot, so it has no access to origin data.

## Not done, deliberately

No `pnpm version`, no tag, no publish, no push. The shared release covers this
slice and the sibling together and is coordinated at the workspace root.
