# Upcoming changelog

This file accumulates the developer-facing changelog for the next
published version of `@proposit/shared`. At release time it is renamed
to `docs/changelogs/{version}.md` and a fresh `upcoming.md` is started.

## Ingestion Task Controls — cancel slice (S-shared-cancel)

The shared half of the cross-repo cancel edge. Publishes ahead of the
server `DELETE /api/v1/task/[taskId]` route (S-B1), which consumes the
`cancelTask` api-client method and the new `CANCELLED` terminal state.
Spec: `docs/superpowers/specs/2026-06-01-shared-task-cancel-design.md`.

### Consts — new status + settled source of truth

- **Add:** `TaskStatus.CANCELLED` (value `5`) in `src/consts/task-status.ts`
  — user-initiated cancel of a running task, distinct from `INTERRUPTED`
  (`4`)'s server-shutdown meaning.
- **Add:** `SETTLED_TASK_STATUSES` exported from `@proposit/shared/consts`
  (`src/consts/task-status.ts`) — the single source of truth for the
  terminal partition: `[COMPLETED, FAILED, CANCELLED]`. Server queries
  (e.g. `getUnsettledTasks`) can import this instead of hardcoding the
  list.

### Behavior change — `isTaskSettled` / `isTaskNotSettled` widened

- **Modify:** `src/utils/tasks/utils.ts` — `settledStatuses` is now derived
  from `SETTLED_TASK_STATUSES` (`new Set(SETTLED_TASK_STATUSES)`) so the
  partition has ONE definition. **This widens both exported helpers:** a
  `CANCELLED` task now reads as **settled** (`isTaskSettled` → `true`,
  `isTaskNotSettled` → `false`). `INTERRUPTED` stays NOT settled. Any
  consumer branching on settled-ness now treats `CANCELLED` as terminal —
  the four known server consumers are safe (render-stop; `argument_build_*`
  task-type scoping; the `build-combined-provider-data` `=== FAILED`
  sibling-filter that drops a cancelled task to the bare builder). Mobile
  is fully passive (no consumption of the helper).

### API client — cancelTask

- **Add:** `src/api-client/tasks/task-cancel.ts` (`cancelTaskImpl`) — no-body
  `DELETE /api/v1/task/{taskId}`, mirrors `deleteReactionImpl`, routes
  through `parseResponse`. Registered in `factory.ts` as `cancelTask`;
  public signature `cancelTask(taskId)` is auto-derived via `TStripConfig`.
- **Add:** `src/schemas/api/task-cancel/index.ts` (`CancelTaskResponse`,
  `TCancelTaskResponse`) — alias of `ArgumentCreateTask`, mirroring
  `RetryTaskResponse`. The cancel route returns **`200` + the updated
  task body** (status flipped to `CANCELLED`), NOT `204`: `parseResponse`
  calls `response.json()` unconditionally, so a body-less response would
  throw inside `cancelTaskImpl`.
- **Add:** `package.json` exports entry `./schemas/api/task-cancel` (explicit
  3-condition `types`/`import`/`default` block — the `./schemas/*` glob does
  not cover a directory+index module).

### Tests

- **Add:** `src/consts/__tests__/task-status.test.ts` — `CANCELLED` value +
  `SETTLED_TASK_STATUSES` membership.
- **Add:** `src/utils/tasks/__tests__/utils.test.ts` — RED→GREEN on the
  settled widening (a `CANCELLED` task is settled; `INTERRUPTED` is not).
- **Add:** `src/schemas/api/task-cancel/__tests__/schema.test.ts` —
  `CancelTaskResponse` validation + wire round-trip.
- **Add:** `src/api-client/tasks/__tests__/task-cancel.test.ts` — DELETE verb,
  URL shape, percent-encoding, response parse, 409 error reply.
