# Spec — Quote origin passages in the markdown export

## Capability changes

**Changed:** `arguments/copy-to-clipboard` (`cap-778431`, Status `Missing`,
Feature `argument-browse`). Today its body reads:

> Copy an entire argument as a single formatted document — its title,
> description, logic, claims, and cited sources — for pasting elsewhere.

It has to say that the exported document also carries the passage of the
original source text that anchored content came from. Recorded in this item's
`capabilities.yaml` under `changed:` (bare `arguments/…` path form — a
`shared/…` prefix makes `tcw work complete` fail closed).

No new capabilities: the nine origin capabilities were declared by the sibling
slice (`2026-07-31-origin-data-schemas-mutations-and-capability-master`). Status
stays `Missing` — this node exports the string, the surfaces that let a user
_invoke_ the copy live in server and mobile.

## Problem

An exported argument loses the connection to the text it came from. A reader
handed the markdown cannot tell which passage any part of the argument derives
from. `serializeArgumentToMarkdown` (`src/engine/render/markdown.ts:15`) renders
header, `## Logic`, `## Claims`, and `## Sources` and never reads
`snapshot.origin`, which the sibling slice added at `src/engine/engine.ts:96`.

## Goals

- Every anchored part of the argument carries the phrase
  `Based on origin text "{passage}"` in the exported markdown.
- One edit serves both reading surfaces: the function is pure and
  runtime-agnostic (its doc comment at `src/engine/render/markdown.ts:5-14`), so
  web and mobile get this without a per-platform change.
- An argument with no origin data exports exactly what it exports today.

## Non-goals

- **No character offsets.** `TOriginAnchor` carries `startCodePoint` /
  `endCodePoint` (`src/schemas/model/origin.ts:62-68`); neither is rendered. The
  passage is quoted, so a reader who wants its location searches the source text
  for it. Offsets in a pasted document are noise a human cannot act on.
- No new export entry point, no options argument, no separate "origin" export.
- No rendering of the origin _document body_ — the export quotes anchored spans,
  not the whole source text.
- No change to `serializeArgumentText` (the plain-text export,
  `src/engine/render/text.ts`). It takes a header + items pair, not a snapshot,
  so it has no access to origin data; widening its signature is a separate call.
- No change to `buildTextTree`. Operators are the one anchorable target the text
  tree cannot address (see Risks).

## Design

### What origin data is available

`snapshot.origin` is `TProjectOriginData` (`src/engine/engine.ts:77-81`):

```ts
{ document: TOriginDocument | undefined
  link: TOriginLink | undefined
  anchors: Record<string, TOriginAnchor[]> }
```

`anchors` is keyed by `anchor.targetId`, and `targetType` is
`"expression" | "premise" | "argument"` (core's `OriginAnchorTargetTypeSchema`,
re-exported at `src/schemas/model/origin.ts:16`). `anchor.exact` is the quoted
passage. `document.reference` is an optional IEEE reference / unparsed citation
(`src/schemas/model/origin.ts:37-40`).

### Decision 1 — the passage attaches to the logic item, not the claim glossary

Anchors target **expressions, premises, and the argument** — never claims. The
`## Claims` glossary (`markdown.ts:112`) is keyed by claim id, so attaching there
would need an invented claim → expression mapping, and would render wrong when a
claim appears in two premises anchored to two different passages. `## Logic`
(`markdown.ts:50`) walks `buildTextTree`, whose `premise-header` items carry
`premiseId` and whose `claim` items carry `expressionId` — exactly the two keys
`anchors` is indexed by. So the passage attaches there, and a new section is not
needed.

Shapes, following the existing bullet/heading idiom of `renderLogic`:

- **expression anchor** → a nested bullet under the claim bullet, at the claim's
  own indent + one level. A plain continuation line would be lazily folded into
  the bullet's paragraph by every markdown renderer; a sub-bullet is the idiom
  already in the section and nests correctly.
- **premise anchor** → a paragraph line between the `###` premise heading and its
  bullets, where the heading's existing blank lines already leave room.

### Decision 2 — the whole-argument passage renders in the header blockquote

`renderHeader` (`markdown.ts:34`) already ends with a `>` blockquote line
carrying version + publication status. An argument-level anchor is metadata about
the argument as a whole, so it belongs in that same blockquote rather than in
`## Logic`, where it would have no item to hang off.

The document's optional `reference` is the citation for that source text. It is
rendered with the existing `getInlineSourceLabel`
(`src/engine/render/citation.ts:84`) — the repo's one inline-citation formatter,
already used for the `## Sources` list — appended after an em dash. One phrase
family covers all three combinations:

| origin data                          | header line                                    |
| ------------------------------------ | ---------------------------------------------- |
| argument anchor, no `reference`      | `> Based on origin text "…"`                   |
| argument anchor + `reference`        | `> Based on origin text "…" — Smith 2020`      |
| `reference` but no argument anchor   | `> Based on origin text — Smith 2020`          |
| no document                          | _(nothing — header unchanged)_                 |

The third row exists so an argument whose passages are all premise-level still
names the document they came from; without it the reader sees quoted passages
attributed to nothing.

### Passage normalization

`anchor.exact` is a slice of arbitrary source text and may span lines. Runs of
whitespace collapse to a single space so the passage stays on one markdown line.
Inner `"` characters are left as-is: escaping them would corrupt a quoted
passage, and markdown does not treat them specially.

### Defensive read

`snapshot.origin` is statically non-optional but is absent from hand-built and
pre-origin wire snapshots — the existing golden fixture
(`src/engine/__tests__/derived-view-goldens.ts:217`) has no `origin` key. The
lookup optional-chains through it, the same defense the file already applies to
`claim.citation` (`markdown.ts:85-94`).

## Acceptance criteria

1. `pnpm run check` passes.
2. A snapshot with an expression-level anchor exports a bullet whose text is
   exactly `Based on origin text "{anchor.exact}"`, nested one level under the
   claim bullet it anchors.
3. A snapshot with a premise-level anchor exports the same phrase as a paragraph
   line under that premise's `###` heading.
4. A snapshot with an argument-level anchor exports the phrase inside the header
   blockquote, with `— {getInlineSourceLabel(document.reference)}` appended when
   the document carries a reference.
5. A document with a `reference` but no argument-level anchor exports
   `> Based on origin text — {label}` in the header.
6. The full anchored-argument export contains no `startCodePoint` /
   `endCodePoint` value — asserted as "the added origin lines match no digit
   run".
7. A snapshot with no origin data (`origin` absent, or `document: undefined` with
   `anchors: {}`) exports a string byte-identical to today's inline snapshot in
   `src/engine/__tests__/derived-view.test.ts:153`.
8. A passage containing newlines exports on a single line.

## Risks

- **Operator anchors are unreachable.** `TTextTreeItem`'s `operator` variant
  (`src/engine/text-tree.ts:41-46`) carries no `expressionId`, so an anchor whose
  target is an operator expression silently renders nowhere. Exposing that id is
  already filed as a separate request against this node from the orchestrator
  ("expose an operator `expressionId` on `TTextTreeItem`"); this slice does not
  widen the text-tree contract for it. Accepted: the data is retained, only this
  one presentation is deferred.
- **Derivation premises are skipped** by `buildTextTree`
  (`src/engine/text-tree.ts:213`), so an anchor on a derivation premise renders
  nowhere. Same acceptance: no data loss, matches what the text view shows.
- **Snapshot churn.** Adding lines to the header changes the inline snapshot for
  any consumer golden that pins the export. Mitigated by criterion 7: with no
  origin data, output is unchanged, and no existing fixture carries origin data.

## Notes

- The item's `Blocked by: slice C` is satisfied: the sibling item is at status
  `review` on this branch and `snapshot.origin` is present.
- Documentation Sync fires on `docs/release-notes/upcoming.md` and
  `docs/changelogs/upcoming.md`.
