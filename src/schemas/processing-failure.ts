// Re-export of the pipeline ProcessingFailure wire format from
// `@proposit/proposit-core`. Server and mobile import the type through
// `@proposit/shared/schemas/processing-failure` for the ergonomic
// single-import path; the source of truth is core (its
// `src/lib/pipelines/types.ts`).
//
// Mirrors the grammar wire-format re-export at `./schemas/grammar`
// (introduced in shared 0.9.0 during the Grammar Tiers initiative). Same
// coordination chain: adding or extending the ProcessingFailure shape
// is a core → shared → consumers publish chain; shared bumps minor
// (no code changes here — the re-export automatically reflects core's
// shape via the dep range).
//
// As of `@proposit/proposit-core@1.1.1` (slice 1A of the ingestion
// pipeline initiative), only the TypeScript type `TProcessingFailure`
// ships from core — no TypeBox `ProcessingFailureSchema` runtime value
// is exported yet. This file is intentionally type-only for now; when a
// future core minor adds the runtime schema, extend this re-export to
// include the value alongside the type (same template as
// `./schemas/grammar/index.ts`).

export type { TProcessingFailure } from "@proposit/proposit-core"
