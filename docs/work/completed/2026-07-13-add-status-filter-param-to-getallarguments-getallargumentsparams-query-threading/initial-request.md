# Add status/attribute filter param to getAllArguments (GetAllArgumentsParams + query threading)

Shared-library slice of the cross-node effort **server-side status/attribute
filtering for the argument catalog**. The server-handler slice (SQL filter before
limit/offset) is a separate proposit-server slice that adopts this once published.

## Scope (shared only)

- Extend `GetAllArgumentsParams` (the api-client params for `getAllArguments`) with
  an optional **status** filter param, matching the buckets mobile already uses in
  `argument-filter.ts`: `unpublished` | `published` | `archived`. Consider whether
  the broader author/topic/tag attribute filters the capability wording implies
  belong here now or are deferred — decide at planning; at minimum ship `status`.
- Thread the new param(s) into the request query string built by `createApiClient`'s
  `getAllArguments` call. Keep every new param **optional** (back-compat: omitting
  it preserves current behavior).

## Out of scope (other slices)

- The server SQL handler that applies the filter before pagination — proposit-server slice.
- Mobile's swap from client-side bucket filtering to the server param — mobile slice, deferred.

## Back-compat / test cases (shared side)

- Params schema accepts the new optional filter; existing callers that omit it typecheck and behave unchanged.
- When provided, the param is serialized into the request query string correctly.

## Origin

Escalated from proposit-mobile; root cross-node item
`2026-07-12-server-side-status-attribute-filtering-for-the-argument-catalog-getallarguments`.
