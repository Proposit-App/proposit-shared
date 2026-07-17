# Changelog — upcoming

<!-- Add changelog entries here -->

## Added

- `createApiClient` factory: new `build(argumentId, version, body)` method. Thin,
  non-streaming mirror of `importArgument` — POSTs an `ArgumentBuilderRequest` to
  `/api/v1/argument/{argumentId}/{version}/build` and validates the returned
  `Task` against `TaskSchema`. Purely additive; no schema or back-compat changes.

## Changed

- Docs: drop the dead `docs/inbox` entry from `.prettierignore` (the `docs/inbox` change-request pattern is retired in favour of `tcw work`).
