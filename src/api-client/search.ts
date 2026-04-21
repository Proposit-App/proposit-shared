import {
    ClaimSearchResponseSchema,
    SourceSearchResponseSchema,
    EntitySearchResponseSchema,
} from "../schemas/api/search.js"
import { strictFetch } from "../utils/utils.js"
import type { TApiClientConfig } from "./config.js"
import { resolveBaseUrl } from "./internal.js"

export async function searchUserClaimsImpl(
    config: TApiClientConfig,
    query: string,
    limit = 20,
    argumentId?: string,
) {
    const baseUrl = resolveBaseUrl(config)
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (argumentId) params.set("argumentId", argumentId)

    return await strictFetch(
        `${baseUrl}/api/v1/user/claims/search?${params.toString()}`,
        { method: "GET" },
        undefined,
        undefined,
        ClaimSearchResponseSchema,
        config.fetchImpl,
    )
}

export async function searchUserSourcesImpl(
    config: TApiClientConfig,
    query: string,
    limit = 20,
) {
    const baseUrl = resolveBaseUrl(config)
    const params = new URLSearchParams({ q: query, limit: String(limit) })

    return await strictFetch(
        `${baseUrl}/api/v1/user/sources/search?${params.toString()}`,
        { method: "GET" },
        undefined,
        undefined,
        SourceSearchResponseSchema,
        config.fetchImpl,
    )
}

export async function searchUserEntitiesImpl(
    config: TApiClientConfig,
    query: string,
    types?: string[],
    limit = 10,
) {
    const baseUrl = resolveBaseUrl(config)
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (types && types.length > 0) params.set("types", types.join(","))

    return await strictFetch(
        `${baseUrl}/api/v1/user/entities/search?${params.toString()}`,
        { method: "GET" },
        undefined,
        undefined,
        EntitySearchResponseSchema,
        config.fetchImpl,
    )
}
