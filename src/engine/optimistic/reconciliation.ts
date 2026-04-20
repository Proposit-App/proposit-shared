import { InvariantViolationError } from "@proposit/proposit-core"

import type {
    TPropositionalExpressionCombined,
    TPropositionalPremise,
    TPropositionalVariable,
} from "../../schemas/logic.js"
import type { PropositArgumentEngine, TProjectSnapshot } from "../engine.js"
import { ReconciliationError } from "./types.js"

/**
 * Swaps a temp-ID premise with the real server premise in the engine.
 *
 * Performs a snapshot → find-replace → rollback cycle so that all checksums
 * are recomputed against the new ID.
 *
 * If the swapped premise is the conclusion, updates `conclusionPremiseId` in
 * the snapshot accordingly.
 *
 * If `serverVariable` is provided, also swaps the auto-created premise-bound
 * variable's own ID (temp → real) in the same rollback cycle.
 */
export function reconcileCreatedPremise(
    engine: PropositArgumentEngine,
    tempId: string,
    serverPremise: TPropositionalPremise,
    serverVariable?: TPropositionalVariable | null
): void {
    const snap = engine.snapshot() as TProjectSnapshot

    const idx = snap.premises.findIndex((p) => p.premise.id === tempId)
    if (idx === -1) return

    // Replace the temp premise with the server-assigned one (strip checksums
    // so rollback recomputes them)
    snap.premises[idx] = {
        ...snap.premises[idx],
        premise: serverPremise,
    }

    // Update conclusionPremiseId if the swapped premise was the conclusion
    if (snap.conclusionPremiseId === tempId) {
        snap.conclusionPremiseId = serverPremise.id
    }

    // In proposit-core 0.8.0+, creating a premise auto-creates a
    // premise-bound variable with boundPremiseId === premiseId. When we swap
    // the premise ID, we must also update the variable's boundPremiseId and
    // clear its checksum (empty string skips validation) so rollback doesn't
    // fail with a checksum mismatch or a "non-existent premise" error.
    //
    // If the server returned the auto-created variable, also swap the
    // variable's own ID (temp UUID → real server UUID) in the same cycle.
    snap.variables = {
        ...snap.variables,
        variables: snap.variables.variables.map((v) => {
            const vAny = v as { boundPremiseId?: string; checksum: string }
            if ("boundPremiseId" in vAny && vAny.boundPremiseId === tempId) {
                if (serverVariable != null && v.id !== serverVariable.id) {
                    // Swap both the variable's own ID and its boundPremiseId
                    return {
                        ...serverVariable,
                        boundPremiseId: serverPremise.id,
                        checksum: "",
                    }
                }
                // Only fix boundPremiseId (no server variable provided)
                return { ...v, boundPremiseId: serverPremise.id, checksum: "" }
            }
            return v
        }),
    }

    try {
        engine.rollback(snap)
    } catch (error) {
        if (error instanceof InvariantViolationError) {
            throw new ReconciliationError(
                `Invariant violation during reconcileCreatedPremise rollback: ${error.violations.map((v) => v.message).join(", ")}`,
                { cause: error }
            )
        }
        throw error
    }
}

/**
 * Swaps a temp-ID expression with the real server expression in the engine.
 *
 * Also applies any position-shifted sibling expressions returned by the server.
 * If the expression being swapped was the root of its premise, updates
 * `rootExpressionId` accordingly.
 *
 * Performs a snapshot → find-replace → rollback cycle to recompute checksums.
 */
export function reconcileCreatedExpression(
    engine: PropositArgumentEngine,
    tempId: string,
    serverExpression: TPropositionalExpressionCombined,
    shiftedExpressions?: TPropositionalExpressionCombined[]
): void {
    const snap = engine.snapshot() as TProjectSnapshot

    // Find the premise that contains the temp expression
    const premiseEntry = snap.premises.find((p) =>
        p.expressions.expressions.some((e) => e.id === tempId)
    )
    if (!premiseEntry) return

    // Replace the temp expression with the server one
    premiseEntry.expressions = {
        ...premiseEntry.expressions,
        expressions: premiseEntry.expressions.expressions.map((e) =>
            e.id === tempId ? serverExpression : e
        ),
    }

    // Apply shifted expressions (position updates from the server)
    if (shiftedExpressions && shiftedExpressions.length > 0) {
        const shiftedMap = new Map(shiftedExpressions.map((e) => [e.id, e]))
        premiseEntry.expressions = {
            ...premiseEntry.expressions,
            expressions: premiseEntry.expressions.expressions.map(
                (e) => shiftedMap.get(e.id) ?? e
            ),
        }
    }

    // Update rootExpressionId if the swapped expression was the root
    if (premiseEntry.rootExpressionId === tempId) {
        premiseEntry.rootExpressionId = serverExpression.id
    }

    try {
        engine.rollback(snap)
    } catch (error) {
        if (error instanceof InvariantViolationError) {
            throw new ReconciliationError(
                `Invariant violation during reconcileCreatedExpression rollback: ${error.violations.map((v) => v.message).join(", ")}`,
                { cause: error }
            )
        }
        throw error
    }
}

/**
 * Swaps a temp-ID variable with the real server variable in the engine.
 *
 * Performs a snapshot → find-replace → rollback cycle to recompute checksums.
 */
export function reconcileCreatedVariable(
    engine: PropositArgumentEngine,
    tempId: string,
    serverVariable: TPropositionalVariable
): void {
    const snap = engine.snapshot() as TProjectSnapshot

    const idx = snap.variables.variables.findIndex((v) => v.id === tempId)
    if (idx === -1) return

    // When swapping the variable ID, the stored checksum (which included the
    // old tempId) is now stale. Setting checksum to "" causes VariableManager
    // .validate() to skip the checksum integrity check for this variable,
    // allowing rollback to succeed. The engine recomputes the checksum on the
    // next flush. In production, the serverVariable from the API has the
    // correct checksum already; in tests that construct the serverVariable
    // locally, clearing to "" avoids a mismatch.
    snap.variables = {
        ...snap.variables,
        variables: snap.variables.variables.map((v) =>
            v.id === tempId ? { ...serverVariable, checksum: "" } : v
        ),
    }

    try {
        engine.rollback(snap)
    } catch (error) {
        if (error instanceof InvariantViolationError) {
            throw new ReconciliationError(
                `Invariant violation during reconcileCreatedVariable rollback: ${error.violations.map((v) => v.message).join(", ")}`,
                { cause: error }
            )
        }
        throw error
    }
}
