# Plan

## 1. Write the failing tests

`src/engine/render/__tests__/origin-excerpt.test.ts`, one per acceptance
criterion. Fixture is a short document with known offsets plus one containing 📚
before the anchor, so the code-point arithmetic is exercised rather than assumed.

## 2. Implement

`src/engine/render/origin-excerpt.ts`:

```
clamp → slice (sliceByCodePoints) → collapse → snap inward (guarded) → flags → trim
```

Uses `buildCodePointIndex` once and `sliceByCodePointsIndexed` for the three
slices — core exports both for exactly this, and the alternative is three full
scans of a document that can run to 97,000 code points.

## 3. Export

Add to `src/engine/render/index.ts` beside `originPassagesFor`; export the
`TOriginExcerpt` type too. No new `exports` subpath — `./engine/render` exists.

## 4. Fold into v0.56.0

Append to `docs/changelogs/v0.56.0.md` (Added) and
`docs/release-notes/v0.56.0.md`. `pnpm run check`, `pnpm run build`, remove the
stale `*.tgz`, `pnpm pack`, move the local `v0.56.0` tag to the new HEAD.

## Checks

`pnpm run check` green. The new tests fail before step 2 and pass after.
