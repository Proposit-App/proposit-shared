import { UsernameSearchResponse } from "../../schemas/api/user/index.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

/**
 * Resolve a handle to the account behind it, or a non-`ok` result when nothing
 * answers to it.
 *
 * The handle travels through `URLSearchParams`, which serialises it once, so a
 * handle carrying spaces and a slash — the curated personas do — arrives at the
 * route as the string that was passed in. Interpolating an
 * `encodeURIComponent(...)` into the path would read the same today and double
 * encodes the moment anything wraps it, and a double-encoded handle resolves
 * nobody rather than erroring: it looks like an account that does not exist.
 */
export async function searchUsernameImpl(
    config: TApiClientConfig,
    username: string
) {
    const url = new URL(`${resolveBaseUrl(config)}/api/v1/user/search`)
    url.searchParams.set("username", username)

    return await parseResponse(
        await config.fetchImpl(url.toString(), { method: "GET" }),
        UsernameSearchResponse
    )
}
