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

export async function provisionArgument(
    argumentId: string,
    argumentVersion: number,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${argumentVersion}/batch/provision`,
        { method: "POST" },
        undefined,
        undefined,
        ProvisionResponseSchema,
        fetchFn
    )
}

export async function createExpressionWithOperator(
    argumentId: string,
    argumentVersion: number,
    data: TCreateExpressionWithOperatorRequest,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${argumentVersion}/logic/batch/create-expression-with-operator`,
        { method: "POST" },
        data,
        CreateExpressionWithOperatorRequestSchema,
        CreateExpressionWithOperatorResponseSchema,
        fetchFn
    )
}

export async function changeEdgeOperator(
    argumentId: string,
    argumentVersion: number,
    data: TChangeEdgeOperatorRequest,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        `${urlPrefix}/api/v1/argument/${argumentId}/${argumentVersion}/logic/batch/change-edge-operator`,
        { method: "POST" },
        data,
        ChangeEdgeOperatorRequestSchema,
        ChangeEdgeOperatorResponseSchema,
        fetchFn
    )
}
