import { UserCitationsResponseSchema } from "../../schemas/api/citations.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function getUserCitationsImpl(config: TApiClientConfig) {
    const baseUrl = resolveBaseUrl(config)
    const url = new URL(`${baseUrl}/api/v1/user/citations`)

    return await parseResponse(
        await config.fetchImpl(url.toString(), { method: "GET" }),
        UserCitationsResponseSchema
    )
}
