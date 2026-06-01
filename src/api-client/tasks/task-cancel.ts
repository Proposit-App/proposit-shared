// api-client method for the cancel endpoint landing in `proposit-server` slice
// S-B1 (Ingestion Task Controls). Cancel is a no-body DELETE with a single path
// param (the task id) — mirrors `deleteReactionImpl`. The route returns 200 +
// the UPDATED `argument_create` task (status `TaskStatus.CANCELLED`); wire shape
// comes from `@proposit/shared/schemas/api/task-cancel` (`CancelTaskResponse`).
//
// No `strictFetch` (that path asserts a request body); this method uses the
// no-body `parseResponse` pattern. The 1-arg `parseResponse` overload's error
// union carries a `GrammarViolationsResponse` member that cannot occur on a
// cancel DELETE — harmless here, and the S-B1 consumer writes no
// grammar-violations branch for this call.

import { CancelTaskResponse } from "../../schemas/api/task-cancel/index.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function cancelTaskImpl(config: TApiClientConfig, taskId: string) {
    const baseUrl = resolveBaseUrl(config)
    const url = `${baseUrl}/api/v1/task/${encodeURIComponent(taskId)}`

    return await parseResponse(
        await config.fetchImpl(url, { method: "DELETE" }),
        CancelTaskResponse
    )
}
