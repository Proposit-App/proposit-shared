# Enriched TArgumentDiff schema, complete-diff composition, and render-intent policy module

Design doc: `../../../../../docs/design/2026-07-12-argument-diff-modification-semantics.md`
Epic: `2026-07-12-argument-diff-unified-modification-semantics-cross-repo`
Upstream: `@proposit/proposit-core@2.5.0` (four-state model shipped + published).

## Problem

The shared slice of the argument-diff epic owns three deliverables the design
assigns to `@proposit/shared`:

1. The wire `TArgumentDiff` (`src/schemas/model/arguments.ts:73`) is a
   three-bucket (`added`/`removed`/`updated`) shape that **cannot represent
   core's four states** (`added`/`removed`/`modified-own`/`modified-within`) nor
   conclusion-role reassignment. Signals core@2.5.0 now computes — in-place
   expression edits (`expressions.modified`) and conclusion reassignment
   (`roles`) — have nowhere to land and stay invisible on the wire.
2. Claim-content + citation diffing lives in `proposit-server`
   (`src/model/argument/forks.ts:574` `argumentDiff`) and is not four-state.
   Core deliberately owns neither citations nor claim bodies, so the
   platform-agnostic composition that folds them into core's structural diff has
   no home — mobile would have to reimplement it.
3. The render-intent policy (`buildDiffMaps`,
   `proposit-server/src/app/view/[argumentId]/[version]/contexts/diff-context.tsx:15`)
   is client-only in the server. Mobile cannot reuse it.

## Root cause

`TArgumentDiff` predates the unified four-state model; diff *composition* and
*render policy* were built where the first consumer (server web UI) needed them,
not at the cross-platform contract layer.

## Proposed fix

- Enrich `TArgumentDiff` to carry the four states + conclusion roles losslessly
  (TypeBox), wrapping core@2.5.0's `TCoreArgumentDiff` shape.
- Promote claim-content + citation four-state composition into shared as a
  runtime-agnostic module.
- Promote `buildDiffMaps` into shared as a render-intent policy module applying
  the design's "origin + affected containers" rule.
- Resolve open question 4 (citation identity: digest vs stable id) — see spec.
- Bump the core dep (devDep `^2.3.1`→`^2.5.0`, peerDep `^2.3.0`→`^2.5.0`).

## Consumer impact

Breaking wire-schema change. `proposit-server` thins its `argumentDiff` +
`buildDiffMaps` onto the shared modules; `proposit-mobile` introduces diff
rendering on the same modules with no reimplemented semantics. Both consumers
repin shared only after this slice publishes (strict publish chain).
