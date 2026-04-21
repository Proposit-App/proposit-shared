import {
    ReviewCreateRequest,
    ReviewCreateResponse,
    ReviewDeleteResponse,
    ReviewGetResponse,
    ReviewUpdateRequest,
    ReviewUpdateResponse,
    ReviewVisibilityRequest,
    ReviewVisibilityResponse,
    type TReviewUpdateRequest,
} from "../../schemas/api/review/index.js"
import { parseResponse, strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function getMyReviewImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/reviews`,
            { method: "GET" },
        ),
        ReviewGetResponse,
    )
}

export async function createReviewRemoteImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/reviews`,
        { method: "POST" },
        {},
        ReviewCreateRequest,
        ReviewCreateResponse,
        config.fetchImpl,
    )
}

export async function getReviewByIdRemoteImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    reviewId: string,
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/reviews/${reviewId}`,
            { method: "GET" },
        ),
        ReviewGetResponse,
    )
}

export async function patchReviewRemoteImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    reviewId: string,
    data: TReviewUpdateRequest,
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/reviews/${reviewId}`,
        { method: "PATCH" },
        data,
        ReviewUpdateRequest,
        ReviewUpdateResponse,
        config.fetchImpl,
    )
}

export async function deleteReviewRemoteImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    reviewId: string,
) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(
            `${baseUrl}/api/v1/argument/${argumentId}/${version}/reviews/${reviewId}`,
            { method: "DELETE" },
        ),
        ReviewDeleteResponse,
    )
}

export async function setReviewVisibilityImpl(
    config: TApiClientConfig,
    argumentId: string,
    version: number,
    reviewId: string,
    isPublic: boolean,
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${version}/reviews/${reviewId}/visibility`,
        { method: "PATCH" },
        { public: isPublic },
        ReviewVisibilityRequest,
        ReviewVisibilityResponse,
        config.fetchImpl,
    )
}
