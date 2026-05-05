import { UserClaimsResponseSchema } from "../../schemas/api/claims.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function getUserClaimsImpl(
    config: TApiClientConfig,
    argumentId?: string
) {
    const baseUrl = resolveBaseUrl(config)
    const url = new URL(`${baseUrl}/api/v1/user/claims`)
    if (argumentId) {
        url.searchParams.set("argumentId", argumentId)
    }

    return await parseResponse(
        await config.fetchImpl(url.toString(), { method: "GET" }),
        UserClaimsResponseSchema
    )
}
