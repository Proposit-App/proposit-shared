import { Type, type Static } from "typebox"
import { UUID } from "../../common.js"
import { TaskSchema } from "../../tasks.js"

/**
 * Query params for `GET /api/v1/task` — list the authenticated user's tasks.
 * All optional; the server applies the documented defaults (`limit` 20,
 * `offset` 0) when a param is absent. The client omits absent params entirely
 * rather than sending them, so these defaults live server-side, not in the
 * outgoing URL.
 */
export const ListTasksQuerySchema = Type.Object(
    {
        argumentId: Type.Optional(UUID),
        version: Type.Optional(Type.Number()),
        limit: Type.Optional(
            Type.Number({ minimum: 1, maximum: 50, default: 20 })
        ),
        offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
    },
    { additionalProperties: false }
)
export type TListTasksQuery = Static<typeof ListTasksQuerySchema>

/**
 * Response for `GET /api/v1/task`. `tasks` is the full `TaskSchema` union (a
 * user's task list spans every task type, unlike retry/cancel which narrow to
 * `ArgumentCreateTask`). `hasMore` drives lazy-loading: true when more rows
 * exist beyond `offset + tasks.length`.
 */
export const ListTasksResponseSchema = Type.Object({
    tasks: Type.Array(TaskSchema),
    hasMore: Type.Boolean(),
})
export type TListTasksResponse = Static<typeof ListTasksResponseSchema>
