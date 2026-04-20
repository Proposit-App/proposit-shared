import { UserClaimsResponseSchema } from "../../schemas/api/claims.js"
import { parseResponse } from "../../utils/utils.js"

export async function getUserClaims(
    argumentId?: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    const url = new URL(`${urlPrefix}/api/v1/user/claims`, "http://localhost")
    if (argumentId) {
        url.searchParams.set("argumentId", argumentId)
    }

    return await parseResponse(
        await fetchFn(url.pathname + url.search, { method: "GET" }),
        UserClaimsResponseSchema
    )
}
