import { GetCurrentUserResponse } from "../../schemas/model/users.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

// Reads the authenticated caller's own record: username, preferences, and usage
// + tier limits. `GET /api/v1/user/me`.
export async function getCurrentUserImpl(config: TApiClientConfig) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(`${baseUrl}/api/v1/user/me`, {
            method: "GET",
        }),
        GetCurrentUserResponse
    )
}
