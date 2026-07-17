# Plan — api-client `build()` method

Mirror `importArgumentImpl`. Three edits + one test. TDD: write the failing test
first.

## 1. Test (write first) — `src/api-client/argument/__tests__/build-argument.test.ts`

Copy the `import-argument.test.ts` harness (`makeJsonResponse`, `urlToString`,
mocked `fetchImpl`, `createApiClient`). Assert:

- `build(argumentId, version, body)` POSTs to
  `/api/v1/argument/${argumentId}/${version}/build`, method `POST`.
- The sent body round-trips `action` + `newPrompts` (+ optional `lastResponseId`).
- A well-formed build task response (`type: "argument_build_review"`, with
  `resultData: { tokensUsed, output: <ChatEntry> }`) validates → `result.ok`,
  `result.value.type === "argument_build_review"`.
- A 409 (build already running) surfaces as `result.ok === false` — the one
  failure mode this method exposes; `strictFetch` owns the rest of the status
  handling (already covered by its own tests), so no 400/404/500 matrix here.

Run → red (no `build` on the client).

## 2. Impl — `src/api-client/argument/index.ts`

```ts
export async function buildArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    body: TArgumentBuilderRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/build`,
        { method: "POST" },
        body,
        ArgumentBuilderRequestSchema,
        TaskSchema,
        config.fetchImpl
    )
}
```

Import `ArgumentBuilderRequestSchema` + `TArgumentBuilderRequest` from
`../../schemas/api/argument/build.js`, and `TaskSchema` from
`../../schemas/tasks.js` (match the existing relative-`.js` import style; check
whether these are already imported in this file first).

## 3. Register — `src/api-client/factory.ts`

- Add `buildArgumentImpl` to the `./argument/index.js` import block.
- Add `build: buildArgumentImpl,` to the `impls` registry. The mapped type
  `TApiClient` derives `build` onto the client interface automatically — no manual
  interface edit needed (confirm: `impls` drives the `[K in keyof typeof impls]`
  mapping at factory.ts:203).

## 4. Verify

- `pnpm run test` (the new spec green).
- `pnpm run check` (typecheck + lint + full suite).
- Confirm `client.build` is typed `(argumentId, version, body) => Promise<...>`.

## Release

After merge: `pnpm version patch` (additive) → mobile repins `@proposit/shared`
→ Slice 2 proceeds. Publish is gated on consumer-side validation at the
orchestrator root (do not `pnpm publish` from here).

## Notes

- **Response validation target — decided: full `TaskSchema` union.** Simpler and
  matches how `importArgument` trusts its route; the endpoint only ever returns a
  build task, so the wide union is harmless. (The tighter `Type.Union` of just the
  three `argument_build_*` schemas was considered and set aside.)
