import { type Static } from "typebox"
import { ArgumentCreateTask } from "../../tasks.js"

/**
 * Response for both retry routes. Retry = whole-pipeline re-run (core has no
 * single-stage resume), so both `POST .../retry` and
 * `POST .../pipeline/stages/[stageRowId]/retry` produce the SAME artifact: a
 * fresh `argument_create` task whose `previousId` points at the failed task
 * (see `BaseTaskSchema.previousId` lineage in `../../tasks.ts`). The response
 * is that fresh task.
 *
 * Narrowed to `ArgumentCreateTask` (not the full `TaskSchema` union): retry
 * targets ingestion pipeline tasks only. Rejecting a non-ingestion task id with
 * a typed 4xx is the server route's obligation (slice S2), not a shared guard.
 */
export const RetryTaskResponse = ArgumentCreateTask
export type TRetryTaskResponse = Static<typeof RetryTaskResponse>
