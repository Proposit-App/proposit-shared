# Outcome — api-client `build()` method

## Shipped

- `buildArgumentImpl` in `src/api-client/argument/index.ts`: non-streaming, mirrors
  `importArgumentImpl`. POSTs an `ArgumentBuilderRequest` to
  `/api/v1/argument/{argumentId}/{version}/build`, validates the returned `Task`
  against `TaskSchema`.
- Registered `build: buildArgumentImpl` in the factory `impls`
  (`src/api-client/factory.ts`). The `TApiClient` mapped type auto-derived the
  method — no manual interface edit (confirmed `readonly build` in the built
  `factory.d.ts`).
- Test: `src/api-client/argument/__tests__/build-argument.test.ts` — turn parse,
  path threading, 409-surfaces-as-error. TDD (red first).
- Response validation target: full `TaskSchema` union (decided).
- Changelog + release-notes entries recorded.

## Verification

- `pnpm run check` green (typecheck, lint, 754 tests, build).
- Consumer check: packed `proposit-shared-0.42.1.tgz`, installed into
  `proposit-mobile` (`file:` pin), confirmed `apiClient.build` resolves in the
  installed types and `proposit-mobile` typecheck passes.

## Release mechanism

Consumed by mobile via **tarball**, not an npm publish (workspace decision — no
version cut). The mobile `file:` pin is a local-dev override (uncommitted; the
`.tgz` is gitignored), to be replaced by a real published version if/when shared
is published.

## Unblocks

Slice 2 (`proposit-mobile/2026-07-08-chat-builder-...`) — the mobile chat-builder
UI can now build against the real `build()` method.
