import {
    ReactionCreateRequest,
    ReactionCreateResponse,
    ReactionDeleteResponse,
    type TReactionCreateRequest,
} from "../../schemas/api/reaction/index.js"
import { parseResponse, strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function createReactionImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    data: TReactionCreateRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/reactions`,
        { method: "POST" },
        data,
        ReactionCreateRequest,
        ReactionCreateResponse,
        config.fetchImpl
    )
}

export async function deleteReactionImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    reactionId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/reactions/${reactionId}`,
            { method: "DELETE" }
        ),
        ReactionDeleteResponse
    )
}
