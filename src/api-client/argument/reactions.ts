import {
    ReactionCreateRequest,
    ReactionCreateResponse,
    ReactionDeleteResponse,
    type TReactionCreateRequest,
} from "../../schemas/api/reaction/index.js"
import { parseResponse, strictFetch } from "../../utils/utils.js"

export async function createReaction(
    argumentId: string,
    version: number,
    data: TReactionCreateRequest,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}/reactions`,
        { method: "POST" },
        data,
        ReactionCreateRequest,
        ReactionCreateResponse,
        fetchFn
    )
}

export async function deleteReaction(
    argumentId: string,
    version: number,
    reactionId: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}/reactions/${reactionId}`,
            { method: "DELETE" }
        ),
        ReactionDeleteResponse
    )
}
