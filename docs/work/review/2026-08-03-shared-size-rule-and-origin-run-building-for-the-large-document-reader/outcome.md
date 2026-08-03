# Outcome — Shared size rule and origin run-building for the large-document reader

Branch `large-document-reader-foundation`, off `main`. Nothing pushed, nothing
published.

## Task 1 — the size rule (`d42ed05`)

`src/engine/render/origin-size.ts`:

- `LARGE_ORIGIN_DOCUMENT_CODE_POINTS = 1500`
- `isLargeOriginDocument(text: string): boolean` — `codePointLength(text) > …`

Both re-exported from `src/engine/render/index.ts`, so consumers import from
`@proposit/shared/engine/render`. No new `exports` subpath was needed.

Unit and value as specified: code points, because a whitespace word count scores
an unspaced script (Chinese, Japanese) at roughly one word however long the
document is; 1500 ≈ 260 words of English, from the 5.3–6.0 chars/word the four
curated source texts in `src/fixtures/historical-figures/` measure. Those four
run 15,561 / 18,204 / 28,680 / 97,032 characters, so all of them route to the
reader.

`src/engine/render/__tests__/origin-size.test.ts` — 4 tests: false at exactly the
threshold, true one code point past it, false on `""`, and an astral character
counted once rather than twice (that last one is what fails if `codePointLength`
is ever swapped for `String.prototype.length`).

## Task 2 — the move (`6319123`)

`src/engine/render/origin-runs.ts` now holds `TOriginRun`, `isAnchorInDocument`
(private), `anchorsForTarget`, and `buildOriginRuns`, carried over verbatim from
`proposit-server/src/app/view/[argumentId]/[version]/util/origin-view-model.ts:13-119`.
All three public symbols re-exported from `src/engine/render/index.ts`.

Two comment edits, no behavior change:

- The `anchorsForTarget` doc comment's reference to the web app's copy is gone —
  this is now the copy.
- `origin-excerpt.ts`'s aside "(the web app's `anchorsForTarget` does)" became
  "(as `anchorsForTarget` does)", now that it names a sibling module.

`src/engine/render/__tests__/origin-runs.test.ts` — 13 tests, porting the
server's suite at `util/__tests__/origin-view-model.test.ts:36-213`. The three
invariants the request named are covered explicitly: overlapping spans merging
into one flat run, an anchor over an astral character sliced whole, and an
out-of-range anchor filtered identically by both functions in one test that
asserts both. Also carried over: exact reassembly of the document, adjacent
touching spans staying separate, a fully nested span absorbed, identical spans
collapsing, and the three empty-input paths. The `anchor` / `snapshotWith`
builders are inlined in the test file — `src/engine/__tests__/origin-fixtures.ts`
stands up a real `PropositArgumentEngine`, which functions that read only
`snapshot.origin` have no use for.

`originContradictionTargetIds` stayed in the server, as specified — out of scope
and a one-line wrapper over an already-imported shared function.

## Task 3 — capabilities (`d31b942`)

Contradiction detection first: `tcw capabilities check` clean, and
`tcw capabilities search source` / `search passage` surfaced six neighbouring
entries. None claims sequential passage navigation or in-document search, so
neither addition conflicts.

- Added `arguments/step-through-traced-passages` (`cap-c53e16`) and
  `arguments/find-text-in-the-source-text` (`cap-08f192`), both `Missing`,
  `Feature=argument-browse`, both with this item as their `Planning doc`.
- Reworded `arguments/see-the-original-source-text` (`cap-5ac273`) to describe
  the size-aware split. `tcw capabilities set --status` was not run; it reads
  `Missing` in the master before and after, as every master entry does — the
  `Supported` status the consumers show is their own override.
- `capabilities.yaml` sidecar records the two under `new:` and the reword under
  `changed:`, with bare `arguments/…` paths (these are local to the master, not
  federated).

`tcw capabilities check` → OK. `tcw validate` reports three pre-existing problems
in `docs/work/completed/`, all misfiled resolutions from 2026-06/07 and untouched
by this item.

## Task 4 — Documentation Sync (`261cb30`)

- `README.md` — did not fire. Its one line for this area (README.md:14) is a
  subpath-level summary and no subpath changed.
- `docs/release-notes/upcoming.md` — fired. Two sections appended (the size rule,
  the two new run-building exports) and the Repinning section widened to cover
  both this work and the review-persist fix already sitting in the file.
- `docs/changelogs/upcoming.md` — fired. `## Added` and `## Changed` sections
  prepended above the existing `## Fixed`.
- `docs/capabilities/**` — fired; task 3.
- `docs/taxonomy/**` — did not fire; `argument-browse` already exists.

## Verification

`pnpm run check` (prettify:check + eslint + vitest + build) — green.
**118 test files, 1156 tests passed.**

`grep -rn "1500" src/` returns exactly one line, the constant's own definition.
`dist/engine/render/index.{js,d.ts}` carry all five new exports after the build.

Tarball for the workspace root: **`/tmp/proposit-shared-tarballs/proposit-shared-0.56.0.tgz`**,
packed with `--pack-destination` so no `*.tgz` is left in the package root to
`EUSAGE` a later `pnpm publish`.

## Where the plan and spec were wrong

**The version cut.** Neither document said who bumps the version, and the request
reads "the root … tags `v{version}`". A minor bump was cut and then reverted:
`v0.56.0` is already tagged, so the tarball packs a published version number, but
`stage-implement` step 6 is explicit that the cut belongs after
`tcw work complete`, and the request assigns the tag to the root. Left at
`0.56.0` with both `upcoming.md` files ready to rotate. **The root must cut a
minor (`0.57.0`) before publishing** — the additions are purely additive, and
`upcoming.md` also covers the unreleased review-persist fix that landed on `main`
after `v0.56.0`.

**"Exactly one definition in the workspace"** (the request's acceptance criterion
2) is not reachable from this item and was not attempted. Deleting
`origin-view-model.ts:13-119` and repointing its two call sites
(`components/controls/origin-section.tsx:32`,
`components/text-view-hosts/origin/origin-markers.tsx:23`) plus its test file
belongs to the `proposit-server` slice; this item must not edit another repo. Two
definitions coexist until that slice lands. The spec recorded this as a risk up
front and it played out exactly as written.

Nothing else in the plan needed correcting: no import cycle materialized
(`render/markdown.ts` and `render/formula.ts` already type-import from
`../engine.js`), and the `./engine/render` subpath absorbed all five exports with
no `package.json` change.

## Notes

`tcw work complete`'s capability gate will block while
`arguments/step-through-traced-passages` and
`arguments/find-text-in-the-source-text` read `Missing`, which is where they are
meant to stay in the master — the same shape as the nine `new:` entries in
`docs/work/completed/2026-07-31-origin-data-schemas-mutations-and-capability-master/capabilities.yaml`,
all still `Missing` today. This item stops at `submit`, so it does not hit the
gate; whoever completes it will.
