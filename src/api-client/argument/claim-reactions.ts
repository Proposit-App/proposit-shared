import {
    ClaimReactionCreateRequest,
    ClaimReactionCreateResponse,
    ClaimReactionDeleteResponse,
    type TClaimReactionCreateRequest,
} from "../../schemas/api/claim-reaction/index.js"
import { parseResponse, strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function createClaimReactionImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    claimId: string,
    data: TClaimReactionCreateRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/claim/${claimId}/reactions`,
        { method: "POST" },
        data,
        ClaimReactionCreateRequest,
        ClaimReactionCreateResponse,
        config.fetchImpl
    )
}

export async function deleteClaimReactionImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    claimId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/claim/${claimId}/reactions`,
            { method: "DELETE" }
        ),
        ClaimReactionDeleteResponse
    )
}
