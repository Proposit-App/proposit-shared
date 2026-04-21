import { ProvisionResponseSchema } from "../../schemas/api/argument/batch/provision.js"
import {
    ChangeEdgeOperatorRequestSchema,
    ChangeEdgeOperatorResponseSchema,
    type TChangeEdgeOperatorRequest,
} from "../../schemas/api/argument/batch/change-edge-operator.js"
import {
    CreateExpressionWithOperatorRequestSchema,
    CreateExpressionWithOperatorResponseSchema,
    type TCreateExpressionWithOperatorRequest,
} from "../../schemas/api/argument/batch/create-expression-with-operator.js"
import { strictFetch } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"
import { resolveBaseUrl } from "../internal.js"

export async function provisionArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${argumentVersion}/batch/provision`,
        { method: "POST" },
        undefined,
        undefined,
        ProvisionResponseSchema,
        config.fetchImpl,
    )
}

export async function createExpressionWithOperatorImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    data: TCreateExpressionWithOperatorRequest,
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${argumentVersion}/logic/batch/create-expression-with-operator`,
        { method: "POST" },
        data,
        CreateExpressionWithOperatorRequestSchema,
        CreateExpressionWithOperatorResponseSchema,
        config.fetchImpl,
    )
}

export async function changeEdgeOperatorImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    data: TChangeEdgeOperatorRequest,
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        `${baseUrl}/api/v1/argument/${argumentId}/${argumentVersion}/logic/batch/change-edge-operator`,
        { method: "POST" },
        data,
        ChangeEdgeOperatorRequestSchema,
        ChangeEdgeOperatorResponseSchema,
        config.fetchImpl,
    )
}
