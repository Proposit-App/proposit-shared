import type { TProjectReactiveSnapshot } from "../engine.js"
import type { TRepairItem } from "../../schemas/api/argument/repair.js"

// Structural validation codes the repair endpoint can act on and that are
// derivable from a fetched argument's snapshot. Only these two appear in a
// snapshot's validation issues; the other repairable codes (CHECKSUM_STALE,
// GRAMMAR_DENORMALIZED) are computed server-side and aren't derivable from the
// fetched argument, so they can't be detected client-side.
export const REPAIRABLE_CODES = new Set([
    "EXPR_CHILD_COUNT_INVALID",
    "PREMISE_ROOT_MISMATCH",
])

// Derive the repair items an argument's current snapshot needs, ready to POST to
// `repairArgument`. Mirrors the server's own snapshot-side detection: filter the
// engine's validation issues to the codes the repair endpoint understands. An
// empty result means the argument has no client-detectable inconsistency.
export function detectRepairs(
    snapshot: TProjectReactiveSnapshot
): TRepairItem[] {
    return snapshot.validationIssues
        .filter((issue) => REPAIRABLE_CODES.has(issue.code))
        .map((issue) => ({
            code: issue.code as TRepairItem["code"],
            premiseId: issue.premiseId,
            expressionId: issue.expressionId,
        }))
}
