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

export async function getMyReview(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}/reviews`,
            { method: "GET" }
        ),
        ReviewGetResponse
    )
}

export async function createReviewRemote(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}/reviews`,
        { method: "POST" },
        {},
        ReviewCreateRequest,
        ReviewCreateResponse,
        fetchFn
    )
}

export async function getReviewByIdRemote(
    argumentId: string,
    version: number,
    reviewId: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}/reviews/${reviewId}`,
            { method: "GET" }
        ),
        ReviewGetResponse
    )
}

export async function patchReviewRemote(
    argumentId: string,
    version: number,
    reviewId: string,
    data: TReviewUpdateRequest,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}/reviews/${reviewId}`,
        { method: "PATCH" },
        data,
        ReviewUpdateRequest,
        ReviewUpdateResponse,
        fetchFn
    )
}

export async function deleteReviewRemote(
    argumentId: string,
    version: number,
    reviewId: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}/reviews/${reviewId}`,
            { method: "DELETE" }
        ),
        ReviewDeleteResponse
    )
}

export async function setReviewVisibility(
    argumentId: string,
    version: number,
    reviewId: string,
    isPublic: boolean,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}/reviews/${reviewId}/visibility`,
        { method: "PATCH" },
        { public: isPublic },
        ReviewVisibilityRequest,
        ReviewVisibilityResponse,
        fetchFn
    )
}
