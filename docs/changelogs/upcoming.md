# Upcoming changelog

This file accumulates the developer-facing changelog for the next
published version of `@proposit/shared`. At release time it is renamed
to `docs/changelogs/v{version}.md` and a fresh `upcoming.md` is
started.

Minor release on the `pipeline-status/2F.A` branch — additive only,
no breaking changes. Lands the wire-contract surface that
`proposit-server` slice 2F's pipeline-status UI consumes.

## Schemas — new pipeline-status response sub-entry

- **Add:** `src/schemas/api/pipeline-status/schema.ts`. Defines
  `GetPipelineStatusResponseSchema` (§8.1 wire shape:
  `{ run: PipelineRun | null, stages: PipelineStage[] }`),
  `GetPipelineStagePayloadsResponseSchema` (§8.2:
  `{ payloads: PipelineStagePayload[] }`), plus the building blocks
  (`PipelineRunSchema`, `PipelineStageSchema`,
  `PipelineStagePayloadSchema`, `PipelineOutputStatusSchema`,
  `PipelineStageOutcomeSchema`, `ProcessingFailureSchema`,
  `TokenUsageSchema`) and their derived `T*` types.
  `outputStatus` / `outcome` are explicit `Type.Union([..., Type.Null()])`
  rather than `Type.Optional(...)` — the spec calls the fields
  nullable-but-always-present.
  Commit `362bc1c`.
- **Add:** `src/schemas/api/pipeline-status/index.ts` — barrel
  re-exporting everything from `./schema.js`.
  Commit `362bc1c`.
- **Add:** `src/schemas/api/pipeline-status/__tests__/schema.test.ts`
  — 44 TypeBox `Value.Check` / `Value.Parse` tests covering each
  sub-schema's accept/reject paths (terminal vs. still-running rows,
  deterministic-stage `tokenUsage: null`, retry-with-failure stages,
  unknown literal rejection, missing-required-field rejection,
  date-time format enforcement via `Value.Parse`), plus the empty-state
  `{ run: null, stages: [] }` round-trip on `GetPipelineStatusResponseSchema`.
  Commit `362bc1c`.

### Internal: `TProcessingFailure` / `TLlmTokenUsage` parity

`schema.ts` declares local TypeBox values for the two core-owned
types because `@proposit/proposit-core@1.1.1` ships only the TS
types. Each local schema is locked to core's type at compile time
via mutual-assignment assertions (the same shape the existing
`processing-failure-reexport.test.ts` uses for type-only parity).
When core publishes runtime `ProcessingFailureSchema` /
`LlmTokenUsageSchema` values, both the local schema here and the
type-only re-export at `src/schemas/processing-failure.ts` can be
replaced by the upstream values in lockstep — no wire-format change
required.

## API-client — pipeline-status method pair

- **Add:** `src/api-client/tasks/pipeline-status.ts`. Two `*Impl`
  functions:
    - `getTaskPipelineImpl(config, taskId)` — `GET /api/v1/task/[taskId]/pipeline`,
      parses against `GetPipelineStatusResponseSchema`.
    - `getTaskPipelineStagePayloadsImpl(config, taskId, stageRowId)` —
      `GET /api/v1/task/[taskId]/pipeline/stages/[stageRowId]/payloads`,
      parses against `GetPipelineStagePayloadsResponseSchema`.
      Path params are percent-encoded via `encodeURIComponent` so embedded
      slashes / spaces stay a single path segment. Both use the standard
      `parseResponse(...)` validation path; staff-side 403 enforcement is
      server-side and surfaces here as a parsed error reply.
      Commit `362bc1c`.
- **Modify:** `src/api-client/factory.ts`. Two new keys registered
  in the `impls` registry: `getTaskPipeline` and
  `getTaskPipelineStagePayloads`. The mapped-type `TApiClient`
  derives both new method signatures automatically — no manual
  type wiring.
  Commit `362bc1c`.
- **Add:** `src/api-client/tasks/__tests__/pipeline-status.test.ts`
  — 7 mock-fetch tests: URL shape + GET method for both endpoints,
  200 + empty-state response shapes, percent-encoding of `taskId`
  (and of both `taskId` + `stageRowId` for the staff endpoint), and
  a 403 path that surfaces as a parsed error reply (`result.ok === false`).
  Commit `362bc1c`.

## Package.json exports

- **Modify:** `package.json`. New sub-entry export for
  `./schemas/api/pipeline-status`, slotted alphabetically between
  `./schemas/api/grammar-violations` and `./schemas/api/reaction`.
  All three conditions (`types`, `import`, `default`) populated per
  shared's CLAUDE.md design rule. No peer-dep range change.
  Commit `362bc1c`.

## Test and check state

- 420 / 420 tests pass across 53 test files (369 + 51 new).
- `pnpm run check` is green (typecheck, prettify, eslint, vitest,
  build).

## Out of scope

- No `proposit-server` consumer work — slice 2F lands separately
  after this shared minor publishes. Server flips its `@proposit/shared`
  dep to `^{this-version}` as part of 2F.
- No `proposit-mobile` consumer work — mobile is read-only for
  pipeline observability (parent spec §10).
- No upstream `proposit-core` change is required for this slice.
  `proposit-core@1.2.0` (the `stage:llm-call` event variant from
  slice 2C.A) is consumed by server's persistence bridge, not by
  shared. The new sub-entry adds zero new core surface.

## Docs

- **Add:** `docs/release-notes/upcoming.md` — user-facing notes.
- **Add:** `docs/changelogs/upcoming.md` — this file.
