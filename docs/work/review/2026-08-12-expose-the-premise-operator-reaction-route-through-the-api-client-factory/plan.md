# Plan: Expose the premise operator-reaction route through the api-client factory

Schemas first, then the failing client test, then the methods. Ordered so the
tree typechecks at each commit.

## Task 1 — The wire bodies in shared

`src/schemas/api/operator-reaction/index.ts`, copied from
`proposit-server/src/app/api/v1/argument/[argumentId]/[version]/premise/[premiseId]/reactions/schemas.ts`
with:

- imports re-pointed: `OperatorReasonCodeSchema` → `../../review.js`,
  `EncodableDate` → `../../common.js` (both were already
  `@proposit/shared` imports over there, so this is a path change, not a
  redefinition);
- `OperatorReactionSchema` exported rather than module-private;
- `Static<>` aliases added for every exported schema;
- the leading comment rewritten — the original explains why the bodies live in
  the server, which stops being true the moment the file moves.

Add `./schemas/api/operator-reaction` to `package.json` `exports` with `types`,
`import`, **and** `default`. Required: the `./schemas/*` wildcard would resolve
`dist/schemas/api/operator-reaction.js`, but the build emits
`…/operator-reaction/index.js`.

**Verified by:** `pnpm run typecheck` and a `node -e` resolution check of the new
subpath against `dist/` after `pnpm run build`.

## Task 2 — Failing test for three methods that do not exist

`src/api-client/argument/__tests__/operator-reactions.test.ts`, modelled on the
sibling `claim-reactions.test.ts`.

Cases:

1. `createOperatorReaction` — POSTs to
   `…/argument/{id}/{v}/premise/{pid}/reactions` with the decision body; the
   parsed `addedReaction` round-trips.
2. `createOperatorReaction` refuses an invalid `decision` **before** the network
   — `strictFetch`'s pre-send `Value.Assert` throws and no fetch is recorded.
   Asserting "no call was made" is the point; asserting only that it threw would
   pass on a server-side rejection too.
3. `deleteOperatorReaction` — DELETEs the same URL, parses `removedReaction`.
4. `getOperatorReactionMap` — GETs `…/argument/{id}/{v}/premise-reactions`,
   parses a two-premise body, and a premise absent from the body is absent from
   the map (not a zeroed entry — zeroing is the *consumer's* `EMPTY_STATE`
   default, and putting it here too would be the rule written twice).
5. Shape parity with the web consumer: the parsed entry has `counts.accept`,
   `counts.reject`, and an `own` of `{ decision, reasonCode, expressionId }` or
   `null`.

**Fails for the right reason first:** the three keys are not on `TApiClient`, so
the calls are `undefined` at runtime. Confirm that before implementing.

## Task 3 — The three `*Impl` functions

`src/api-client/argument/operator-reactions.ts`. `createOperatorReactionImpl`
uses `strictFetch` (JSON body); the other two use `parseResponse`. All three take
`resolveBaseUrl(config)` and interpolate ids, matching `claim-reactions.ts`.

**Verified by:** Task 2's cases pass.

## Task 4 — Register on the factory

Import the three into `src/api-client/factory.ts` and add them to `impls`
directly after the `claim-reaction` block, so the registry's grouping keeps
matching the file layout.

**Verified by:** `pnpm run typecheck`; `TApiClient` exposes all three.

## Task 5 — Green the pipeline

`pnpm run check`.

## Documentation Sync

- **`AGENTS.md` — fires, narrowly.** Its "Package structure" list names
  representative `./schemas/api/*` sub-paths. It is explicitly *representative,
  not authoritative* ("`package.json` `exports` is the authoritative, full map"),
  and it does not enumerate `claim-reaction` either — so a new peer of an
  unlisted entry does not change anything the file asserts. **Net: no edit.**
- **Release notes / changelog** — deferred to the version cut at epic closeout,
  with the rest of the epic's shared changes.

## Verification

Covered by the suite: URLs, verbs, pre-send validation, map parsing, shape
parity with the web context's field reads.

Not covered, and not claimed:

- **Round-tripping against the live route.** `fetchImpl` is stubbed. The routes
  are untouched and already serve web.
- **The three behaviours listed under "What this cannot verify" in `spec.md`** —
  reload persistence, the wizard/header one-way write invariant, and
  queue rejectability. All three belong to consumers, and two of them span two
  apps.
- **That web's adoption is truly a no-op.** It cannot be run until the server
  repins. The structural check in case 5 is the strongest evidence available from
  this side, and the follow-up is recorded rather than assumed done.
