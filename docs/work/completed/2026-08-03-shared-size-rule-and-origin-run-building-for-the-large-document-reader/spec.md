# Spec — Shared size rule and origin run-building for the large-document reader

## Capability changes

The platform-agnostic master lives in this repo and federates into both
consumers. Contradiction detection run before writing: `tcw capabilities check`
is clean, and `search source` / `search passage` surface six neighbouring
entries. None of them claims sequential passage navigation or in-document
search, so neither addition contradicts a standing entry.

**Changed**

- `arguments/see-the-original-source-text` (`cap-5ac273`) — its body says the
  source text is read "alongside the argument itself", which describes only the
  embedded sidebar. Reword to describe the size-aware split: short texts read
  in place, long ones in a dedicated reader. **Status untouched** — it is
  `Missing` in the master (the master seeds every entry `Missing`; consumers
  hold the real status as an override, `Supported` on both) and this is a UX
  improvement to an existing capability, not a re-declaration.

**New** — both seeded `Missing`, `Feature=argument-browse` (matching the two
existing origin-reading entries), each with a `Planning doc` pointer:

- `arguments/step-through-traced-passages` — "Step through the passages an
  argument traces to". Distinct from `arguments/see-where-content-came-from`
  (`cap-4b057c`), which is the per-item pairing between one premise or claim
  and its passage; this is walking the anchored passages as an ordered sequence
  inside the document.
- `arguments/find-text-in-the-source-text` — "Find text in the source text".
  Nothing in the ledger covers searching within a document.

Recorded in `capabilities.yaml` with `new:` / `changed:` lists. Both new entries
stay `Missing` on completion of this item, as the master's other origin entries
do: the UI that realizes them ships in the consumer slices.

## Problem

A source text of any real length is unreadable on both clients, and the two
clients disagree about what "long" even means.

- Mobile decides with a local threshold: `CLAMP_THRESHOLD = 600` characters at
  `proposit-mobile/src/arguments/origin-source-panel.tsx:17`, consumed at
  `:60`, which clamps the body to 12 lines behind a "Show all" control.
- The web has no threshold at all —
  `proposit-server/src/app/view/[argumentId]/[version]/components/controls/origin-section.tsx:226`
  maps every run into the 400px controls sidebar unconditionally.

Both clients are about to grow a dedicated full-screen reader for long texts.
Neither can be built without (a) one agreed answer to "is this document large?"
and (b) the run-building the reader renders — which today exists only in the
server, at
`proposit-server/src/app/view/[argumentId]/[version]/util/origin-view-model.ts:46-119`.
`buildOriginRuns` and `anchorsForTarget` there are pure functions over a
`TProjectReactiveSnapshot` with no React and no MUI in them, and that file
already re-exports `originPassage` from `@proposit/shared/engine/render`
(`origin-view-model.ts:6`), so the boundary is established and pointing the
wrong way for these two.

## Goals

1. One exported constant plus one predicate deciding whether a source text is
   large, defined once and consumed by both clients.
2. `buildOriginRuns`, `anchorsForTarget`, and `TOriginRun` authored in
   `@proposit/shared/engine/render`, behavior intact.
3. The moved behavior covered by tests here, including the three invariants that
   are subtle enough to be lost in a move.
4. The capability master updated as above.

## Non-goals

- Any UI. Both readers are separate slices in `proposit-server` and
  `proposit-mobile`.
- Editing either consumer. Deleting the server's copy of the moved functions and
  repointing its imports belongs to the server slice; until then two definitions
  coexist in the workspace by design, not by oversight.
- Changing how origin data is stored, anchored, or ingested.
- `proposit-core` — nothing there moves.

## Design

### The size rule

New module `src/engine/render/origin-size.ts`, re-exported from
`src/engine/render/index.ts`. No new package subpath: `./engine/render` already
exists in `package.json`'s `exports` (lines 191-195) and both clients already
import from it — mobile pulls `getInlineSourceLabel` from it
(`origin-source-panel.tsx:4`), the server re-exports `originPassage` from it.

```
export const LARGE_ORIGIN_DOCUMENT_CODE_POINTS = 1500
export function isLargeOriginDocument(text: string): boolean
```

**Unit: code points, not words.** The deciding argument is that a word count
cannot see a document with no spaces in it. Splitting on whitespace scores a
40,000-character Chinese or Japanese source text at roughly one word and leaves
it rendering inline — the exact failure this item exists to fix, in the case
where it is worst. A code-point count is correct for every script. It also
matches the vocabulary the rest of the origin surface already speaks: offsets,
anchors, `codePointLength`, `sliceByCodePoints`, and
`DEFAULT_CONTEXT_CODE_POINTS` in `origin-excerpt.ts:16` are all code points, and
a second unit here would be the only one.

**Value: 1500 code points.** The requester's opening proposal was ~300 words.
Measured across the four curated source texts in
`src/fixtures/historical-figures/*/`, English prose in this corpus runs 5.3-6.0
characters per word (mill 5.81, madison 5.98, singer 5.54, socrates 5.33), so
~300 words is ~1700 characters; 1500 is that figure rounded to a number a reader
of the constant can hold, and lands at roughly 260 words of English.

Sanity-checked against the real corpus: the four curated documents measure
15,561 / 18,204 / 28,680 / 97,032 characters (2,807 / 3,046 / 5,378 / 16,704
words). Every one is an order of magnitude over the threshold, so all four route
to the reader — which is the intent, and means the threshold's precision only
matters at the short end. There it sits comfortably above the short-source cases
the import flows produce (a post, a comment, a paragraph) and above mobile's
existing 600-character clamp, so nothing that reads acceptably inline today is
pushed into a modal.

The count goes through `codePointLength`, not `String.prototype.length`: a
UTF-16 length over-counts astral characters, and an emoji-dense document would
be measured at up to twice its real size.

### The move

New module `src/engine/render/origin-runs.ts` holding `TOriginRun`,
`anchorsForTarget`, `buildOriginRuns`, and the private `isAnchorInDocument`
predicate both call — carried over verbatim, comments included, with the one
comment that names the web app's copy reworded now that this *is* the copy. All
four re-exported (the type included) from `src/engine/render/index.ts`.

`originContradictionTargetIds` stays in the server: it is not in this item's
scope, and it is a one-line wrapper over
`@proposit/shared/engine/origin-derivation`, which the server already imports
directly.

No import cycle: `src/engine/render/markdown.ts:1` and `formula.ts:1` already
type-import `TProjectReactiveSnapshot` from `../engine.js`, and `engine.ts`
imports nothing from `render/`.

### Tests

`src/engine/render/__tests__/origin-runs.test.ts`, with the small snapshot and
anchor builders inlined in the file. The heavyweight
`src/engine/__tests__/origin-fixtures.ts` builds a real
`PropositArgumentEngine`, which is far more machinery than functions that read
only `snapshot.origin` need.

`src/engine/render/__tests__/origin-size.test.ts` for the threshold: the
boundary in both directions, and that the count is by code point.

## Acceptance criteria

1. `LARGE_ORIGIN_DOCUMENT_CODE_POINTS` and `isLargeOriginDocument` are exported
   from `@proposit/shared/engine/render`; the number appears exactly once in
   `src/`.
2. `isLargeOriginDocument` returns `false` at exactly
   `LARGE_ORIGIN_DOCUMENT_CODE_POINTS` code points and `true` at one more, and
   counts an astral character as one code point rather than two.
3. `buildOriginRuns`, `anchorsForTarget`, and `TOriginRun` are exported from
   `@proposit/shared/engine/render` and have exactly one definition in this
   repo.
4. Tests in this repo cover: two overlapping anchor spans merging into one flat
   run rather than nesting; an anchor over an astral character slicing without
   splitting it; and an out-of-range anchor filtered identically by
   `buildOriginRuns` and `anchorsForTarget`.
5. `arguments/step-through-traced-passages` and
   `arguments/find-text-in-the-source-text` exist in the master seeded
   `Missing`, each with `Feature=argument-browse` and a `Planning doc` pointer.
6. `arguments/see-the-original-source-text`'s description covers the split; its
   status is unchanged.
7. `tcw capabilities check` and `pnpm run check` both pass.
8. A tarball built by `pnpm pack` and its path reported; nothing published and
   nothing pushed.

## Risks

- **Two definitions in the workspace until the server slice lands.** The epic's
  criterion is one definition workspace-wide; this item cannot reach it without
  editing `proposit-server`, which it must not. The server slice deletes
  `origin-view-model.ts:13-119` and re-exports from
  `@proposit/shared/engine/render` alongside the `originPassage` line already
  there. Flagged to the orchestrator rather than worked around.
- **A behavior-preserving move that silently is not.** Mitigated by porting the
  server's existing suite (`util/__tests__/origin-view-model.test.ts:36-213`)
  rather than writing fresh cases: the adjacent-touching-spans case, the
  fully-nested case, and the exact-reassembly case are all invariants a plausible
  "tidy-up" of the merge loop would break.
- **A threshold that ages.** One constant, one predicate, one module — changing
  it is a one-line edit plus a shared minor, not a hunt through call sites.

## Notes

- The master seeds capabilities `Missing` and consumers override the status, so
  `tcw work complete`'s gate — which blocks while a `new:` path still reads
  `Missing` — will need the same handling the prior origin items in this repo
  got (`docs/work/completed/2026-07-31-origin-data-schemas-mutations-and-capability-master/capabilities.yaml`
  lists nine `new:` entries that are all still `Missing` in the master today).
  This item stops at `submit`, so it does not hit the gate.
