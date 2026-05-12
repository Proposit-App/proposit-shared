import type { DivergenceScope } from "./types.js"
import type { PropositArgumentEngine, TProjectSnapshot } from "../engine.js"
import { CHECKSUM_CONFIG } from "../../checksum.js"
import { ArgumentEngine } from "@proposit/proposit-core"
import type {
    TPropositionalExpressionCombined,
    TPropositionalPremise,
    TPropositionalVariable,
} from "../../schemas/logic.js"
import type { TArgument } from "../../schemas/model/arguments.js"

/**
 * Compares the local engine's checksum tree against a server-provided snapshot.
 *
 * 1. Builds a temporary engine from the server snapshot to get its checksums.
 * 2. Compares `combinedChecksum()` — if they match, returns `{ level: "none" }`.
 * 3. If not, walks premise checksums to find divergent premises.
 * 4. Checks variable checksums (leaf-only: uses `checksum` field).
 * 5. Returns appropriate DivergenceScope.
 */
export function detectDivergence(
    engine: PropositArgumentEngine,
    serverSnapshot: TProjectSnapshot
): DivergenceScope {
    // Build a temporary engine from the server snapshot to compute checksums
    const serverEngine = new ArgumentEngine<
        TArgument,
        TPropositionalPremise,
        TPropositionalExpressionCombined,
        TPropositionalVariable
    >(
        serverSnapshot.argument,
        { get: () => undefined, getCurrent: () => undefined },
        {
            checksumConfig: CHECKSUM_CONFIG,
            positionConfig: serverSnapshot.config?.positionConfig,
            grammarConfig: {
                autoNormalize: false,
                enforceFormulaBetweenOperators: true,
            },
        }
    )
    serverEngine.rollback(serverSnapshot)

    // Fast path: combined checksums match
    if (engine.combinedChecksum() === serverEngine.combinedChecksum()) {
        return { level: "none" }
    }

    // Walk premise checksums to find specific divergent premises
    const localPremiseIds = new Set(engine.listPremiseIds())
    const serverPremiseIds = new Set(serverEngine.listPremiseIds())

    // Check for premise-level divergence
    for (const premiseId of localPremiseIds) {
        const localPm = engine.getPremise(premiseId)
        const serverPm = serverEngine.getPremise(premiseId)

        if (!localPm || !serverPm) {
            // Premise exists locally but not on server (or vice versa)
            return { level: "premise", premiseId }
        }

        if (localPm.combinedChecksum() !== serverPm.combinedChecksum()) {
            return { level: "premise", premiseId }
        }
    }

    // Check for premises that exist on server but not locally
    for (const premiseId of serverPremiseIds) {
        if (!localPremiseIds.has(premiseId)) {
            return { level: "premise", premiseId }
        }
    }

    // Check variable checksums (leaf-only: use checksum field, not combinedChecksum)
    const localVariables = engine.getVariables()
    const serverVariables = serverEngine.getVariables()

    const localVarMap = new Map(
        localVariables.map((v) => [v.id, (v as { checksum?: string }).checksum])
    )
    const serverVarMap = new Map(
        serverVariables.map((v) => [
            v.id,
            (v as { checksum?: string }).checksum,
        ])
    )

    for (const [id, localChecksum] of localVarMap) {
        const serverChecksum = serverVarMap.get(id)
        if (localChecksum !== serverChecksum) {
            return { level: "entity", entityKind: "variable", entityId: id }
        }
    }

    for (const [id] of serverVarMap) {
        if (!localVarMap.has(id)) {
            return { level: "entity", entityKind: "variable", entityId: id }
        }
    }

    // Fallback: checksums differ but we couldn't pinpoint the entity
    return { level: "full" }
}
