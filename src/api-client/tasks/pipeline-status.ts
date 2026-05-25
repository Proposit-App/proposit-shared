// api-client methods for the two pipeline-status endpoints landing in
// `proposit-server` slice 2F. Wire shapes come from
// `@proposit/shared/schemas/api/pipeline-status` (spec §8.1 + §8.2).
//
// Both methods are plain GETs that delegate to `parseResponse` for
// validation. The staff-only authorization on the second endpoint is
// enforced server-side; the api-client method itself is auth-agnostic.

import {
    GetPipelineStatusResponseSchema,
    GetPipelineStagePayloadsResponseSchema,
} from "../../schemas/api/pipeline-status/index.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function getTaskPipelineImpl(
    config: TApiClientConfig,
    taskId: string
) {
    const baseUrl = resolveBaseUrl(config)
    const url = `${baseUrl}/api/v1/task/${encodeURIComponent(taskId)}/pipeline`

    return await parseResponse(
        await config.fetchImpl(url, { method: "GET" }),
        GetPipelineStatusResponseSchema
    )
}

export async function getTaskPipelineStagePayloadsImpl(
    config: TApiClientConfig,
    taskId: string,
    stageRowId: string
) {
    const baseUrl = resolveBaseUrl(config)
    const url =
        `${baseUrl}/api/v1/task/${encodeURIComponent(taskId)}` +
        `/pipeline/stages/${encodeURIComponent(stageRowId)}/payloads`

    return await parseResponse(
        await config.fetchImpl(url, { method: "GET" }),
        GetPipelineStagePayloadsResponseSchema
    )
}
