---
from: proposit-app
---

# Expose the operator expressionId on TTextTreeItem for edge-level diff cues

> Escalated by `proposit-mobile` on 2026-07-30; routed here by the orchestrator on 2026-08-12. Original entry title: *expose an operator expressionid on ttexttreeitem for edge level diff cues shared*.

**Target node:** `proposit-shared` (engine text-tree types).

## Problem

`proposit-mobile`'s version-history diff cannot render diff cues on operator
rows. `src/version-history/diff-cue.ts:32` carries a `TODO(refine)` for exactly
this: the edge-level diff map cannot be keyed onto an operator row, so structural
changes at an operator show up unmarked in the diff view.

## Root cause

The `operator` variant of `TTextTreeItem` carries no identifier. Per the
installed `@proposit/shared` 0.54.0
(`dist/engine/text-tree.d.ts:23-27`) it is:

```ts
{ type: "operator"; operator: Exclude<TLogicalOperatorType, "not">; label: string; depth: number }
```

`label` and `depth` are presentational; neither is stable enough to key a diff
map onto. Without an `expressionId` (or equivalent), a consumer genuinely cannot
correlate an operator row with the edge whose change it should display.

## Proposed fix

Thread the operator's `expressionId` onto the `operator` variant of
`TTextTreeItem` when the text tree is built, so consumers can overlay edge-level
diff cues. Additive — existing consumers that ignore the field are unaffected.

## Consumer impact

`proposit-mobile`: unblocks the operator diff-cue TODO in
`2026-07-25-refine-polish-todos-left-by-the-capability-gap-slices-…` (scoped out
of that item until this lands). `proposit-server` renders the same text tree and
would gain the same capability.

## Test cases

- A text tree built from an argument with nested operators exposes a stable
  `expressionId` on each operator row.
- The id matches the one used to key edge-level diffs, so an operator whose edge
  changed between two versions can be located.
- Existing consumers that destructure only `operator` / `label` / `depth` still
  typecheck.

