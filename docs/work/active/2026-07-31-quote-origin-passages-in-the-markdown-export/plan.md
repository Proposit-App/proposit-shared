# Plan — Quote origin passages in the markdown export

Small slice; planning detail is compressed per the request. Two files change:
`src/engine/render/markdown.ts` and `src/engine/__tests__/derived-view.test.ts`.
Fixtures for the anchored case go in `derived-view-goldens.ts` beside the
existing golden.

## 1. Tests first (red)

In `src/engine/__tests__/derived-view.test.ts`, inside the existing
`describe("engine/render")`:

1. **The no-origin guard, written first.** The existing
   `serializeArgumentToMarkdown — full markdown export` inline snapshot is that
   test: `goldenSnapshot()` carries no `origin` key. Leave its expected string
   untouched — if the change is over-eager the snapshot breaks, and that is the
   signal. Add one sibling assertion that a snapshot with an explicitly empty
   origin (`{ document: undefined, link: undefined, anchors: {} }`) serializes to
   the same string as the bare golden. Covers acceptance criterion 7.
2. **The anchored export**, a new inline snapshot over a fixture snapshot that
   carries an origin document (with a `reference`), an argument-level anchor, a
   premise-level anchor, and an expression-level anchor. Covers criteria 2, 3, 4.
3. **No offsets:** assert the rendered string matches no `/\d/` on any line
   containing `Based on origin text`, so a later edit cannot reintroduce
   `startCodePoint`. Covers criterion 6.
4. **Reference without an argument anchor** → header reads
   `> Based on origin text — {label}`. Covers criterion 5.
5. **Multi-line passage** collapses to one line. Covers criterion 8.

Fixture: add `originGoldenSnapshot()` to `derived-view-goldens.ts`, built on top
of `goldenSnapshot()` so the anchored output diffs cleanly against the plain one.
Anchors target `concl#e2` (a claim expression in the conclusion premise), the
`supp` premise, and the argument id `a`. Anchor objects are hand-built wire
shapes with the same `as unknown as` idiom the file already uses.

## 2. Implement (green)

In `src/engine/render/markdown.ts`:

- `originPassage(anchor)` → `` `Based on origin text "${collapsed}"` ``, where
  `collapsed` is `anchor.exact.replace(/\s+/g, " ").trim()`. Single source of the
  phrase, so it cannot drift between the three call sites.
- `anchorsFor(snapshot, targetId)` → `snapshot.origin?.anchors?.[targetId] ?? []`.
  Optional-chained because pre-origin snapshots omit the slice (spec, "Defensive
  read").
- `renderHeader`: after the existing version blockquote line, append one `>` line
  per argument-level anchor with the document reference suffix; when the document
  has a reference but no argument-level anchor, one `> Based on origin text — …`
  line. Reference label via `getInlineSourceLabel` imported from `./citation.js`.
- `renderLogic`: after a `premise-header` push, a paragraph line per premise
  anchor; after a `claim` bullet, a nested bullet per expression anchor at
  `indent + "  "`.

## 3. Capability + docs

- `capabilities.yaml` in this item folder: `changed: [arguments/copy-to-clipboard]`
  (bare path — a `shared/…` prefix fails `tcw work complete` closed).
- Reword `docs/capabilities/arguments/copy-to-clipboard/description.md` to name
  the origin passage. Status stays `Missing`; `set` is not needed for a body edit.
- Append a bullet to the existing origin section of
  `docs/release-notes/upcoming.md` and a line to `docs/changelogs/upcoming.md`.

## 4. Verify

`pnpm run check`, then `tcw capabilities check`, then `tcw work submit`.

## Out of scope reminders

No offsets. No change to `serializeArgumentText`, `buildTextTree`, or the
snapshot shape. No `pnpm version`, tag, publish, or push.
