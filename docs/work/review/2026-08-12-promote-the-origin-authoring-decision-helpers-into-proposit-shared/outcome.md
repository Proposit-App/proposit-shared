# Outcome: Promote the origin-authoring decision helpers into @proposit/shared

## What shipped

| File | Change |
| --- | --- |
| `src/engine/origin-authoring.ts` | new — seven exported decisions + the private `premiseHolding` |
| `src/engine/__tests__/origin-authoring.test.ts` | new — 22 cases |

No `package.json` change. `./engine/*` already spans the path, so the module is
reachable as `@proposit/shared/engine/origin-authoring` with no `exports` edit —
confirmed after a build rather than assumed:
`require.resolve("@proposit/shared/engine/origin-authoring")` →
`dist/engine/origin-authoring.js`, and the built module's named exports are
exactly the seven below.

### Exported signatures

```ts
utf16ToCodePoint(text: string, utf16Index: number): number

selectionToCodePointSpan(
    text: string,
    selectionStart: number,
    selectionEnd: number
): { startCodePoint: number; endCodePoint: number } | null

isMarkableExpression(snapshot: TProjectReactiveSnapshot, expressionId: string): boolean
isMarkedUnspoken(snapshot: TProjectReactiveSnapshot, targetId: string): boolean
describeTarget(snapshot: TProjectReactiveSnapshot, targetId: string): string
allAnchorsForTarget(snapshot: TProjectReactiveSnapshot, targetId: string): TOriginAnchor[]

isAttributionEditable(
    reference: TOriginDocument["reference"] | null | undefined
): boolean
```

Placed at `src/engine/`, peer to `origin-derivation.ts` (which imports
`isClaimBound` from core the same way) rather than under `engine/render/`. That
folder is the reading direction; this is the writing direction, and the
by-direction split the server file documents survives the move.

## The one intended signature change

`isAttributionEditable` widens to `… | null | undefined`. The two existing
copies of this rule disagreed about their own types:

```ts
// proposit-server/src/model/origin.ts:327
isAttributionProvisional(stored: TOriginDocument["reference"] | null)
// …/components/controls/origin-attribution-control.tsx:26
isAttributionEditable(reference: TOriginDocument["reference"] | undefined)
```

`reference` is `Type.Optional(...)`, so the client type already carries
`undefined` and the server's adds `| null`. Both callers now satisfy the shared
signature without a cast. The body is untouched — `reference == null` was already
the loose equality answering for both, which is why these two had not drifted
despite being written twice.

## The one place the move was not a pure copy

`describeTarget` uses `||` on two nullable title strings. This repo's ESLint
enforces `@typescript-eslint/prefer-nullish-coalescing` with **no**
`ignorePrimitives` carve-out; `proposit-server` configures
`ignorePrimitives: { string: true }` precisely so this code is legal there. So
the lint that passes in the origin repo fails here, on a line whose `||` is
load-bearing: these columns store `""` for absence at least as often as `null`,
and `??` would keep the empty string and render a control with no name.

Resolved by keeping `||` behind two scoped `eslint-disable-next-line` comments
that state the reason, **and** by adding a test for the empty-string case, since
the ported suite only covered `null`.

That test was verified to actually guard the rule rather than decorate it: with
`||` mutated to `??`, it fails —

```
× falls back on an empty title, not just a missing one
AssertionError: expected '' to be 'an untitled premise'
```

— and the `null` case the server's suite already had passes under **both**
spellings. So without this addition, a well-meaning lint autofix would have
silently changed behaviour with a green suite. Reverted to `||` immediately
after; the mutation was a check, not a change.

## How it was verified

TDD: the ported suite was written first and failed to load at all
(`Failed to resolve import "../origin-authoring.js"`) before the module existed.

22 cases. The server's suite came over with assertions intact, plus cases it did
not have:

- `allAnchorsForTarget` — every anchor for a target, including one whose `exact`
  no longer matches its span (the anchor the reading half refuses to draw is
  exactly the one an author needs listed so they can remove it), and the
  empty-list case.
- `isAttributionEditable` — `null`, `undefined`, an `unparsed` reference, a
  parsed IEEE reference.
- `describeTarget` on an unknown target, and on an empty title.

The escalation's two named cases are both covered: `utf16ToCodePoint` on
astral-plane characters (`"🜁 fire 🜃 earth"`, where UTF-16 index 8 is code point
7), and `selectionToCodePointSpan` returning `null` for an empty and for a
backwards span.

`pnpm run check` green: 129 files, 1240 tests, typecheck, lint, build.

## Follow-ups this item does NOT do

- **`proposit-server` adoption.** Delete
  `src/app/view/[argumentId]/[version]/util/origin-authoring.ts` and the inline
  `isAttributionEditable` in
  `…/components/controls/origin-attribution-control.tsx`, then repoint the six
  importers (`premise-gear-menu-host.tsx`, `origin-anchor-dialog.tsx`,
  `origin-markers.tsx`, `claim-card-gear-menu-host.tsx`,
  `origin-authoring-panel.tsx`, and the suite) at
  `@proposit/shared/engine/origin-authoring`. Gated on the repin, so gated on the
  epic's publish window. Worth doing in the same pass: have
  `isAttributionProvisional` in `src/model/origin.ts` call the shared function
  too — that is the copy the escalation was really about, and the widened
  signature was chosen to admit it.
- **`proposit-mobile` deleting its copy.** The mobile slice's own step.
- **`isImportPrefill` stays in the server.** It looks like a twin but is a
  deliberately separate reading of `unparsed` answering a different question
  ("did a machine write it?" versus "may this be rewritten?"); its own comment
  says collapsing the two is the failure mode. One caller, not in the request.

## Honest limits

- **The server's existing suite was not run against the shared import.** It
  cannot be, from here — the server has to repin first. Its cases were ported
  verbatim instead, so a behaviour change breaks them here.
- **No test spans the two repos.** `isAttributionEditable` is pinned against the
  rule as the server writes it, enumerated over four inputs. That catches a
  divergence introduced here; it cannot catch one introduced later on the server
  side. The durable fix is the server adopting this function, above.
- **Mobile's copy was not compared.** `proposit-mobile/src/arguments/origin-authoring.ts`
  does not exist at that repo's current HEAD — it is on the unmerged Cluster A
  branch — so "mobile's copy is identical" is the escalation's claim, not
  something verified here.
