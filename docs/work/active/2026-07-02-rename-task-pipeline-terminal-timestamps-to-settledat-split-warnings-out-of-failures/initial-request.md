# Rename task/pipeline terminal timestamps to settledAt; split warnings out of failures

## Product changes

None — staff/debug observability wire only.

## Technical changes

Stage 1 of epic `2026-06-21-task-pipeline-schema-honesty-terminal-timestamp-renames-warnings-out-of-failures`
(full rationale + decisions there: `spec.md` §2–3). Scope here is `@proposit/shared` only.

1. `src/schemas/tasks.ts` · `BaseTaskSchema`: `startedOn` → `startedAt`, `completedOn` → `settledAt`.
   Leave `createdOn` unchanged.
2. `src/schemas/api/pipeline-status/schema.ts`:
   - `PipelineRunSchema.finishedAt` → `settledAt`; `PipelineStageSchema.finishedAt` → `settledAt`.
   - `PipelineStageSchema`: add `warnings: Type.Array(ProcessingFailureSchema)` beside `failures`
     (`failures` becomes error-severity only going forward; enforced server-side, not by this schema).
   - Leave `ProcessingFailureSchema` (severity field stays) and `startedAt`/`createdAt` as-is.
3. Tests: round-trip the renamed fields; assert the old names (`startedOn`/`completedOn`/`finishedAt`)
   are rejected (no silent dual-accept); assert `warnings` is present and independent of `failures`.
4. `pnpm run check` green.
5. Version bump: `pnpm version minor` (wire-breaking, pre-1.0 minor); rotate
   `docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md`; tag. **Do not `pnpm publish`** —
   publish is gated on the server child item's consumer-side validation (epic Stage 3).

## Meta changes

None.
