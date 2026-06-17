---
date: 2026-06-17
---

# Release notes — upcoming

> Requires `@proposit/proposit-core` `^3.0.0`. Install the new core major
> alongside this release.

This release renames the ingestion pipelines from version labels to role
names and lets a caller choose how thoroughly an argument is imported.

## What changed for consumers

### Breaking

- The ingestion-pipeline selection at
  `@proposit/shared/schemas/ingest-argument` is now named by **role** instead
  of version. `IngestionPipelineVersionSchema` is renamed
  `IngestionPipelineSchema`, its values change from `"v1-single-shot"` /
  `"v2-multi-stage"` to **`"scholar"`** / **`"scribe"`**, and the derived type
  `TIngestionPipelineVersion` is renamed `TIngestionPipeline`. Code importing
  the old names must update.
- The `IngestArgumentTaskInputSchema` field `pipelineVersion` is renamed
  **`pipeline`**.

### New

- `CreateArgumentSchema` (`@proposit/shared/schemas/api/argument`) accepts an
  optional **`mode`** of `"fast"` or `"thorough"` — the user-facing import
  depth selector. Omitting `mode` is unchanged behavior, so existing callers
  are unaffected.
- The persisted `argument_create` task data
  (`@proposit/shared/schemas/tasks`) carries an optional **`pipeline`** role,
  so the resolved import depth travels with the task. It is optional purely so
  tasks created before this release still validate; new tasks always carry it.
