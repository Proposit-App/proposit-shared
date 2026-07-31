# Quote origin passages in the markdown export

Epic: [Argument origin data and enthymeme annotations](tcw://W/proposit-app/2026-07-29-argument-origin-data-and-enthymeme-annotations)

Slice **J** of the epic. Ships in **one** `@proposit/shared` release together with
the sibling slice _Origin data schemas, mutations, and capability master_ (C).

**Blocked by:** slice C — this reads origin data off the reactive snapshot that C
adds. Do not start it first. _(Resolved: C landed on the `origin-data-schemas`
branch at status `review`.)_

---

## Problem

An exported argument loses the connection to the text it came from. A reader
handed the markdown cannot tell which passage any claim derives from.

## What changes

One function: `serializeArgumentToMarkdown` (`src/engine/render/markdown.ts:15`).
It is already pure, runtime-agnostic, and reads only the reactive snapshot — so
once slice C puts origin data on the snapshot, this change serves web and mobile
from one edit.

For each anchored item, emit the passage inline, phrased:

```
Based on origin text "{original text passage here}"
```

**No character offsets — deliberate, not an oversight.** The passage is quoted;
a reader who wants its location searches the original text for it. Do not add
`start`/`end` "for completeness".

Open decisions left to this slice, since they are presentation, not contract:
where the line attaches (under the claim in `## Claims`, under the logic item, or
a new section), and how a whole-argument origin text with a citation is rendered
in the header. Follow the existing section idiom — `renderHeader` / `renderLogic`
/ `renderClaimGlossary` / `renderSources` — rather than inventing a new shape.

## Capability delta

`arguments/copy-to-clipboard` (`cap-778431`) — reword to say the export carries
the origin passage for anchored content. Record it in this item's
`capabilities.yaml` under `changed:`. This slice owns that rewording; slice C
does not.

## Verification

- `pnpm run check`.
- Golden test: an argument with anchors exports a `Based on origin text "…"` line
  per anchored item, and the output contains **no** digits-as-offsets pattern.
- An argument with no origin document exports byte-identically to today —
  the guard against a stray empty section.

## Documentation Sync (expected to fire)

- `docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md`.

## Consumer impact

- `proposit-mobile` — the read-only surface (slice H) consumes this export.

Both shared slices ship in **one** release, coordinated at the workspace root —
do not publish from this node.
