# Outcome: Expose the premise operator-reaction route through the api-client factory

## What shipped

| File | Change |
| --- | --- |
| `src/schemas/api/operator-reaction/index.ts` | new — the wire bodies, moved out of the server route folder |
| `src/api-client/argument/operator-reactions.ts` | new — three `*Impl` functions |
| `src/api-client/factory.ts` | import + three `impls` keys, directly after the claim-reaction block |
| `src/api-client/argument/__tests__/operator-reactions.test.ts` | new — 6 cases |
| `package.json` | one `exports` entry: `./schemas/api/operator-reaction` |

### Exported signatures

On `TApiClient`:

```ts
createOperatorReaction: (
    argumentId: string,
    version: number,
    premiseId: string,
    data: TOperatorReactionCreateRequest
) => …                       // POST …/argument/{id}/{v}/premise/{pid}/reactions

deleteOperatorReaction: (
    argumentId: string,
    version: number,
    premiseId: string
) => …                       // DELETE …/argument/{id}/{v}/premise/{pid}/reactions

getOperatorReactionMap: (
    argumentId: string,
    version: number
) => …                       // GET …/argument/{id}/{v}/premise-reactions
```

From `@proposit/shared/schemas/api/operator-reaction`:
`OperatorDecisionSchema`, `OperatorReactionCreateRequest`,
`OperatorReactionSelectionSchema`, `OperatorDecisionCountsSchema`,
`OperatorReactionSchema`, `OperatorReactionCreateResponse`,
`OperatorReactionDeleteResponse`, `OperatorReactionGetResponse`,
`OperatorReactionMapResponse`, and the `Static<>` aliases
(`TOperatorDecision`, `TOperatorReactionCreateRequest`,
`TOperatorReactionSelection`, `TOperatorDecisionCounts`, `TOperatorReaction`,
`TOperatorReactionCreateResponse`, `TOperatorReactionDeleteResponse`,
`TOperatorReactionGetResponse`, `TOperatorReactionMapResponse`).

`create` goes through `strictFetch`; `delete` and the map read go through
`parseResponse` — matching `claim-reactions.ts` exactly.

## How the response shape was verified against the web consumer

Three independent checks, because "adopting the client is a no-op for web" is the
load-bearing claim of this item and reading the file is not evidence.

**1. The schema declarations are byte-identical to the server's.** Stripping
comments and blank lines from both files and diffing leaves exactly two
differences, both intended:

```
< import { OperatorReasonCodeSchema } from "@proposit/shared/schemas/review"
< import { EncodableDate } from "@proposit/shared/schemas/common"
---
> import { EncodableDate } from "../../common.js"
> import { OperatorReasonCodeSchema } from "../../review.js"
```

plus the relocated `TOperatorReactionCreateRequest` alias. Every `Type.*`
declaration is character-for-character the original. The two re-pointed imports
were *already* resolving to this package, so they are the same symbols.

**2. Field-for-field against what the context actually reads.**
`OperatorReactionGetResponse` is `{ counts: { accept, reject }, own }` and `own`
is `{ decision, reasonCode, expressionId } | null`. Checked against:

- `EMPTY_STATE = { counts: { accept: 0, reject: 0 }, own: null }` —
  `proposit-server/…/contexts/operator-reactions-context.tsx:28`
- `TOwnOperatorReaction { decision, reasonCode, expressionId }` —
  `proposit-server/src/types/operator-reactions.ts:13`
- `TOperatorReactionMap = Record<string, TOperatorReactionState>` — line 43 of
  the same file, and the return type of `getOperatorReactionMap` in
  `proposit-server/src/model/premise/operator-reactions.ts:269`.

**3. A runtime test asserts the parsed entry structurally**, not just that a
request went out: a two-premise map body parses to those exact objects, and
`createdOn` arrives as a `Date` (the `EncodableDate` decode), matching the
claim-reaction suite's expectation of the same field.

The new subpath was resolved through the real `exports` map after a build, not
assumed: `require.resolve("@proposit/shared/schemas/api/operator-reaction")` →
`dist/schemas/api/operator-reaction/index.js`. It needed the explicit entry — the
`./schemas/*` wildcard would have looked for `…/operator-reaction.js`, and the
build emits `…/operator-reaction/index.js`.

## How it was verified

TDD: the first run failed all six cases with `TypeError:
apiClient.createOperatorReaction is not a function` (and the delete/map
equivalents) before any implementation existed.

The pre-send validation case asserts **no fetch was recorded**, not merely that
the call rejected. A test that only checked for a throw would pass just as well
if the invalid body had gone out and the route had refused it, which is the
opposite of what `strictFetch`'s `Value.Assert` is there for.

`pnpm run check` green: 128 files, 1218 tests, typecheck, lint, build.

## Deliberately not done

- **No single-premise `getOperatorReaction`.** The route serves one and the claim
  level has one, but no consumer asked: web seeds server-side during SSR, mobile
  wants the bulk read. Two lines whenever a caller appears.
- **No optimistic-state helpers.** `applyDecision` / `clearOwnDecision` stay in
  the server's `operator-decision-state.ts`; promoting them was not part of the
  request.
- **No `encodeURIComponent` on the ids.** Web's `reactionsUrl` wraps them; every
  method in this repo's api-client interpolates raw, and these are
  server-generated UUIDs whose encoded form is themselves. Matching the twenty
  neighbours here beat matching the one caller over there.

## Follow-ups this item does NOT do

- **`proposit-server` adoption.** Delete
  `src/app/api/v1/argument/[argumentId]/[version]/premise/[premiseId]/reactions/schemas.ts`,
  repoint `route.ts`, `premise-reactions/route.ts`, and
  `operator-reactions-context.tsx` at
  `@proposit/shared/schemas/api/operator-reaction`, and swap the context's two
  `strictFetch` calls for the factory methods. Needs the repin, so it is gated on
  the epic's publish window.
- **Until then the contract exists twice** — here and in the server route folder.
  Byte-identical today; the follow-up above is what stops it drifting.

## What a green suite here does not mean

Three of the escalation's test cases are not shared's to answer, and are named
in `spec.md` under "What this cannot verify": reload persistence (server route
behaviour, already covered by the route's own suite), the wizard/header one-way
write invariant (a consumer separation spanning two stores), and operator-queue
rejectability (a UI gate that `buildOperatorQueue` already owns — enforcing it a
second time in the api-client would be the duplicated-rule defect this workspace
keeps hitting).
