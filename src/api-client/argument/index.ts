// Inherited from proposit-server. The legacy type name GetAllArgumentsParams
// predates the brain-style T-prefix convention; renaming cascades through
// every server consumer. Tracked as tech debt for a dedicated follow-up.
/* eslint-disable @typescript-eslint/naming-convention */
import {
    ArgumentSchema,
    ArgumentDiffSchema,
    ArgumentWithMetadataSchema,
} from "../../schemas/model.js"
import {
    FullArgumentSchema,
    GetForksOfArgumentResponseSchema,
    UpdateArgumentRequestSchema,
    type TUpdateArgumentRequest,
    CreateArgumentSchema,
    type TCreateArgument,
    PublishResponseSchema,
} from "../../schemas/api/argument/index.js"
import { parseResponse, strictFetch } from "../../utils/utils.js"
import { Type } from "typebox"

export async function getArgument(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    const resp = await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}`,
        {
            method: "GET",
        },
        undefined,
        undefined,
        ArgumentSchema,
        fetchFn
    )

    return resp
}

export async function publishArgument(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}/publish`,
            { method: "POST" }
        ),
        PublishResponseSchema
    )
}

export async function resetArgument(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}/reset`,
            { method: "POST" }
        ),
        ArgumentSchema
    )
}

export async function forkArgument(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}/fork`,
            { method: "POST" }
        ),
        ArgumentSchema
    )
}

export async function getArgumentDiff(
    argumentId: string,
    version: number,
    otherArgId: string,
    otherArgVersion: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}/diff/${otherArgId}/${otherArgVersion}`,
        { method: "GET" },
        undefined,
        undefined,
        ArgumentDiffSchema,
        fetchFn
    )
}

export async function getArgumentForks(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}/forks`,
            { method: "GET" }
        ),
        GetForksOfArgumentResponseSchema
    )
}

export async function claimUnownedArgument(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    await fetchFn(
        `${urlPrefix}/api/v1/argument/unowned/${argumentId}/${version}/take`,
        { method: "POST" }
    )
}

export type GetAllArgumentsParams = {
    owned?: boolean
    limit?: number
    offset?: number
    titlePattern?: string
    orderByPopularity?: boolean
}

export async function getAllArguments(
    params: GetAllArgumentsParams = {},
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    const url = new URL(`${urlPrefix}/api/v1/argument`, "http://localhost")
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            url.searchParams.set(key, String(value))
        }
    }
    return await parseResponse(
        await fetchFn(url.pathname + url.search, { method: "GET" }),
        Type.Array(ArgumentWithMetadataSchema)
    )
}

export async function createArgument(
    data: TCreateArgument,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument`,
        { method: "POST" },
        data,
        CreateArgumentSchema,
        ArgumentSchema,
        fetchFn
    )
}

export async function getLatestArgument(
    argumentId: string,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}`,
        { method: "GET" },
        undefined,
        undefined,
        ArgumentSchema,
        fetchFn
    )
}

export async function updateArgument(
    argumentId: string,
    version: number,
    data: TUpdateArgumentRequest,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}`,
        { method: "PUT" },
        data,
        UpdateArgumentRequestSchema,
        ArgumentSchema,
        fetchFn
    )
}

export async function archiveArgument(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(`${urlPrefix}/api/v1/argument/${argumentId}/${version}`, {
            method: "DELETE",
        }),
        Type.Boolean()
    )
}

export async function deleteArgument(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await parseResponse(
        await fetchFn(
            `${urlPrefix}/api/v1/argument/${argumentId}/${version}?delete=true`,
            { method: "DELETE" }
        ),
        Type.Boolean()
    )
}

export async function getEntireArgument(
    argumentId: string,
    version: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${version}/entire`,
        { method: "GET" },
        undefined,
        undefined,
        FullArgumentSchema,
        fetchFn
    )
}
