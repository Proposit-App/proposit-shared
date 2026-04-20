import {
    ClaimSearchResponseSchema,
    SourceSearchResponseSchema,
    EntitySearchResponseSchema,
} from "../schemas/api/search.js"
import { strictFetch } from "../utils/utils.js"

export async function searchUserClaims(
    query: string,
    limit = 20,
    argumentId?: string,
    fetchFn: typeof fetch = fetch
) {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (argumentId) params.set("argumentId", argumentId)

    return await strictFetch(
        `/api/v1/user/claims/search?${params.toString()}`,
        { method: "GET" },
        undefined,
        undefined,
        ClaimSearchResponseSchema,
        fetchFn
    )
}

export async function searchUserSources(
    query: string,
    limit = 20,
    fetchFn: typeof fetch = fetch
) {
    const params = new URLSearchParams({ q: query, limit: String(limit) })

    return await strictFetch(
        `/api/v1/user/sources/search?${params.toString()}`,
        { method: "GET" },
        undefined,
        undefined,
        SourceSearchResponseSchema,
        fetchFn
    )
}

export async function searchUserEntities(
    query: string,
    types?: string[],
    limit = 10,
    fetchFn: typeof fetch = fetch
) {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (types && types.length > 0) params.set("types", types.join(","))

    return await strictFetch(
        `/api/v1/user/entities/search?${params.toString()}`,
        { method: "GET" },
        undefined,
        undefined,
        EntitySearchResponseSchema,
        fetchFn
    )
}
