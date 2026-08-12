# Spec: Promote the origin-authoring decision helpers into @proposit/shared

## Problem

`proposit-server/src/app/view/[argumentId]/[version]/util/origin-authoring.ts`
is a module of pure decisions the source-text authoring surface makes. Every
function in it imports only `@proposit/proposit-core` and
`@proposit/shared/engine/engine`; none touches the DOM, React, Next, or React
Native. They are platform-agnostic by construction and live in the server repo
only because the server got there first — the **reading** half of the same
feature (`buildOriginRuns`, `anchorsForTarget`, `originPassage`,
`isLargeOriginDocument`) is already federated here under `engine/render`.

Mobile is now building the authoring half and is carrying a third copy of these
rules, marked in-file as the duplicate it is.

## Goals

1. The seven decisions live here once, importable by both consumers.
2. `isAttributionEditable` is included, and its signature admits **both**
   callers' argument types so neither has to widen at the call site.
3. Behaviour is unchanged — a move, not a rewrite.

## Non-goals

- **No `proposit-server` edit.** Deleting its local copy and repointing its six
  importers needs a repin, which cannot happen before the epic's publish window.
  Recorded as a follow-up.
- **No `proposit-mobile` edit.** Same reason; mobile deletes its copy on
  adoption.
- **Not the reading half.** Already here, untouched.
- **Not `isImportPrefill`.** It sits in the same server component and looks like
  a twin of `isAttributionEditable`, but that component's own comment says the
  two are *deliberately* separate readings of `unparsed` answering different
  questions ("may this be rewritten?" versus "did a machine write it?"). It has
  one caller, was not in the request, and promoting it would invite exactly the
  collapse that comment exists to prevent.

## Design

### Placement

`src/engine/origin-authoring.ts` — a peer of the existing
`src/engine/origin-derivation.ts`, which imports `isClaimBound` from core the
same way.

**No `package.json` `exports` entry.** `./engine/*` already spans this path, so
the module is reachable as `@proposit/shared/engine/origin-authoring` with no
map change. (Contrast the operator-reaction schemas, which needed one because
the wildcard could not reach a directory's `index.js`.)

Not under `engine/render/`: that folder is the reading direction — stored
anchors into runs and cues. This is the writing direction — a human's selection
and a snapshot into a request the server will accept. The split the server's
file documents is by direction, and it survives the move.

### Contents

Moved verbatim from the server file:

- `utf16ToCodePoint(text, utf16Index)`
- `selectionToCodePointSpan(text, selectionStart, selectionEnd)`
- `isMarkableExpression(snapshot, expressionId)`
- `isMarkedUnspoken(snapshot, targetId)`
- `describeTarget(snapshot, targetId)`
- `allAnchorsForTarget(snapshot, targetId)`
- the module-private `premiseHolding` helper the last four share

Moved from `…/components/controls/origin-attribution-control.tsx`:

- `isAttributionEditable(reference)`

Imports re-point to local paths: `TProjectReactiveSnapshot` from `./engine.js`,
`TOriginAnchor` / `TOriginDocument` from `../schemas/model/origin.js`; core
imports are unchanged, since `@proposit/proposit-core` is a peer dependency here
too.

### One deliberate signature widening

The server declares two shapes of the same question:

```ts
// src/model/origin.ts:327            — server side
isAttributionProvisional(stored: TOriginDocument["reference"] | null)
// origin-attribution-control.tsx:26  — client side
isAttributionEditable(reference: TOriginDocument["reference"] | undefined)
```

`reference` is `Type.Optional(...)`, so the client type is already
`X | undefined` and the server's adds `| null` on top. The shared version takes
`TOriginDocument["reference"] | null | undefined`, which both callers satisfy
without a cast. The body is unchanged — `reference == null` was already the
loose equality that answers for both, which is why the two have not drifted yet
despite being written twice.

This is the point of the item. Of the three copies of "is this attribution still
editable?", the two that were most likely to drift were the ones whose *types*
disagreed, because a future narrowing of one would not touch the other.

## Acceptance criteria

1. `@proposit/shared/engine/origin-authoring` exports all seven functions.
2. Every case in the server's existing suite
   (`…/util/__tests__/origin-authoring.test.ts`) passes against the shared
   module, unmodified in substance.
3. `utf16ToCodePoint` is exercised on a string containing astral-plane
   characters, where UTF-16 and code-point offsets diverge — the case the
   conversion exists for and the one ASCII fixtures never reach.
4. `selectionToCodePointSpan` returns `null` for an empty span and for a
   backwards one.
5. `isAttributionEditable` is exercised on `null`, on `undefined`, on an
   `unparsed` reference, and on a parsed IEEE reference, and agrees with the rule
   `isAttributionProvisional` states.
6. `pnpm run check` green.

## Risks

- **Three copies become four until the consumers adopt.** For one publish window
  the rules exist here, in the server, and in mobile. That is strictly no worse
  than today and is the only sequence available, since neither consumer can
  import an unpublished path — but the follow-ups have to be recorded, not
  assumed.
- **Criterion 5 cannot import the server's function.** The two live in different
  repos, so the test asserts the shared function against the *rule* as the server
  states it (`stored == null || stored.type === "unparsed"`), enumerating the
  four inputs. That catches a divergence introduced here; it cannot catch one
  introduced later on the server side. The real fix for that is the server
  adopting this function, which is the recorded follow-up.
