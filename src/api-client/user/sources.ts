import { UserSourcesResponseSchema } from "../../schemas/api/sources.js"
import { parseResponse } from "../../utils/utils.js"

export async function getUserSources(
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    const url = new URL(`${urlPrefix}/api/v1/user/sources`, "http://localhost")

    return await parseResponse(
        await fetchFn(url.pathname + url.search, { method: "GET" }),
        UserSourcesResponseSchema
    )
}
