# Outcome: Version diff surfaces premise title changes

Branch `work/diff-premise-titles`, commit `e87d2f5`.

## What was wrong

Found while verifying the curated republish locally, not by inspection: after
republishing v0 → v1 where the only change was every premise title,
`GET /api/v1/argument/{id}/1/diff/{id}/0` returned every array empty while the
database genuinely held different titles at both versions. A reader would see a
new version with nothing changed.

`src/checksum.ts:20` omits `premiseFields`, falling back to core's four-field
default — premise `title` is deliberately outside the premise checksum, because
core owns no application display text. `src/engine/diff.ts` then built
`premises.modified` purely by mapping core's structural diff and never mentioned
`title`. So the change was invisible to both layers.

## The fix

`composeArgumentDiff` now walks the after-side premises, compares
`p.title ?? ""` against the before side, and records a `{ field: "title" }`
change in a map keyed by premise id. Core's structurally-modified premises are
mapped first and consume matching entries from that map, so a premise can only
ever produce one entry; whatever remains becomes a standalone `modified-own`.
A premise that core already reported as `modified-within` is promoted to
`modified-own` when its own title moved, which `buildDiffRenderMaps`
(`src/engine/diff-render.ts:28`) already renders as the origin cue.

Derivation premises stay excluded through the existing `keepPremise` predicate
rather than a parallel filter. The checksum config is untouched — this is an
application-layer comparison, which is the layer that owns the field.

## Verification

`pnpm run check` passes: 118 test files, 1165 tests, prettier and eslint clean,
build clean. Re-run independently by the coordinating session rather than taken
on report.

Seven tests added, covering the title-only case, no-op stability, the
`null`/`""`/absent equivalences, the merge case (structural + title change → one
entry), the `modified-within` → `modified-own` promotion, derivation-premise
exclusion, and a premise present on only one side.
