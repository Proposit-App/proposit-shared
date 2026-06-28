# Initial request — Publicly export Argument Builder request/response schemas

**Initiative:** [`2026-06-21-builder-pipeline-family-socratic-argument-builder-into-core`](../../../../../docs/work/active/2026-06-21-builder-pipeline-family-socratic-argument-builder-into-core) (epic)
**Node:** proposit-shared
**Release:** minor 0.26.0 → **0.27.0**

## The ask

Make `ArgumentBuilderRequestSchema` + response variants publicly exported from the package entry point. These schemas are already defined in shared but not publicly accessible.

## Scope (per epic spec §8)

- Publicly export `ArgumentBuilderRequestSchema` (the `action` union: `review` | `finalize` | `simulate_user`)
- Export the associated response schemas
- The `action` union already maps to the three builder turns

## What stays unchanged

- No conversational-turn types need to move to shared (they stay in core per epic spec §6)
- No schema structure changes — only visibility
- No capability delta — export visibility only, no user-facing change

## Verification

- The exported schemas are importable from the package entry
- The `action` union still maps to the three turns
- Build passes (`pnpm run build`); no breaking changes to existing exports

## Dependencies

- Independent — does not consume core's new code
