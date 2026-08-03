# Plan — Shared size rule and origin run-building for the large-document reader

Ordering rationale: each code task lands a complete, independently green unit —
module plus its tests plus its barrel export — so `pnpm run test` passes at every
commit boundary and neither task depends on the other. The move is second
because it is the riskier of the two (behavior carried across a repo boundary),
so it lands isolated rather than mixed into the same commit as the threshold.

## 1. The size rule

**Changes**

- New `src/engine/render/origin-size.ts`:
  `LARGE_ORIGIN_DOCUMENT_CODE_POINTS = 1500` and
  `isLargeOriginDocument(text: string): boolean`, counting through
  `codePointLength` from `@proposit/proposit-core`. The doc comment records why
  the unit is code points (a whitespace word count scores an unspaced script at
  ~1 word) and where the number came from (~300 words of English at the 5.3-6.0
  chars/word this corpus measures), so the next person to move it knows what
  they are trading.
- Export both from `src/engine/render/index.ts`.
- New `src/engine/render/__tests__/origin-size.test.ts`.

**Verified by** `pnpm run test`: `false` at exactly the threshold, `true` at one
code point more, `false` on the empty string, and a string of astral characters
counted as one code point each rather than two — the last case fails if
`String.prototype.length` is ever substituted for `codePointLength`.

## 2. Move the run-building in

**Changes**

- New `src/engine/render/origin-runs.ts` carrying `TOriginRun`,
  `isAnchorInDocument` (private), `anchorsForTarget`, and `buildOriginRuns` over
  from
  `proposit-server/src/app/view/[argumentId]/[version]/util/origin-view-model.ts:13-119`
  verbatim, with imports rewritten to this repo's relative ESM form
  (`../engine.js`, `../../schemas/model/origin.js`) and the one comment that
  refers to the web app's copy reworded — this is now the copy.
- Export all four from `src/engine/render/index.ts`.
- New `src/engine/render/__tests__/origin-runs.test.ts` porting the server's
  cases at `util/__tests__/origin-view-model.test.ts:36-213`, with the small
  `anchor` / `snapshotWith` builders inlined in the file rather than lifted from
  `src/engine/__tests__/origin-fixtures.ts`, which stands up a real
  `PropositArgumentEngine` these functions have no use for.

**Verified by** `pnpm run test` covering, at minimum, the three invariants the
request names — overlapping spans merging into one flat run, an astral character
sliced whole, an out-of-range anchor filtered identically by both functions —
plus the reassembly, adjacent-touching, and fully-nested cases that a plausible
tidy-up of the merge loop would break. `pnpm run typecheck` confirms no import
cycle with `../engine.js`.

## 3. Capabilities

**Changes**

- `tcw capabilities add arguments/step-through-traced-passages "Step through the
  passages an argument traces to" --status Missing`, then
  `set --field "Feature=argument-browse"` and
  `set --field "Planning doc=<this slug>"`.
- Same for `arguments/find-text-in-the-source-text` / "Find text in the source
  text".
- Reword `arguments/see-the-original-source-text`'s `description.md` to describe
  the size-aware split. Body only — status is not touched, and `set --status` is
  not run.
- `capabilities.yaml` sidecar in the item folder: `new:` the two additions,
  `changed:` `arguments/see-the-original-source-text`. Bare `arguments/…` paths —
  these are local to the master, not federated ones.

**Verified by** `tcw capabilities check` and `tcw capabilities show` on all
three. No prettier over `docs/capabilities/`.

## 4. Documentation Sync

Evaluated in one pass over the finished diff, after the code tasks. This repo's
`CLAUDE.md` declares no `## Documentation Sync` section, so the tracked set is
the workspace convention plus what this repo actually keeps under `docs/`:

- `README.md` [Public-API] — **does not fire.** Its one line about this area,
  `- @proposit/shared/engine/*  — mutations, optimistic updates, derivation,
  rendering` (README.md:14), is a subpath-level summary and stays true; no
  subpath is added or removed, and `exports` is unchanged.
- `docs/release-notes/upcoming.md` [Public-API] — **fires.** Two new public
  exports plus a threshold consumers must adopt. The file does not currently
  exist (v0.56.0 was cut and rotated); create it, frontmatter-free.
- `docs/changelogs/upcoming.md` [Any-Code-Change] — **fires.** Create it, with
  the `<changes starting-hash="…" ending-hash="…">` wrapper spanning this
  branch's code commits.
- `docs/capabilities/**` [User-Capabilities] — **fires**, handled as task 3.
- `docs/taxonomy/**` — **does not fire.** `argument-browse` already exists and
  no vocabulary term is added.

## Verification

Beyond the suite:

- `pnpm run check` (typecheck + lint + test + build) green — the gate for this
  item.
- `pnpm pack` produces a tarball; report its path so the workspace root can
  validate it against both consumers and then remove it. Nothing is published
  and nothing is pushed from here.
- Grep confirming the threshold number literal appears exactly once under
  `src/`.
- The epic's "exactly one definition in the workspace" criterion is **not**
  reachable from this item — deleting the server's copy is the server slice's
  work, and this item must not edit another repo. Recorded in `outcome.md` for
  the orchestrator rather than silently left.

## Notes

No blockers to record: nothing in this repo gates the item, and `proposit-mobile`
is blocked on the *publish* of this item's result, which is tracked at the
workspace root.
