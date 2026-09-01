import {
    ArgumentSavedStateSchema,
    GetSavedArgumentsResponseSchema,
    SaveArgumentResponseSchema,
    UnsaveArgumentResponseSchema,
    type TGetSavedArgumentsParams,
} from "../../schemas/api/argument/saved.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

// Add a published argument to the caller's saved collection. Re-saving
// something already saved is not an error and does not duplicate the entry —
// the response carries the `savedAt` the collection now holds, which is the
// original save time on a repeat call.
//
// Saving an unpublished argument is refused: a draft has nothing to return to.
export async function saveArgumentImpl(
    config: TApiClientConfig,
    argumentId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/save`,
            { method: "POST" }
        ),
        SaveArgumentResponseSchema
    )
}

// Remove an argument from the caller's saved collection. Idempotent: unsaving
// something that was never saved answers the same `saved: false` rather than a
// 404, so a client that lost track of its own state can always reach the state
// it wants in one call.
export async function unsaveArgumentImpl(
    config: TApiClientConfig,
    argumentId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/save`,
            { method: "DELETE" }
        ),
        UnsaveArgumentResponseSchema
    )
}

// Whether the caller has this argument saved, and when. What a bookmark toggle
// reads to draw itself. Answers rather than refuses for a signed-out reader, so
// the control renders the same on a public screen as on a private one.
export async function getArgumentSavedStateImpl(
    config: TApiClientConfig,
    argumentId: string
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/save`,
            { method: "GET" }
        ),
        ArgumentSavedStateSchema
    )
}

// The caller's own saved arguments, most-recently-saved first, each resolved to
// its latest published version.
//
// Deliberately its own read rather than a flag on `getAllArguments` — `owned:`
// asks who wrote an argument, and saving is a personal collection that spans
// other people's work as well as the caller's own. The two are different
// questions and only coincide by accident.
export async function getSavedArgumentsImpl(
    config: TApiClientConfig,
    params: TGetSavedArgumentsParams = {}
) {
    const baseUrl = resolveBaseUrl(config)
    const url = new URL(`${baseUrl}/api/v1/argument/saved`)
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            url.searchParams.set(key, String(value))
        }
    }
    return await parseResponse(
        await config.fetchImpl(url.toString(), { method: "GET" }),
        GetSavedArgumentsResponseSchema
    )
}
