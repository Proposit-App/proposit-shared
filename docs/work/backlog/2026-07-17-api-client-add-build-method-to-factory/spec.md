# Spec — api-client `build()` method

## Goal

Expose the existing server build endpoint through the shared api-client factory,
so consumers (mobile chat builder) call `client.build(...)` instead of hand-rolling
the fetch. One new method; no schema, no server, no streaming.

## Behavior

`build(argumentId: string, version: number, body: TArgumentBuilderRequest): Promise<TTask>`

- POSTs `body` to `/api/v1/argument/${argumentId}/${version}/build`.
- Validates the request body against `ArgumentBuilderRequestSchema` and the
  response against `TaskSchema` (the task union — the returned task's concrete
  type is one of `argument_build_review|finalize|simulate_user`, selected by
  `body.action`, so the union is the right validation target).
- Non-streaming: the server route returns the created task synchronously, exactly
  like `importArgument`. Consumers poll `listTasks` for completion (RN has no
  `EventSource`).

## Out of scope

- No streaming/SSE variant.
- No schema changes (`build.ts` + task literals already ship in 0.42.x).
- Consumer wiring (mobile) — that's Slice 2.

## Acceptance

- `client.build(id, version, body)` compiles with correct types and is present on
  `TApiClient`.
- A shared test asserts request shape (URL + method + body validation) and that a
  well-formed build task response validates.
- `pnpm run check` green.
