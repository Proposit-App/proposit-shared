import { UserSourcesResponseSchema } from "../../schemas/api/sources.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function getUserSourcesImpl(config: TApiClientConfig) {
    const baseUrl = resolveBaseUrl(config)
    const url = new URL(`${baseUrl}/api/v1/user/sources`, "http://localhost")

    return await parseResponse(
        await config.fetchImpl(url.pathname + url.search, { method: "GET" }),
        UserSourcesResponseSchema,
    )
}
