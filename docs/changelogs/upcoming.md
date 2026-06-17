---
date: 2026-06-17
---

# Changelog — upcoming

> Requires `@proposit/proposit-core` `^3.0.0`.

## Breaking

- `@proposit/shared/schemas/ingest-argument`: `IngestionPipelineVersionSchema`
  → `IngestionPipelineSchema`; its union members `"v1-single-shot"` /
  `"v2-multi-stage"` → `"scholar"` / `"scribe"`; derived type
  `TIngestionPipelineVersion` → `TIngestionPipeline`.
- `@proposit/shared/schemas/ingest-argument`: the
  `IngestArgumentTaskInputSchema` field `pipelineVersion` → `pipeline` (now
  referencing the role union).

## Added

- `@proposit/shared/schemas/api/argument`: `CreateArgumentSchema` gains an
  optional top-level `mode: "fast" | "thorough"` (and `TCreateArgument` gains
  `mode?`). Additive — bodies that omit `mode` still validate. The server maps
  `mode` to a pipeline role (`fast` → `scribe`, `thorough` → `scholar`),
  falling back to its configured default when absent.
- `@proposit/shared/schemas/tasks`: `ArgumentCreateTask.data` gains an optional
  `pipeline: TIngestionPipeline`, the resolved import role persisted at task
  creation so the executor reads it instead of re-resolving from
  configuration. Optional only to tolerate task rows persisted before this
  field existed; `additionalProperties: false` still rejects unknown keys.
  `tasks.ts` now imports `IngestionPipelineSchema` from `./ingest-argument` as
  the single source of truth for the role union.
