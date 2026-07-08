# Add importArgument api-client method for raw-text import

**From:** proposit-mobile (cross-node escalation) · **Initiative:** Mobile v1 — Manual-light authoring (`ai-assisted-argument-creation` child)

## Product changes

None directly (library method). Unblocks two mobile capabilities downstream:
`authoring#import-an-argument-from-raw-text` and
`authoring#track-and-cancel-an-in-progress-build-or-import`.

## Technical changes

The `createApiClient` factory exposes **no method for the `/import/*` routes**. It
has `createArgument` (`manual`-only, synchronous, returns a full `Argument`),
nothing hitting `POST /api/v1/argument/import/{origin}`. The route is currently
called only by the web app via a hand-rolled `fetch`
(`proposit-server/src/components/client/forms/create-arg-methods.tsx:89` —
`createArgumentTask`); mobile must not duplicate that reach-around.

Add to the factory, mirroring `createArgumentImpl` and the server helper:

```
importArgument(data: TCreateArgument): Promise<Result<TArgumentCreateTask>>
  → POST /api/v1/argument/import/{data.origin}
```

- Request body: `TCreateArgument` (`CreateArgumentSchema`, already in
  `schemas/api/argument`).
- Response: `ArgumentCreateTask` (`schemas/tasks`).
- `origin` selects the path segment (origin-general like web's helper; `raw_text`
  is the v1 consumer).

The task surface (`getTaskPipeline`, `cancelTask`, `retryTask`) already exists.

Test cases:

- `importArgument({ origin: "raw_text", data: { textContent: "..." }, mode: "fast" })`
  POSTs to `/api/v1/argument/import/raw_text` and resolves `ok` with an
  `ArgumentCreateTask` (has `data.argumentId` / `data.version`).
- `origin` is reflected in the path segment.
- A failure envelope (e.g. 409 already-running) narrows through the `Result` error
  branch.

## Meta changes

None.
