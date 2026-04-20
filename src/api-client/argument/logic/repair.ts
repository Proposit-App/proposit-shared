import {
    RepairRequestSchema,
    RepairResponseSchema,
    type TRepairRequest,
} from "../../../schemas/api/argument/repair.js"
import { strictFetch } from "../../../utils/utils.js"

function repairUrl(
    argumentId: string,
    argumentVersion: number,
    urlPrefix: string
) {
    return `${urlPrefix}/api/v1/argument/${argumentId}/${argumentVersion}/logic/repair`
}

export async function repairArgument(
    argumentId: string,
    argumentVersion: number,
    data: TRepairRequest,
    fetchFn: typeof fetch = fetch,
    urlPrefix = ""
) {
    return await strictFetch(
        repairUrl(argumentId, argumentVersion, urlPrefix),
        { method: "POST" },
        data,
        RepairRequestSchema,
        RepairResponseSchema,
        fetchFn
    )
}
