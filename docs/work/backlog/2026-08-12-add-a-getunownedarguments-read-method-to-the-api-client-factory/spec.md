# Spec: Add a getUnownedArguments read method to the api-client factory

## Capability changes

None. The user-facing capability this unblocks —
`proposit-shared/arguments/claim-my-external-post-argument` — is already
`Supported` in this node's master ledger (the web app ships it). The `Missing`
status is a **mobile-node override**, and flipping it is the owning mobile
slice's deliverable, not this item's. This item ships library plumbing with no
product delta of its own.

## Problem

`@proposit/shared` 0.67.0 exposes the *write* half of the unowned-argument flow
(`claimUnownedArgumentImpl`, `src/api-client/argument/index.ts:161`, wired at
`src/api-client/factory.ts:137`) but no *read* half. A consumer can claim an
argument it already knows about; it cannot ask which arguments are claimable.

The server side is complete and unchanged by this item:

| Route                                              | Returns                     |
| -------------------------------------------------- | --------------------------- |
| `GET /api/v1/argument/unowned`                       | `TArgument[]`               |
| `GET /api/v1/argument/unowned/{argumentId}/{version}` | `TUnownedArgument \| null`  |
| `DELETE`, `POST …/take` on the same paths            | (already reachable / n/a)   |

The list route is auth-scoped: `getVerifiedUserId(request)` →
`getUnownedArgumentsByUserId({ userId })`
(`proposit-server/src/model/argument/unowned.ts`), which joins `unownedArguments`
to `arguments` and selects `arguments.*`. Hence **full arguments, not
`unownedArguments` rows** — confirmed by the web consumer
`proposit-server/src/app/profile/unowned-args-list.tsx:15`, whose prop type is
`TArgument[]` and which reads `arg.id`, `arg.version`, `arg.title`,
`arg.createdOn`, `arg.platform`, and `arg.platformData`.

The per-argument route is different in kind: it returns the `unownedArguments`
**row** (`argumentId`, `version`, `platform`, `platformUsername`, `userId`), and
returns `null` — at HTTP 200 — when no such row exists. It is not auth-scoped.

## Goals

1. `apiClient.getUnownedArguments()` returns the signed-in caller's claimable
   arguments as `TArgument[]`, and an empty array (not an error) when there are
   none.
2. `apiClient.getUnownedArgument(argumentId, version)` returns the
   `TUnownedArgument` row, or `null` when the argument has no unowned entry.
3. An unauthenticated caller does not receive data.
4. The list shape is identical to what `unowned-args-list.tsx` renders today, so
   adopting the client on web would be a behavioral no-op.

## Non-goals

- **No server changes.** The routes, the model, and the table are all complete.
- **No new schema.** `ArgumentSchema` and `UnownedArgumentSchema` already
  describe both response bodies exactly; declaring a wrapper schema for either
  would be a second definition of a shape that is already correct.
- **No publish.** The release for this epic is deliberately deferred to epic
  closeout; mobile consumes this via a `file:` tarball pin in the meantime.
- **No new api-client sub-path.** `@proposit/shared/api-client` already exports
  the factory; these are two more methods on it.

## Design

Two `*Impl` functions in `src/api-client/argument/index.ts`, immediately
alongside the existing `claimUnownedArgumentImpl`, registered in
`src/api-client/factory.ts`'s `impls` map. Placement is deliberate: all three
unowned-argument methods stay adjacent and the diff stays two files.

```ts
getUnownedArgumentsImpl(config) // → parseResponse(…, Type.Array(ArgumentSchema))
getUnownedArgumentImpl(config, argumentId, version)
                                // → parseResponse(…, Nullable(UnownedArgumentSchema))
```

Both use `parseResponse` over `config.fetchImpl` rather than `strictFetch`,
matching every other bodyless GET in this file (`getArgumentForksImpl`,
`getAllArgumentsImpl`): `strictFetch` exists to validate a *request* body, and
these have none.

Three decisions worth recording:

- **`Type.Array(ArgumentSchema)`, not `ArgumentWithMetadataSchema`.** The list
  route selects `arguments.*` with no reaction-count join, so the `upvotes` /
  `downvotes` that `getAllArguments` returns are absent here. Validating against
  the wider schema would reject every real response.
- **`Nullable(UnownedArgumentSchema)` for the single read.** The route answers
  `200` with a JSON `null` body for a miss; a non-nullable schema would turn an
  ordinary empty state into a parse failure.
- **The 401 is plain text, and this item leaves it that way.** The list route
  answers `new Response("Unauthorized", { status: 401 })` — not JSON — so
  `parseResponse`'s `await response.json()` throws rather than returning an
  `{ ok: false, error }` envelope. That is a server-side wart inside a route this
  item may not touch, and normalizing it belongs in `parseResponse` (the root
  normalizer) as its own change, not smuggled in here. The behavior is pinned by
  a test so the rejection is deliberate and documented rather than incidental,
  and recorded for escalation.

## Acceptance criteria

1. `apiClient.getUnownedArguments()` GETs `{baseUrl}/api/v1/argument/unowned` and
   returns `{ ok: true, value: TArgument[] }`.
2. A `200 []` response yields `{ ok: true, value: [] }` — empty, not an error.
3. A `401` from the list route rejects; the caller never receives data.
4. A response body built from the exact fields `unowned-args-list.tsx` reads
   validates against the method's schema and survives the round trip unchanged.
5. `apiClient.getUnownedArgument(id, version)` GETs
   `{baseUrl}/api/v1/argument/unowned/{id}/{version}` and returns the row, or
   `null` for a miss.
6. `pnpm run check` passes.

## Risks

- **`ArgumentSchema` is strict.** `convertAssertDecode` rejects a response that
  does not match, so a drift between `arguments.*` and `ArgumentSchema` surfaces
  here as a client-side throw. This is the intended contract (a mismatch is a
  server bug), but it makes this method stricter than the web page, which does no
  validation at all because it calls the model function in-process.
- **Web does not actually call this route.** `profile/page.tsx:60` invokes
  `getUnownedArgumentsByUserId` directly in a Server Component. "Adopting the
  client is a no-op for web" is therefore a claim about *shape*, verified against
  the component's prop type and field reads — not about a fetch that exists today.
