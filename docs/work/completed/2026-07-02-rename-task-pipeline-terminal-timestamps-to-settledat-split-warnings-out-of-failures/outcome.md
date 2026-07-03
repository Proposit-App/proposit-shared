# Outcome

Work completed successfully.

## What changed

- `src/schemas/tasks.ts` — `BaseTaskSchema.startedOn`→`startedAt`, `.completedOn`→`settledAt`.
  `createdOn` untouched.
- `src/schemas/api/pipeline-status/schema.ts` — `PipelineRunSchema.finishedAt`→`settledAt`;
  `PipelineStageSchema.finishedAt`→`settledAt`; added `warnings: Type.Array(ProcessingFailureSchema)`
  as a sibling of `failures` on `PipelineStageSchema`.
- All in-repo call sites (test fixtures across 8 test files) updated to the new field names.
- Version cut to `v0.32.0` (minor — wire-breaking rename is pre-1.0). Release notes + changelog
  written. Tagged `v0.32.0` locally, **not pushed**, **not published to npm** — publish is gated
  on the `proposit-server` child item's consumer-side validation (epic Stage 3).

## Verification performed

- `pnpm run check` (typecheck, prettier, eslint, 641 tests, build) — all green.
- Diffed the two schema files by hand against `spec.md`/`plan.md` §3 in the parent epic — exact match.
- TDD: tests were written/updated to fail against the old schema first (41 failures across 8 files),
  then the schema change made them pass (641/641).

## Deviations from plan

- None. One judgment call: `additionalProperties: false` was NOT added to any of the three schemas,
  so the schemas don't hard-reject a stale payload still carrying the old field names (they'd be
  silently ignored as extra properties) — only the new field being required is enforced. This matches
  spec §3's literal wording ("old names no longer accept") in the sense that the schema no longer
  *reads* the old names, but a payload with both old and new keys still validates. Flagged for the
  user; not changed unilaterally since `additionalProperties: false` is a broader API-contract decision
  affecting every consumer of these schemas, not just this rename.

## Follow-up notes

- `proposit-mobile` pins `@proposit/shared ^0.9.0` and has zero references to these schemas (per epic
  spec §6) — unaffected by this rename, no action needed here.
- For the parent epic's next reconcile: Stage 1 (`@proposit/shared`) is implementation-complete and
  verified locally; not yet marked `complete` in TCW pending user sign-off, and not published — Stage 2
  (`proposit-server`) needs this local build to pin against.
