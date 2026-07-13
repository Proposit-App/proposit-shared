import {
    ReportContentRequest,
    ReportContentResponse,
    BlockUserRequest,
    BlockUserResponse,
    GetBlocksResponse,
    type TReportContentRequest,
    type TBlockUserRequest,
} from "../../schemas/api/moderation/index.js"
import { parseResponse, strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

// Files a report against an argument or claim. `POST /api/v1/moderation/report`.
export async function reportContentImpl(
    config: TApiClientConfig,
    data: TReportContentRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/moderation/report`,
        { method: "POST" },
        data,
        ReportContentRequest,
        ReportContentResponse,
        config.fetchImpl
    )
}

// Blocks another user. `POST /api/v1/moderation/block`.
export async function blockUserImpl(
    config: TApiClientConfig,
    data: TBlockUserRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/moderation/block`,
        { method: "POST" },
        data,
        BlockUserRequest,
        BlockUserResponse,
        config.fetchImpl
    )
}

// Removes an existing block. `POST /api/v1/moderation/unblock`.
export async function unblockUserImpl(
    config: TApiClientConfig,
    data: TBlockUserRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/moderation/unblock`,
        { method: "POST" },
        data,
        BlockUserRequest,
        BlockUserResponse,
        config.fetchImpl
    )
}

// Lists the users the caller has blocked. `GET /api/v1/moderation/blocks`.
export async function getMyBlocksImpl(config: TApiClientConfig) {
    const baseUrl = resolveBaseUrl(config)
    return await parseResponse(
        await config.fetchImpl(`${baseUrl}/api/v1/moderation/blocks`, {
            method: "GET",
        }),
        GetBlocksResponse
    )
}
