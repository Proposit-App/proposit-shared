import { type Static } from "typebox"
import { ArgumentCreateTask } from "../../tasks.js"

/**
 * Response for the cancel route (`DELETE /api/v1/task/[taskId]`). The route
 * returns `200` + the UPDATED `argument_create` task body (status flipped to
 * `TaskStatus.CANCELLED`), so the client immediately receives the new terminal
 * state. A `204` no-content cancel is NOT viable: `parseResponse`
 * (`src/utils/utils.ts`) calls `response.json()` unconditionally before the
 * ok-check, so a body-less response would throw inside `cancelTaskImpl`.
 *
 * Narrowed to `ArgumentCreateTask` (not the full `TaskSchema` union): cancel
 * targets ingestion pipeline tasks only — mirrors `RetryTaskResponse`. Rejecting
 * a non-ingestion task id with a typed 4xx is the server route's obligation,
 * not a shared guard.
 */
export const CancelTaskResponse = ArgumentCreateTask
export type TCancelTaskResponse = Static<typeof CancelTaskResponse>
