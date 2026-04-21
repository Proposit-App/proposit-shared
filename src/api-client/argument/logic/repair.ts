import {
    RepairRequestSchema,
    RepairResponseSchema,
    type TRepairRequest,
} from "../../../schemas/api/argument/repair.js"
import { strictFetch } from "../../../utils/utils.js"
import type { TApiClientConfig } from "../../config.js"
import { resolveBaseUrl } from "../../internal.js"

function repairUrl(
    argumentId: string,
    argumentVersion: number,
    baseUrl: string
) {
    return `${baseUrl}/api/v1/argument/${argumentId}/${argumentVersion}/logic/repair`
}

export async function repairArgumentImpl(
    config: TApiClientConfig,
    argumentId: string,
    argumentVersion: number,
    data: TRepairRequest
) {
    const baseUrl = resolveBaseUrl(config)
    return await strictFetch(
        repairUrl(argumentId, argumentVersion, baseUrl),
        { method: "POST" },
        data,
        RepairRequestSchema,
        RepairResponseSchema,
        config.fetchImpl
    )
}
