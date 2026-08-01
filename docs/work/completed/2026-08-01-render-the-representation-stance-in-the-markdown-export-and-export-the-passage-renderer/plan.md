# Plan — Render the representation stance in the markdown export and export the passage renderer

Test-first throughout. Each step's tests are written and observed failing before
the source edit that satisfies them.

## Step 1 — A `seed`-stance golden fixture

`src/engine/__tests__/derived-view-goldens.ts` has one origin fixture family, and
`originLink()` hardcodes `stance: "representation"`. That is already the stance
the new line must render, so `originGoldenSnapshot()` covers the positive case
for free — the existing inline snapshot will need the new line appended, which is
itself the assertion.

The negative case has no fixture. Add:

- `originLink(stance)` takes the stance, defaulting to `"representation"` so no
  existing caller changes.
- `seedOriginGoldenSnapshot()` — identical to `originGoldenSnapshot()` but for
  the link's stance. Built by mutating the link on a snapshot from the existing
  builder, so the two can never drift in anything but the stance, which is
  exactly what the test is isolating.

## Step 2 — Tests for the stance line

In `src/engine/__tests__/derived-view.test.ts`, `describe("engine/render")`:

1. Update the `originGoldenSnapshot()` inline snapshot to carry the fidelity
   sentence as the last blockquote line. Run first, confirm the diff is *only*
   that line.
2. New: `seed` stance emits no fidelity sentence, and its output equals the
   `representation` output minus that one line. Asserting the relationship rather
   than a second full inline snapshot keeps the two from drifting.
3. The two existing no-origin assertions stay untouched and must still pass:
   - the plain `goldenSnapshot()` inline snapshot (byte-level, no origin slice)
   - `emptyOriginGoldenSnapshot()` equals `goldenSnapshot()` (origin slice
     present but empty — document `undefined`, so the stance line's guard is
     what keeps this green)

   Add a third: a snapshot with **no document but a `representation` link** emits
   no fidelity sentence. That is the case a naive `link?.stance` read without the
   document guard would break, and no existing fixture covers it.

## Step 3 — Implement the stance line

`renderHeader` in `src/engine/render/markdown.ts`, inside the existing
`if (originDocument)` block, after the passage/attribution lines:

```ts
if (snapshot.origin?.link?.stance === "representation") {
    lines.push(`> ${REPRESENTATION_CLAIM}`)
}
```

with the sentence hoisted to a module constant beside `ORIGIN_LEAD`, carrying the
comment explaining why `seed` emits nothing.

Run the suite; step 2's tests go green, the byte-identity assertions stay green.

## Step 4 — Tests for the exported renderer

Before touching the export surface:

- `originPassagesFor(undefined, "supp")` → `[]`
- `originPassagesFor(goldenSnapshot(), "supp")` → `[]` (no `origin` slice)
- `originPassagesFor(emptyOriginGoldenSnapshot(), "supp")` → `[]` (slice, no
  anchors)
- `originPassagesFor(originGoldenSnapshot(), "supp")` →
  `['Based on origin text "Socrates is a man."']`
- `originPassagesFor(originGoldenSnapshot(), "concl#e2")` — the fixture's
  newline-spanning anchor — renders as one line with collapsed whitespace

Imported from `../render/index.js`, alongside the other render imports at the top
of the test file, so the test fails at import resolution until the export exists.

## Step 5 — Export the renderer

In `src/engine/render/markdown.ts`:

- `export function originPassage(anchor: Pick<TOriginAnchor, "exact">): string`
- `export function originPassagesFor(snapshot: Pick<TProjectReactiveSnapshot,
  "origin"> | undefined, targetId: string): string[]` — the body of the old
  `anchorsFor` plus the map
- delete `anchorsFor`; rewrite its two call sites in `renderHeader` and
  `renderLogic` to call `originPassagesFor` and iterate strings rather than
  anchors. `renderHeader` currently needs the anchor *count* to decide the
  bare-attribution fallback — the string array's length serves identically.

In `src/engine/render/index.ts`: re-export `originPassagesFor` and widen the
module doc comment to mention the origin passage projection.

Only `originPassagesFor` reaches the public surface. `originPassage` stays a
file-level export for the module's own use and for a future consumer that turns
out to hold a bare anchor; adding it to `index.ts` before anyone asks is a public
surface nobody requested.

Run the markdown goldens — unchanged output proves the extraction is
behaviour-preserving.

## Step 6 — Verify

1. `pnpm run check` — the full pipeline (typecheck, prettier, eslint, vitest,
   build).
2. Tarball resolution, in a scratch directory outside the repo:
   - `pnpm pack`, install the tarball into a throwaway package
   - ESM: `import { originPassagesFor } from "@proposit/shared/engine/render"` —
     assert it is a function and returns `[]` for `undefined`
   - CJS: `require.resolve("@proposit/shared/engine/render")` under the `default`
     condition, then dynamic-`import` the resolved path and assert the same
   Resolution, not a read of the exports map — the map having three conditions is
   not proof the resolver finds the file.
   - Remove the `.tgz` from the package root afterwards; a stray tarball makes a
     later `pnpm publish` fail with `EUSAGE`.

## Out of scope

- Bumping the version, tagging, publishing, pushing. The release is cut
  separately.
- The core pin.
- Deleting mobile's copy — that is mobile's adoption, gated on this publishing.
