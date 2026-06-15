// api-client method for `GET /api/v1/task` — lists the authenticated user's
// tasks with cursor-style pagination. GET with optional query params and no
// request body, so it uses the no-payload `strictFetch` form (mirrors
// `searchUserClaimsImpl`). Absent params are omitted from the URL rather than
// serialized as the literal string "undefined".

import {
    ListTasksResponseSchema,
    type TListTasksQuery,
} from "../../schemas/api/task-list/index.js"
import { strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function listTasksImpl(
    config: TApiClientConfig,
    query: TListTasksQuery = {}
) {
    const baseUrl = resolveBaseUrl(config)
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) params.set(key, String(value))
    }
    const queryString = params.toString()
    const url = `${baseUrl}/api/v1/task${queryString ? `?${queryString}` : ""}`

    return await strictFetch(
        url,
        { method: "GET" },
        undefined,
        undefined,
        ListTasksResponseSchema,
        config.fetchImpl
    )
}
