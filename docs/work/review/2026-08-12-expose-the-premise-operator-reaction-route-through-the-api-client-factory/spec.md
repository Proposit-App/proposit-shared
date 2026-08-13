# Spec: Expose the premise operator-reaction route through the api-client factory

## Problem

A premise decision made on the **reading** surface is an operator reaction, not a
review-draft assignment. Web writes it through
`POST/DELETE /api/v1/argument/{argumentId}/{version}/premise/{premiseId}/reactions`
and seeds the whole argument from
`GET /api/v1/argument/{argumentId}/{version}/premise-reactions`.

Two things keep mobile off that route:

1. Its request/response bodies live in the **server route folder**
   (`proposit-server/src/app/api/v1/argument/[argumentId]/[version]/premise/[premiseId]/reactions/schemas.ts`),
   under the server's in-repo carve-out for bodies that are not a cross-runtime
   contract. That file's own comment says what to do when this happens: *"If
   mobile ever renders the tally, these schemas graduate to shared alongside
   api-client functions for them."* That is now.
2. The api-client factory has no method for either route. It has argument-level
   reactions and claim-level reactions; the premise level is missing.

Mobile already has the premise header, the operator queue, and the reason
vocabulary from `@proposit/shared`. What it has no way to reach is the store the
decision goes into.

## Goals

1. `@proposit/shared/schemas/api/operator-reaction` holds the wire bodies, so
   both clients read one contract.
2. The factory exposes `createOperatorReaction`, `deleteOperatorReaction`, and
   `getOperatorReactionMap`.
3. The shapes are **byte-identical** to what the route serves today, so web's
   adoption is a no-op rather than a migration.

## Non-goals

- **No server change, in this repo or the other.** The routes exist and already
  serve web. Deleting the server's local `schemas.ts` and repointing its imports
  is a follow-up gated on the publish window, not work done here.
- **No single-premise `getOperatorReaction`.** The claim level has one, and the
  route supports one, but no consumer has asked: web seeds server-side during
  SSR and mobile wants the bulk read. Adding it now would be a fourth method
  written against nothing. It is a two-line addition whenever a caller appears.
- **No optimistic-state helpers.** `applyDecision` / `clearOwnDecision` live in
  the server's `operator-decision-state.ts` and were not part of the escalation;
  promoting them is a separate call.

## Design

### The schemas — moved, not rewritten

`src/schemas/api/operator-reaction/index.ts`, mirroring the sibling
`src/schemas/api/claim-reaction/index.ts` one level down. Copied verbatim from
the server file, with the two imports re-pointed at their local paths
(`OperatorReasonCodeSchema` from `../../review.js`, `EncodableDate` from
`../../common.js` — they were already coming from `@proposit/shared`).

Exported: `OperatorDecisionSchema`, `OperatorReactionCreateRequest`,
`OperatorReactionSelectionSchema`, `OperatorDecisionCountsSchema`,
`OperatorReactionSchema`, `OperatorReactionCreateResponse`,
`OperatorReactionDeleteResponse`, `OperatorReactionGetResponse`,
`OperatorReactionMapResponse`, plus the `Static<>` types.

Two deliberate deltas from the server original, both widening:

- `OperatorReactionSchema` becomes **exported**. It was module-private there
  because only two response wrappers used it; a consumer that renders a returned
  row needs to name its type.
- The `Static<>` type aliases are added. The server file exported only
  `TOperatorReactionCreateRequest` because its client half had hand-written
  interfaces in `src/types/operator-reactions.ts` to lean on. Mobile has no such
  file and should not grow one — that is the duplicate-identity-rule shape.

**`package.json` `exports` gains one entry**, `./schemas/api/operator-reaction`,
with `types` + `import` + `default`. This is a genuinely new prefix: the
`./schemas/*` wildcard resolves `./dist/schemas/api/operator-reaction.js`, and
the built artefact is `…/operator-reaction/index.js`, which that pattern does not
reach. (Contrast `./engine/*`, under which item 3's file needs no entry.)

### The client methods

`src/api-client/argument/operator-reactions.ts`, mirroring
`claim-reactions.ts`:

```ts
createOperatorReactionImpl(config, argumentId, version, premiseId, data)
deleteOperatorReactionImpl(config, argumentId, version, premiseId)
getOperatorReactionMapImpl(config, argumentId, version)
```

Create goes through `strictFetch` (it has a JSON body to validate before send);
delete and the map read go through `parseResponse`, exactly as their claim-level
counterparts do.

**Ids are interpolated, not `encodeURIComponent`-wrapped.** Web's
`reactionsUrl` wraps them; every method in this repo's api-client interpolates
raw. Both are correct — these are UUIDs from the server, and the encoded form of
a UUID is itself — and matching the twenty neighbours here beats matching the one
caller over there. This is not the `searchUsername` case, where the value is a
human-typed handle that genuinely contains a slash.

## Response-shape verification

The whole "no-op for web" claim rests on this, so it is checked against the
consumer rather than asserted:

- `OperatorReactionGetResponse` is `{ counts: { accept, reject }, own }`. Web's
  `OperatorReactionsProvider` seeds state from a `TOperatorReactionMap` and reads
  `state.counts` / `state.own`, with `EMPTY_STATE = { counts: { accept: 0,
  reject: 0 }, own: null }`
  (`proposit-server/src/app/view/[argumentId]/[version]/contexts/operator-reactions-context.tsx:28`).
- `own` is `{ decision, reasonCode, expressionId } | null`, which is exactly
  `TOwnOperatorReaction` in `proposit-server/src/types/operator-reactions.ts:13`.
- The map is `Record<premiseId, state>`, which is `TOperatorReactionMap` at
  line 43 of that file, and what
  `getOperatorReactionMap` in `src/model/premise/operator-reactions.ts:269`
  returns.

A test asserts the shapes structurally rather than trusting the copy.

## Acceptance criteria

1. Each of the three methods issues one request to the URL the route is mounted
   at, with the right verb.
2. `createOperatorReaction` validates its body before sending — an invalid
   `decision` is refused client-side rather than round-tripping.
3. `getOperatorReactionMap` parses a multi-premise body and returns an entry only
   for premises present in it; a premise nobody decided is simply absent.
4. The parsed `own` and `counts` shapes match the web context's expectations
   field-for-field.
5. `pnpm run check` green.

## What this cannot verify, and who owns it

The escalation's test cases include three that are **not** shared's to answer,
recorded here so nobody reads a green suite as covering them:

- *"A premise decision survives a reload"* — a round trip through the real route
  and DB. Server-side behaviour, already covered by
  `…/reactions/__tests__/route.test.ts`.
- *"Wizard and header do not double-record"* — the one-way write invariant
  between the reaction store and the review draft. That separation is enforced by
  the consumers; the api-client writes exactly what it is told to.
- *"A non-rejectable premise accepts an accept and refuses a reject"* —
  `buildOperatorQueue` → `TOperatorQueueEntry.rejectable` already decides this,
  and it is a UI gate. An api-client method that silently refused a caller's
  write would be worse: it would put a second, invisible copy of the rule here.

## Risks

- **The schemas exist twice until the publish window.** Server keeps its local
  copy (it cannot import the new path until it repins), so for one window the
  contract is written down in two places and could drift. Mitigated by copying
  verbatim and by the follow-up being recorded rather than assumed.
