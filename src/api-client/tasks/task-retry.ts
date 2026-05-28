// api-client methods for the two retry endpoints landing in `proposit-server`
// slice S2 (Pipeline Refinement, Area 2). Retry is a whole-task re-run (core
// has no single-stage resume), so both routes are POSTs with path params only
// — no request body. Wire shape comes from
// `@proposit/shared/schemas/api/task-retry` (`RetryTaskResponse`).
//
// No `strictFetch` (that path asserts a request body); both methods use the
// no-body `parseResponse` pattern (mirrors `deleteReactionImpl`). The 1-arg
// `parseResponse` overload's error union carries a `GrammarViolationsResponse`
// member that cannot occur on a retry POST — harmless here, and the S2 consumer
// writes no grammar-violations branch for these calls.

import { RetryTaskResponse } from "../../schemas/api/task-retry/index.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function retryTaskImpl(config: TApiClientConfig, taskId: string) {
    const baseUrl = resolveBaseUrl(config)
    const url = `${baseUrl}/api/v1/task/${encodeURIComponent(taskId)}/retry`

    return await parseResponse(
        await config.fetchImpl(url, { method: "POST" }),
        RetryTaskResponse
    )
}

/**
 * Retry triggered from a specific failed stage. `stageRowId` is
 * attribution/logging only — execution is a whole-task re-run regardless (core
 * has no single-stage resume). The route records which stage the user clicked;
 * the response is the same fresh task as `retryTask`.
 */
export async function retryStageImpl(
    config: TApiClientConfig,
    taskId: string,
    stageRowId: string
) {
    const baseUrl = resolveBaseUrl(config)
    const url =
        `${baseUrl}/api/v1/task/${encodeURIComponent(taskId)}` +
        `/pipeline/stages/${encodeURIComponent(stageRowId)}/retry`

    return await parseResponse(
        await config.fetchImpl(url, { method: "POST" }),
        RetryTaskResponse
    )
}
