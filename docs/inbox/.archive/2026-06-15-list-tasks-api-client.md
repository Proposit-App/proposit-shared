# Change request: list-tasks api-client method + schemas

**Filed by:** proposit-server (task-management UI/UX work, 2026-06-15)

## Problem

proposit-server is adding a `/profile/tasks` page that lists a user's tasks with
lazy-loading. Per the internal-API-client rule, the client call must go through a
`@proposit/shared/api-client` factory method backed by `strictFetch` + TypeBox
schemas. No list-tasks method exists today.

## Proposed API

New api-client method `listTasks(query) -> { tasks, hasMore }`, calling
`GET /api/v1/task` with optional query params.

### Request (query params)

- `argumentId?: string` (UUID)
- `version?: number`
- `limit?: number` (default 20, max 50)
- `offset?: number` (default 0)

### Response body — `ListTasksResponseSchema`

- `tasks: TTask[]` (reuse the existing `TaskSchema` array)
- `hasMore: boolean`

### Placement (folder parity)

- Schema: `@proposit/shared/schemas/api/task-list/` (request query + response)
- Client: `@proposit/shared/api-client/tasks/task-list.ts` (`listTasksImpl`),
  registered in `factory.ts` `impls` as `listTasks`
- Route (consumer side, in proposit-server): `GET /api/v1/task`

## Impact on consumer (proposit-server)

- Consumes `apiClient.listTasks(...)` from the browser client; `serverApiClient.listTasks(...)`
  for the SSR first page of `/profile/tasks`.
- Requires a new published `@proposit/shared` version. The server-side page +
  list component are gated on it. (The server route, model query, and
  `taskActions` helper do NOT depend on this and ship independently.)

## Test cases (shared side)

- `listTasksImpl` builds the correct URL with each optional param present/absent
  (and omits absent params rather than sending `undefined`).
- Response parse rejects a body missing `hasMore`.
- Response parse accepts an empty `tasks` array.

## Notes

- Self-scoped only on the server side for now: the route always scopes to the
  authenticated user. A future "argument owner sees all editors' tasks" mode is
  explicitly deferred (no schema/authz surface for it yet).
