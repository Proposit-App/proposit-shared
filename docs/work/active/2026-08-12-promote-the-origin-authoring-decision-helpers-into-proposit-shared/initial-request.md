# Promote the origin-authoring decision helpers into @proposit/shared

Epic: [Close the remaining mobile gaps vs the web app](tcw://W/proposit-app/2026-08-12-close-the-remaining-mobile-gaps-vs-the-web-app)

Escalated by `proposit-mobile`, routed by the orchestrator on 2026-08-12.

## Inbox contents

## Inbox manifest

- `2026-08-12-promote-the-origin-authoring-decision-helpers-into-proposit-shared.md`

## Inbox body

---
from: proposit-app
initiative: 2026-08-12-close-the-remaining-mobile-gaps-vs-the-web-app
---

> Escalated by `proposit-mobile`; routed by the orchestrator on 2026-08-12.

# Promote the origin-authoring decision helpers into @proposit/shared

Routed to `proposit-shared`.

## Problem

`proposit-server/src/app/view/[argumentId]/[version]/util/origin-authoring.ts`
is a module of pure decisions that the source-text authoring surface makes:

- `utf16ToCodePoint(text, utf16Index)` and
  `selectionToCodePointSpan(text, start, end)` — the UTF-16 → code-point
  conversion every selection API forces, since `startCodePoint`/`endCodePoint`
  count code points (`proposit-core/src/lib/schemata/origin.ts:141`).
- `isMarkableExpression(snapshot, expressionId)` — only a claim-bound variable
  may be declared unspoken; core reports a mark on anything else as a
  Presentable violation and the route refuses it.
- `isMarkedUnspoken(snapshot, targetId)`, `describeTarget(snapshot, targetId)`,
  `allAnchorsForTarget(snapshot, targetId)`.

Plus one more, currently inline in
`proposit-server/src/app/view/[argumentId]/[version]/components/controls/origin-attribution-control.tsx`:

- `isAttributionEditable(reference)` — `reference == null || reference.type ===
  "unparsed"`, the client mirror of `isAttributionProvisional` in
  `proposit-server/src/model/origin.ts`.

Every one of them imports only `@proposit/proposit-core` and
`@proposit/shared/engine/engine`. None touches the DOM, React, Next, or React
Native. They are platform-agnostic by construction and live in the server repo
only because the server got there first.

## Root cause

Not a defect. The origin authoring surface shipped on web before a second
consumer existed, so its view-model decisions were written where they were
needed rather than where they belong.

## Proposed fix

Move the module into `@proposit/shared` (alongside `engine/render`, which
already holds the reading-half counterparts `buildOriginRuns`,
`anchorsForTarget`, `originPassage`, `isLargeOriginDocument`), re-export it, and
have `proposit-server` import it instead of its local copy. Include
`isAttributionEditable`, since the set-once rule is the one most likely to drift
away from the server's `isAttributionProvisional`.

The reading half is already federated this way. The authoring half was simply
never lifted.

## Consumer impact

- `proposit-server`: deletes its local `util/origin-authoring.ts` and the inline
  `isAttributionEditable`, imports from `@proposit/shared`. No behavior change.
- `proposit-mobile`: currently carrying a **third** copy of these rules at
  `src/arguments/origin-authoring.ts`, written for the source-text authoring
  work on mobile. Mobile deletes its copy on adoption.

Mobile did not block on this. The mobile slice cannot wait for a publish window
— the epic defers its single publish to closeout — so the local copy is marked
in-file as the duplicate it is, with adoption tracked here.

## Why this matters more than the line count

A rule of the form *"may this be edited?"* or *"does this entity qualify?"*
written down three times is the recurring defect shape in this workspace. There
are now three answers to "is this attribution still editable?" (server model,
web client, mobile client) and three to "may this expression be marked
unspoken?" — all of which have to change together and none of which is checked
against the others.

## Test cases

- Every existing `proposit-server` test over `util/origin-authoring.ts` passes
  unchanged against the shared import.
- `utf16ToCodePoint` is exercised against a string containing an astral-plane
  character, where UTF-16 and code-point offsets diverge — the case the whole
  conversion exists for and the one ASCII fixtures never reach.
- `selectionToCodePointSpan` returns `null` for an empty span and for a
  backwards one, since `CreateOriginAnchorRequestSchema`'s `Type.Refine` throws
  rather than returning an error result.
- `isAttributionEditable` and the server's `isAttributionProvisional` agree on
  `null`, an `unparsed` reference, and a parsed IEEE reference.
</content>
