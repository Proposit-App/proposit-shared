import { InvariantViolationError } from "@proposit/proposit-core"
import type {
    TPremiseRoleType,
    TPropositionalPremise,
    TPropositionalVariable,
    TPropositionalExpressionCombined,
} from "../../schemas/logic.js"
import type { TAxiomaticClaim } from "../../schemas/model/claims.js"
import type { ProjectEngine, ProjectChangeset } from "./types.js"
import { mergeChangesets } from "./types.js"

// Helper-throw error codes scoped to shared's populateDerivationFromCitations.
// Pre-1.0 these mirrored constants in `@proposit/proposit-core`; core 1.0
// removed those constants (the corresponding D-tier violations now surface via
// `engine.validate('derivable')`). Shared retains these local codes for
// backward-compat with the helper's own throw contract until the helper is
// removed in shared `^1.0.0`. Surfaced in messages so callers (server, tests)
// can match on string codes without importing core.
const DERIVATION_TYPE_MISMATCH = "DERIVATION_TYPE_MISMATCH"
const DERIVATION_ANTECEDENT_NON_EMPTY = "DERIVATION_ANTECEDENT_NON_EMPTY"

export function mutateCreatePremise(
    engine: ProjectEngine,
    premiseId: string,
    data: {
        argumentId: string
        argumentVersion: number
        creatorId: string
        createdOn: Date
        title: string | null
        role: TPremiseRoleType
    }
): { premise: TPropositionalPremise; changes: ProjectChangeset } {
    if (data.role === "conclusion" && engine.getConclusionPremise()) {
        throw new Error(
            "A conclusion premise already exists for this argument version"
        )
    }

    const { result: pm, changes } = engine.createPremiseWithId(premiseId, {
        type: "freeform",
        extras: data,
    })

    let allChanges = changes
    if (data.role === "conclusion") {
        // Ensure this premise is marked as conclusion (createPremiseWithId
        // auto-sets the first premise as conclusion, but call explicitly
        // for clarity and to handle edge cases).
        const { changes: roleChanges } = engine.setConclusionPremise(premiseId)
        allChanges = mergeChangesets(changes, roleChanges)
    } else if (engine.getConclusionPremise()?.getId() === premiseId) {
        // Caller requested `role: "supporting"`. proposit-core 0.8.0+
        // auto-sets the first premise as conclusion regardless of the
        // requested role, so we have to address the mismatch here.
        //
        // Under `@proposit/proposit-core@^1.0.2` the engine refuses to
        // leave a non-empty argument without a conclusion (the E-7
        // invariant), so this `clearConclusionPremise()` call is a no-op
        // when the new premise is the first/only one — the auto-assigned
        // conclusion role correctly stays in place. For premises 2+ on
        // 1.0.2, and for all premises on `^1.0.0`/`^1.0.1`, the call
        // clears the conclusion-role designation the caller did not
        // request.
        const { changes: clearChanges } = engine.clearConclusionPremise()
        allChanges = mergeChangesets(changes, clearChanges)
    }

    return {
        premise: pm.toPremiseData(),
        changes: allChanges,
    }
}

export function mutateUpdatePremiseRole(
    engine: ProjectEngine,
    premiseId: string,
    newRole: TPremiseRoleType
): { changes: ProjectChangeset } {
    // `engine.setConclusionPremise(id)` / `engine.clearConclusionPremise()`
    // only mutate the engine's `conclusionPremiseId` slot — they don't touch
    // the affected premise's `extras.role`. Without this sync, callers that
    // persist the engine's premise data after a role change would write a
    // stale `role` field to storage (matching the server-side cycle-5
    // workaround at proposit-server/src/model/logic.ts:1318 ff.). Lift the
    // sync inside the mutation helper so every consumer — server, mobile,
    // tests — gets a self-consistent in-memory model after the call returns.
    //
    // Three sync sites:
    //   1. The target premise's `extras.role` matches `newRole`.
    //   2. (Promotion-only) The prior conclusion's `extras.role` is demoted
    //      to "supporting" — `setConclusionPremise(newId)` implicitly
    //      replaces the old conclusion at the role-state slot, but leaves
    //      its extras-bag stale at "conclusion".
    //   3. (Demotion-only) The target premise is what we're clearing, so
    //      sync site 1 covers it; no other premise needs touching.

    // No-op short-circuit (followups-sweep-2026-05 C bundle P2 fold):
    // when the engine's role-state AND the premise's `extras.role` already
    // both match the requested role, every downstream call below would emit
    // a redundant changeset entry — `setConclusionPremise(currentConclusion)`
    // re-emits a `roles` entry unconditionally, and `syncPremiseExtrasRole`
    // routes through core's `setExtras` which always `markDirty()`s + emits
    // `modifiedPremise` regardless of value equality. Skipping the work
    // here keeps the helper a true no-op when called with the premise's
    // current role, so downstream consumers (`persistChangeset` writing the
    // row, engine cache invalidation, UI subscribers) don't fire on every
    // redundant call. Self-consistency is the qualifier: if `extras.role`
    // has drifted from the engine's role-state slot (the entire reason this
    // helper exists), fall through and let the sync repair the drift.
    const existingPremise = engine.getPremise(premiseId)
    if (existingPremise) {
        const isCurrentlyConclusion =
            engine.getConclusionPremise()?.getId() === premiseId
        const wantsConclusion = newRole === "conclusion"
        const existingExtrasRole = existingPremise.toPremiseData().role
        if (
            isCurrentlyConclusion === wantsConclusion &&
            existingExtrasRole === newRole
        ) {
            return { changes: {} }
        }
    }

    if (newRole === "conclusion") {
        const collected: ProjectChangeset[] = []
        const priorConclusion = engine.getConclusionPremise()
        if (priorConclusion && priorConclusion.getId() !== premiseId) {
            const { changes: priorExtrasChanges } = syncPremiseExtrasRole(
                engine,
                priorConclusion.getId(),
                "supporting"
            )
            collected.push(priorExtrasChanges)
        }
        const { changes: roleChanges } = engine.setConclusionPremise(premiseId)
        collected.push(roleChanges)
        const { changes: extrasChanges } = syncPremiseExtrasRole(
            engine,
            premiseId,
            "conclusion"
        )
        collected.push(extrasChanges)
        return { changes: collected.reduce(mergeChangesets, {}) }
    }

    const currentConclusion = engine.getConclusionPremise()
    if (currentConclusion?.getId() === premiseId) {
        const { changes: roleChanges } = engine.clearConclusionPremise()
        const { changes: extrasChanges } = syncPremiseExtrasRole(
            engine,
            premiseId,
            "supporting"
        )
        return { changes: mergeChangesets(roleChanges, extrasChanges) }
    }

    // The premise is already in the requested role-state. Still sync the
    // extras-bag in case a prior caller's update left `extras.role`
    // mismatched with the engine's role-state slot (defense in depth — the
    // role-state-vs-extras gap is the entire reason this helper exists).
    const { changes: extrasChanges } = syncPremiseExtrasRole(
        engine,
        premiseId,
        newRole
    )
    return { changes: extrasChanges }
}

/**
 * Sets `extras.role` to `role` on the named premise. Used by
 * `mutateUpdatePremiseRole` to keep `extras.role` in sync with the engine's
 * `conclusionPremiseId` slot. Returns the standard `{ changes }` shape so
 * callers can merge into their own changeset.
 *
 * Returns `{ changes: {} }` when the premise doesn't exist — keeping the
 * surface lenient mirrors `mutateUpdatePremiseRole`'s "no-op when
 * already-in-state" branch and matches the server's update-premise route
 * which checks existence before delegating.
 */
function syncPremiseExtrasRole(
    engine: ProjectEngine,
    premiseId: string,
    role: TPremiseRoleType
): { changes: ProjectChangeset } {
    const pe = engine.getPremise(premiseId)
    if (!pe) return { changes: {} }
    const { changes } = pe.updateExtras({ role })
    return { changes }
}

export function mutateUpdatePremiseExtras(
    engine: ProjectEngine,
    premiseId: string,
    updates: Record<string, unknown>
): { premise: TPropositionalPremise; changes: ProjectChangeset } {
    const pm = engine.getPremise(premiseId)
    if (!pm) {
        throw new Error(`Premise ${premiseId} not found`)
    }
    const { changes } = pm.updateExtras(updates)
    return { premise: pm.toPremiseData(), changes }
}

export function mutateDeletePremise(
    engine: ProjectEngine,
    premiseId: string
): { removed: boolean; changes: ProjectChangeset } {
    const { result, changes } = engine.removePremise(premiseId)
    return { removed: result !== undefined, changes }
}

// ──── Derivation premise mutations ─────────────────────────────────────────

/**
 * Atomically creates a derivation premise + claim-bound consequent variable +
 * naked-Q variable expression. The naked-Q form (single variable expression at
 * the root) is the only valid empty antecedent shape; populate the antecedent
 * via `populateDerivationFromCitations` once citations exist.
 *
 * Two variants are supported via mutually-exclusive parameters:
 *
 *   - **Mint** (`consequentVariableId`): caller-minted id for a brand-new
 *     claim-bound consequent variable. The caller-supplied IDs match the
 *     server's raw-SQL migration backfill so live-engine and migration paths
 *     produce identical row IDs.
 *   - **Adopt** (`existingConsequentVariableId`): adopts an existing
 *     claim-bound variable in the engine as the consequent rather than
 *     allocating a new one. Used when the canonical claim-bound variable for
 *     `derivedClaimId` already lives in the argument (legacy / fork-from-older
 *     arguments where the derivation premise was never minted, or future
 *     deletion paths that preserve the variable). Avoids the DB-level
 *     `(symbol, argumentId, argumentVersion)` unique-constraint violation
 *     that minting a duplicate would trigger.
 *
 * Exactly one of `consequentVariableId` / `existingConsequentVariableId` must
 * be supplied.
 *
 * @throws InvariantViolationError(CREATE_DERIVATION_CLAIM_NOT_FOUND) when
 *         `derivedClaimId` does not resolve in the engine's claim library.
 * @throws Error when both or neither of `consequentVariableId` /
 *         `existingConsequentVariableId` are supplied, or when
 *         `existingConsequentVariableId` does not reference a claim-bound
 *         variable for `derivedClaimId`.
 */
export function mutateCreateDerivationPremise(
    engine: ProjectEngine,
    premiseId: string,
    data: {
        argumentId: string
        argumentVersion: number
        creatorId: string
        createdOn: Date
        derivedClaimId: string
        consequentVariableId?: string
        existingConsequentVariableId?: string
        consequentExpressionId: string
    }
): {
    premise: TPropositionalPremise
    consequentVariable: TPropositionalVariable
    consequentExpression: TPropositionalExpressionCombined
    changes: ProjectChangeset
} {
    // 0. Validate the mint/adopt mode selection up front.
    const mintMode = data.consequentVariableId != null
    const adoptMode = data.existingConsequentVariableId != null
    if (mintMode && adoptMode) {
        throw new Error(
            "mutateCreateDerivationPremise: consequentVariableId and existingConsequentVariableId are mutually exclusive — supply exactly one"
        )
    }
    if (!mintMode && !adoptMode) {
        throw new Error(
            "mutateCreateDerivationPremise: must supply exactly one of consequentVariableId (mint) or existingConsequentVariableId (adopt)"
        )
    }
    if (adoptMode) {
        const existing = engine.getVariable(data.existingConsequentVariableId!)
        if (!existing) {
            throw new Error(
                `mutateCreateDerivationPremise: existingConsequentVariableId ${data.existingConsequentVariableId} not found in engine`
            )
        }
        if (!("claimId" in existing)) {
            throw new Error(
                `mutateCreateDerivationPremise: existingConsequentVariableId ${data.existingConsequentVariableId} is not claim-bound`
            )
        }
        if (existing.claimId !== data.derivedClaimId) {
            throw new Error(
                `mutateCreateDerivationPremise: existingConsequentVariableId ${data.existingConsequentVariableId} is bound to claim ${existing.claimId}, expected derivedClaimId ${data.derivedClaimId}`
            )
        }
    }

    // 1. Create the derivation premise. Core auto-creates: a premise-bound
    //    variable for the new premise, a claim-bound consequent variable
    //    (engine-generated id), and a naked-Q variable expression rooted on
    //    that consequent variable (engine-generated id).
    const { result: pm, changes: premiseChanges } = engine.createPremiseWithId(
        premiseId,
        {
            type: "derivation",
            derivedClaimId: data.derivedClaimId,
            extras: {
                creatorId: data.creatorId,
                createdOn: data.createdOn,
                role: "supporting" as const,
            },
        }
    )

    // 2. Identify the auto-generated entities so we can swap them out for the
    //    caller-minted (mint mode) or pre-existing (adopt mode) consequent.
    const autoExpressions = pm.getExpressions()
    if (autoExpressions.length !== 1) {
        throw new Error(
            `mutateCreateDerivationPremise: expected exactly one auto-created expression, got ${autoExpressions.length}`
        )
    }
    const autoExpr = autoExpressions[0]
    if (autoExpr.type !== "variable" || autoExpr.variableId == null) {
        throw new Error(
            "mutateCreateDerivationPremise: auto-created naked-Q expression is not a variable expression"
        )
    }
    const autoVarId = autoExpr.variableId
    const autoVar = engine.getVariable(autoVarId)
    if (!autoVar || !("claimId" in autoVar)) {
        throw new Error(
            "mutateCreateDerivationPremise: auto-created consequent variable is not claim-bound"
        )
    }

    // 3. Update the engine's internal state to point at the chosen consequent
    //    variable. The intermediate changesets from these calls are discarded;
    //    we filter the auto entities out of `premiseChanges` (step 4) so the
    //    merged result never references them.
    //
    // Mode-dependent behavior on the auto entities:
    //   - Mint: the auto var is a brand-new claim-bound variable. Remove it
    //     along with the auto expression so the caller-minted replacement can
    //     take its place.
    //   - Adopt: core's `createPremiseWithId` uses `ensureClaimBoundVariable`
    //     to allocate the consequent, which reuses the existing claim-bound
    //     variable when one is in the engine. So `autoVarId` is the
    //     pre-existing variable id we want to adopt — remove only the auto
    //     expression, keep the variable.
    pm.removeExpression(autoExpr.id, true)

    let consequentVariable: TPropositionalVariable
    let consequentVariableChanges: ProjectChangeset
    let consequentVariableIdToReference: string
    if (mintMode) {
        engine.removeVariable(autoVarId)
        const { result, changes } = engine.addVariable({
            id: data.consequentVariableId!,
            argumentId: data.argumentId,
            argumentVersion: data.argumentVersion,
            claimId: data.derivedClaimId,
            claimVersion: autoVar.claimVersion,
            symbol: autoVar.symbol,
            creatorId: data.creatorId,
            createdOn: data.createdOn,
        } as Parameters<typeof engine.addVariable>[0])
        consequentVariable = result
        consequentVariableChanges = changes
        consequentVariableIdToReference = data.consequentVariableId!
    } else {
        // Sanity check: ensureClaimBoundVariable should have surfaced the
        // existing variable as the auto consequent. Bail loudly if it didn't —
        // proceeding would leak the auto-allocated duplicate the bug describes.
        if (autoVarId !== data.existingConsequentVariableId) {
            throw new Error(
                `mutateCreateDerivationPremise: adopt-mode invariant violated — engine auto-allocated ${autoVarId} for derivedClaimId ${data.derivedClaimId} despite existing claim-bound variable ${data.existingConsequentVariableId}`
            )
        }
        consequentVariable = autoVar as TPropositionalVariable
        consequentVariableChanges = {}
        consequentVariableIdToReference = data.existingConsequentVariableId!
    }

    const { result: consequentExpression, changes: addExprChanges } =
        pm.appendExpression(null, {
            id: data.consequentExpressionId,
            argumentId: data.argumentId,
            argumentVersion: data.argumentVersion,
            premiseId,
            parentId: null,
            type: "variable",
            variableId: consequentVariableIdToReference,
            operator: null,
            creatorId: data.creatorId,
            createdOn: data.createdOn,
        } as Parameters<typeof pm.appendExpression>[1])

    // 4. Strip the auto entities from the create-premise changeset so the
    //    merged result reflects only: the premise, the auto-created
    //    premise-bound variable (engine-managed; not caller-minted), and the
    //    chosen consequent variable + naked-Q expression.
    //
    // Also normalize the changeset so the premise doesn't appear in both
    // `added` and `modified`. Core's createPremiseWithId for derivation
    // emits both because the auto naked-Q expression's `appendExpression`
    // triggers a checksum-change `modifiedPremise` entry that gets merged
    // alongside the outer `addedPremise`. Subsequent mutations
    // (addVariable, appendExpression on the same premise) emit further
    // `modifiedPremise` entries that we also drop.
    const filteredPremiseChanges = sanitizeAddedThenModified(
        withoutEntities(premiseChanges, {
            variableIds: new Set([autoVarId]),
            expressionIds: new Set([autoExpr.id]),
        })
    )
    const droppedModifiedAddVarChanges = withoutPremiseModifications(
        consequentVariableChanges,
        premiseId
    )
    const droppedModifiedAddExprChanges = withoutPremiseModifications(
        addExprChanges,
        premiseId
    )

    const allChanges = mergeChangesets(
        mergeChangesets(filteredPremiseChanges, droppedModifiedAddVarChanges),
        droppedModifiedAddExprChanges
    )

    return {
        premise: pm.toPremiseData(),
        consequentVariable,
        consequentExpression,
        changes: allChanges,
    }
}

/**
 * Removes the IMPLIES/OR antecedent subtree from a populated derivation
 * premise, leaving the premise in the naked-Q form (just the consequent
 * variable as root). Idempotent: a no-op when the premise is already naked.
 *
 * @throws InvariantViolationError(DERIVATION_TYPE_MISMATCH) when `premiseId`
 *         resolves to a non-derivation premise.
 */
export function clearDerivationAntecedent(
    engine: ProjectEngine,
    premiseId: string
): { changes: ProjectChangeset } {
    const pm = engine.getPremise(premiseId)
    if (!pm) {
        throw new Error(`Premise ${premiseId} not found`)
    }
    const premiseData = pm.toPremiseData()
    if (premiseData.type !== "derivation") {
        throw new InvariantViolationError([
            {
                code: DERIVATION_TYPE_MISMATCH,
                message: `${DERIVATION_TYPE_MISMATCH}: premise ${premiseId} is not a derivation premise (type=${premiseData.type ?? "freeform"})`,
                entityType: "premise",
                entityId: premiseId,
                premiseId,
            },
        ])
    }

    const rootExprId = pm.getRootExpressionId()
    if (rootExprId === undefined) return { changes: {} }
    const root = pm.getExpression(rootExprId)
    if (!root) return { changes: {} }

    // Naked-Q: root is the consequent variable expression. Nothing to clear.
    if (root.type === "variable") return { changes: {} }

    // Populated form: root must be IMPLIES with antecedent at position 0 and
    // the consequent variable at position 1.
    if (root.type !== "operator" || root.operator !== "implies") {
        throw new Error(
            `clearDerivationAntecedent: unexpected root type for premise ${premiseId} — expected variable or implies, got ${root.type}/${
                root.type === "operator" ? root.operator : ""
            }`
        )
    }

    const rootChildren = pm
        .getChildExpressions(rootExprId)
        .sort((a, b) => a.position - b.position)
    if (rootChildren.length !== 2) {
        throw new Error(
            `clearDerivationAntecedent: IMPLIES root has ${rootChildren.length} children, expected 2`
        )
    }
    const antecedent = rootChildren[0]
    const consequent = rootChildren[1]
    if (consequent.type !== "variable") {
        throw new Error(
            "clearDerivationAntecedent: expected consequent (position 1 child of IMPLIES) to be a variable expression"
        )
    }

    // Collect citation-bound variable IDs so we can cascade-remove them after
    // the antecedent expressions are gone. Three antecedent shapes are
    // supported:
    //   - n = 1: antecedent is the lone citation variable expression.
    //   - n ≥ 2 (canonical, post-v0.7.0): antecedent is a `formula` node
    //     whose only child is an OR; the OR's children are citation vars.
    //   - n ≥ 2 (legacy pre-v0.7.0 snapshots): antecedent is the OR directly
    //     (no formula buffer). Core 1.0 loads such snapshots unconditionally;
    //     no `LOADING_GRAMMAR` shim is involved (the snapshot-loading split was
    //     removed in core 1.0).
    const citationVariableIds: string[] = []
    if (antecedent.type === "variable") {
        if (antecedent.variableId != null) {
            citationVariableIds.push(antecedent.variableId)
        }
    } else if (antecedent.type === "operator" && antecedent.operator === "or") {
        for (const child of pm.getChildExpressions(antecedent.id)) {
            if (child.type === "variable" && child.variableId != null) {
                citationVariableIds.push(child.variableId)
            }
        }
    } else if (antecedent.type === "formula") {
        const formulaChildren = pm.getChildExpressions(antecedent.id)
        if (
            formulaChildren.length !== 1 ||
            formulaChildren[0].type !== "operator" ||
            formulaChildren[0].operator !== "or"
        ) {
            throw new Error(
                `clearDerivationAntecedent: expected formula antecedent to wrap a single OR for premise ${premiseId}`
            )
        }
        for (const child of pm.getChildExpressions(formulaChildren[0].id)) {
            if (child.type === "variable" && child.variableId != null) {
                citationVariableIds.push(child.variableId)
            }
        }
    } else {
        throw new Error(
            `clearDerivationAntecedent: unexpected antecedent shape for premise ${premiseId}`
        )
    }

    const collected: ProjectChangeset[] = []

    // 1. Remove the antecedent subtree (cascade=true). The cascade removes any
    //    intermediate formula/OR nodes and all citation variable expressions in
    //    one shot. The IMPLIES root is unaffected; the consequent variable
    //    expression is unaffected (it's the position-1 child).
    const { changes: removeAntecedentChanges } = pm.removeExpression(
        antecedent.id,
        true
    )
    collected.push(removeAntecedentChanges)

    // 2. Remove IMPLIES with cascade=false, which "promotes" the remaining
    //    child (the consequent variable expression) to take IMPLIES's slot —
    //    its parentId becomes null, position becomes IMPLIES's old position.
    //    The consequent expression appears as `modified` in the changeset.
    const { changes: removeImpliesChanges } = pm.removeExpression(
        rootExprId,
        false
    )
    collected.push(removeImpliesChanges)

    // 3. Cascade citation-bound variable removals. By this point the
    //    expressions referencing them are already gone, so removeVariable's
    //    expression-cascade is a no-op and only the variable add/remove
    //    bookkeeping shows up in the changeset.
    for (const varId of citationVariableIds) {
        const { changes: removeVarChanges } = engine.removeVariable(varId)
        collected.push(removeVarChanges)
    }

    return { changes: mergeChangesetSequence(collected) }
}

/**
 * Builds the `IMPLIES(OR(citation_var_1, …, citation_var_n), Q)` tree on a
 * naked derivation premise. For `n=1`, produces `IMPLIES(citation_var_1, Q)`.
 * For `n=0`, returns an empty changeset.
 *
 * Caller-supplied `supportingClaimIds` ordering determines the OR's child positions
 * (or the single-source antecedent for n=1).
 *
 * @throws InvariantViolationError(DERIVATION_TYPE_MISMATCH) when `premiseId`
 *         resolves to a non-derivation premise.
 * @throws InvariantViolationError(DERIVATION_ANTECEDENT_NON_EMPTY) when the
 *         premise's root expression is already an IMPLIES (caller forgot to
 *         call `clearDerivationAntecedent` first).
 *
 * @deprecated since `@proposit/shared@0.9.0`. Core 1.0 ships
 *   `engine.populateFromCitations(claimId, lookup)` and
 *   `engine.populateFromAxioms(claimId, lookup)` on `ArgumentEngine` —
 *   first-class antecedent-population factories that integrate with the
 *   four-tier grammar model, return a structured `{ kind, state }`
 *   result instead of throwing on already-populated premises, and
 *   enforce the D-3 no-mixing rule via the grammar tier rather than
 *   ad-hoc invariant throws. Migrate to the engine methods at your next
 *   convenient checkpoint. This helper continues to function correctly
 *   against `@proposit/proposit-core@^1.0.0` (its IMPLIES/OR tree
 *   construction uses the unchanged `wrapExpression`/`appendExpression`
 *   mutation surface), but the parallel implementation no longer earns
 *   its keep — scheduled for removal in shared `^1.0.0`. See cross-repo
 *   spec 2026-05-13-grammar-tiers-design §10.1, §12.
 */
export function populateDerivationFromCitations(
    engine: ProjectEngine,
    premiseId: string,
    supportingClaimIds: string[]
): { changes: ProjectChangeset } {
    const pm = engine.getPremise(premiseId)
    if (!pm) {
        throw new Error(`Premise ${premiseId} not found`)
    }
    const premiseData = pm.toPremiseData()
    if (premiseData.type !== "derivation") {
        throw new InvariantViolationError([
            {
                code: DERIVATION_TYPE_MISMATCH,
                message: `${DERIVATION_TYPE_MISMATCH}: premise ${premiseId} is not a derivation premise (type=${premiseData.type ?? "freeform"})`,
                entityType: "premise",
                entityId: premiseId,
                premiseId,
            },
        ])
    }

    const rootExprId = pm.getRootExpressionId()
    if (rootExprId === undefined) {
        throw new Error(
            `populateDerivationFromCitations: premise ${premiseId} has no root expression`
        )
    }
    const root = pm.getExpression(rootExprId)
    if (!root) {
        throw new Error(
            `populateDerivationFromCitations: root expression ${rootExprId} not found in premise ${premiseId}`
        )
    }

    // The antecedent must be empty — root is the bare consequent variable.
    if (root.type !== "variable") {
        throw new InvariantViolationError([
            {
                code: DERIVATION_ANTECEDENT_NON_EMPTY,
                message: `${DERIVATION_ANTECEDENT_NON_EMPTY}: derivation premise ${premiseId} already has a non-empty antecedent`,
                entityType: "premise",
                entityId: premiseId,
                premiseId,
            },
        ])
    }
    if (supportingClaimIds.length === 0) return { changes: {} }

    const consequentExpr = root
    if (consequentExpr.variableId == null) {
        throw new Error(
            "populateDerivationFromCitations: consequent variable expression has no variableId"
        )
    }
    const sharedMeta = {
        argumentId: consequentExpr.argumentId,
        argumentVersion: consequentExpr.argumentVersion,
        premiseId,
        creatorId: consequentExpr.creatorId,
        createdOn: consequentExpr.createdOn,
    }

    const collected: ProjectChangeset[] = []

    // 1. Materialize a claim-bound variable for each source claim. Capture the
    //    newly-added ones (ensureClaimBoundVariable bypasses the standard
    //    mutation surface and produces no changeset of its own).
    const variablesBefore = new Set(engine.getVariables().map((v) => v.id))
    const sourceVariables: TPropositionalVariable[] = []
    for (const supportingClaimId of supportingClaimIds) {
        const v = engine.ensureClaimBoundVariable(supportingClaimId)
        sourceVariables.push(v as unknown as TPropositionalVariable)
    }
    const newlyAddedVariables = sourceVariables.filter(
        (v) => !variablesBefore.has(v.id)
    )
    if (newlyAddedVariables.length > 0) {
        collected.push({
            variables: {
                added: newlyAddedVariables,
                modified: [],
                removed: [],
            },
        })
    }

    // 2. Build the IMPLIES + antecedent tree by wrapping the consequent
    //    expression. wrapExpression with `rightNodeId=consequentExpr.id` makes
    //    the existing consequent the right (consequent) child and the new
    //    sibling the left (antecedent) child of the new IMPLIES root. The
    //    consequent appears in the wrap's changeset as `modified` (its
    //    parentId/position changed).
    //
    // For n ≥ 2 the pre-1.0 helper produced an `IMPLIES(OR(c1, …, cn), Q)`
    // tree and relied on the engine's `wrapInsertFormula` flag to slip a
    // formula buffer between IMPLIES and OR for P-1 compliance (then known
    // as `enforceFormulaBetweenOperators`). The buffer landed inside the
    // captured changeset because the auto-rule fired during the
    // `wrapExpression` call itself, on the same mutation surface.
    //
    // Core 1.0 separates the two concerns: the AN post-hook (which inserts
    // the formula buffer in `assistive` behavior) runs as an independent
    // pass *after* the mutation, and crucially also runs AN-3 (delete
    // 0-child operators / formulas). If we build the tree in `assistive`
    // the AN-3 sweep fires between `wrapExpression(IMPLIES, OR)` and the
    // subsequent `appendExpression(orId, …)` calls, sees a transient
    // 0-child OR, and deletes it — leaving the next iteration unable to
    // find its parent.
    //
    // Build the tree in `permissive` so the AN post-hook is suppressed
    // throughout the construction. The final shape produced is
    // `IMPLIES(OR(c1, …, cn), Q)` — Structural-valid, but P-1-noncompliant
    // (a Presentable rule). Consumers that care about the formula buffer
    // run `engine.normalize()` after this helper returns, capture the
    // additional changeset themselves (e.g., via snapshot diffing), or
    // rely on the canonical-shape canonicalization migration to materialize
    // the formula buffer at the storage layer. The caller's prior behavior
    // is restored on exit. Note: the helper is synchronous, so the window
    // during which `engine.behavior === 'permissive'` is observable to any
    // concurrent subscriber is narrow but non-zero — it's not strictly
    // transparent w.r.t. the engine's mode.
    //
    // For n = 1 we don't need the flip: `IMPLIES(citvar, Q)` has no
    // operator-under-operator nesting, so AN-1 doesn't fire and AN-3 has
    // nothing to delete. Build under whatever behavior the caller set.
    const impliesId = generateId()
    const impliesOp = {
        id: impliesId,
        ...sharedMeta,
        parentId: null,
        type: "operator" as const,
        operator: "implies" as const,
        variableId: null,
    }
    if (sourceVariables.length === 1) {
        const sibling = {
            id: generateId(),
            ...sharedMeta,
            parentId: null, // wrapExpression sets the real parentId
            type: "variable" as const,
            variableId: sourceVariables[0].id,
            operator: null,
        }
        const { changes: wrap } = pm.wrapExpression(
            impliesOp as Parameters<typeof pm.wrapExpression>[0],
            sibling as Parameters<typeof pm.wrapExpression>[1],
            undefined,
            consequentExpr.id
        )
        collected.push(wrap)
        return { changes: mergeChangesetSequence(collected) }
    }
    // n ≥ 2: see the two-stage commentary above.
    const orId = generateId()
    const orSibling = {
        id: orId,
        ...sharedMeta,
        parentId: null,
        type: "operator" as const,
        operator: "or" as const,
        variableId: null,
    }
    const priorBehavior = engine.behavior
    if (priorBehavior !== "permissive") {
        engine.setBehavior("permissive")
    }
    try {
        const { changes: wrap } = pm.wrapExpression(
            impliesOp as Parameters<typeof pm.wrapExpression>[0],
            orSibling as Parameters<typeof pm.wrapExpression>[1],
            undefined,
            consequentExpr.id
        )
        collected.push(wrap)
        for (const sourceVar of sourceVariables) {
            const { changes: appendChanges } = pm.appendExpression(orId, {
                id: generateId(),
                ...sharedMeta,
                parentId: orId,
                type: "variable" as const,
                variableId: sourceVar.id,
                operator: null,
            } as Parameters<typeof pm.appendExpression>[1])
            collected.push(appendChanges)
        }
    } finally {
        if (priorBehavior !== "permissive") {
            engine.setBehavior(priorBehavior)
        }
    }

    return { changes: mergeChangesetSequence(collected) }
}

/**
 * Builds the `IMPLIES(axiom_var, Q)` tree on a derivation premise, where
 * `axiom_var` is a claim-bound variable for the supplied axiomatic claim.
 * Mirrors `populateDerivationFromCitations`' composition pattern:
 * `clearDerivationAntecedent` first to guarantee an empty antecedent slot,
 * then bind the axiomatic claim's variable as the single antecedent variable.
 *
 * **Caller contract.** The caller is responsible for registering the
 * axiomatic claim with the engine (via `engine.setClaim(axiomaticClaim)` or
 * `mutateSetClaim(engine, axiomaticClaim)`) **before** invoking this helper.
 * The split mirrors the citation-side pattern where claim-row creation
 * (`addClaim` server-side, `setClaim` engine-side) and derivation-tree wiring
 * (`populateDerivationFromCitations`) are separable engine operations; the
 * server route at `POST /api/v1/argument/[id]/[v]/claims/[claimId]/axiom`
 * composes them. Calling this helper before the claim is registered surfaces
 * an `ensureClaimBoundVariable` error from the engine — clear but indirect.
 *
 * **Idempotency.** Calling this helper on a derivation premise already
 * carrying the same axiomatic claim as its antecedent is a no-op: the
 * helper short-circuits before any mutation when the existing root is
 * `IMPLIES(axiom_var, Q)` where `axiom_var` resolves to a variable bound
 * to `axiomaticClaim.id`. A different axiomatic claim (or any other
 * antecedent shape) triggers the full clear-and-re-add cycle.
 *
 * @throws Error when `derivationPremiseId` does not resolve.
 * @throws Error when `axiomaticClaim.type !== 'axiomatic'` — the signature
 *         narrows to `TAxiomaticClaim`, but a runtime guard catches
 *         mis-typed `as TAxiomaticClaim` casts that slip past the
 *         TypeScript boundary.
 * @throws InvariantViolationError(DERIVATION_TYPE_MISMATCH) when the
 *         premise is not a derivation premise (re-thrown via
 *         `clearDerivationAntecedent`).
 */
export function populateDerivationFromAxiom(
    engine: ProjectEngine,
    derivationPremiseId: string,
    axiomaticClaim: TAxiomaticClaim
): { changes: ProjectChangeset } {
    if (axiomaticClaim.type !== "axiomatic") {
        throw new Error(
            `populateDerivationFromAxiom: expected axiomaticClaim.type === 'axiomatic', got ${
                (axiomaticClaim as { type?: string }).type ?? "undefined"
            }`
        )
    }

    const pm = engine.getPremise(derivationPremiseId)
    if (!pm) {
        throw new Error(`Premise ${derivationPremiseId} not found`)
    }
    // Validate derivation-premise type up front so callers get the
    // DERIVATION_TYPE_MISMATCH path before any clear-related throws.
    const premiseData = pm.toPremiseData()
    if (premiseData.type !== "derivation") {
        throw new InvariantViolationError([
            {
                code: "DERIVATION_TYPE_MISMATCH",
                message: `DERIVATION_TYPE_MISMATCH: premise ${derivationPremiseId} is not a derivation premise (type=${premiseData.type ?? "freeform"})`,
                entityType: "premise",
                entityId: derivationPremiseId,
                premiseId: derivationPremiseId,
            },
        ])
    }

    // Idempotency short-circuit. If the root is already
    // `IMPLIES(axiom_var, Q)` with `axiom_var` bound to this axiom's claim
    // id, nothing to do — return an empty changeset without invoking
    // `clearDerivationAntecedent` (which would still be a no-op shape-wise
    // but would also cascade-remove the axiom-bound variable we'd
    // immediately re-add, producing a non-empty churn changeset for
    // identity work).
    if (isAlreadyAxiomBacked(engine, pm, axiomaticClaim.id)) {
        return { changes: {} }
    }

    const collected: ProjectChangeset[] = []

    // 1. Clear any existing antecedent so the root is back to the naked-Q
    //    form. The helper is a no-op on an already-naked premise, so
    //    transitioning from `empty` and `citation-backed` are both
    //    handled uniformly. The clear's changeset carries the removals
    //    of any prior citation-bound variables + their expressions plus
    //    the IMPLIES/OR scaffolding.
    const { changes: clearChanges } = clearDerivationAntecedent(
        engine,
        derivationPremiseId
    )
    collected.push(clearChanges)

    // 2. Now the root must be the bare consequent variable expression.
    const rootExprId = pm.getRootExpressionId()
    if (rootExprId === undefined) {
        throw new Error(
            `populateDerivationFromAxiom: premise ${derivationPremiseId} has no root expression after clear`
        )
    }
    const consequentExpr = pm.getExpression(rootExprId)
    if (consequentExpr?.type !== "variable") {
        throw new Error(
            `populateDerivationFromAxiom: post-clear root expression is not a bare variable (got ${
                consequentExpr?.type ?? "undefined"
            })`
        )
    }
    if (consequentExpr.variableId == null) {
        throw new Error(
            "populateDerivationFromAxiom: consequent variable expression has no variableId"
        )
    }

    const sharedMeta = {
        argumentId: consequentExpr.argumentId,
        argumentVersion: consequentExpr.argumentVersion,
        premiseId: derivationPremiseId,
        creatorId: consequentExpr.creatorId,
        createdOn: consequentExpr.createdOn,
    }

    // 3. Materialize the claim-bound variable for the axiomatic claim.
    //    `ensureClaimBoundVariable` bypasses the standard mutation surface
    //    (no changeset emitted), so capture newly-added vars by diffing
    //    pre/post variable sets — same pattern as the citation helper.
    const variablesBefore = new Set(engine.getVariables().map((v) => v.id))
    const axiomVar = engine.ensureClaimBoundVariable(
        axiomaticClaim.id
    ) as unknown as TPropositionalVariable
    if (!variablesBefore.has(axiomVar.id)) {
        collected.push({
            variables: {
                added: [axiomVar],
                modified: [],
                removed: [],
            },
        })
    }

    // 4. Build the IMPLIES tree by wrapping the consequent expression.
    //    `wrapExpression` with `rightNodeId=consequentExpr.id` makes the
    //    existing consequent the right (consequent) child and the new
    //    sibling the left (antecedent) child of the new IMPLIES root.
    //    n=1 form — no formula buffer needed (no operator-under-operator
    //    nesting), build under whatever behavior the caller set (matches
    //    the citation helper's n=1 branch).
    const impliesId = generateId()
    const impliesOp = {
        id: impliesId,
        ...sharedMeta,
        parentId: null,
        type: "operator" as const,
        operator: "implies" as const,
        variableId: null,
    }
    const axiomExpr = {
        id: generateId(),
        ...sharedMeta,
        parentId: null, // wrapExpression sets the real parentId
        type: "variable" as const,
        variableId: axiomVar.id,
        operator: null,
    }
    const { changes: wrap } = pm.wrapExpression(
        impliesOp as Parameters<typeof pm.wrapExpression>[0],
        axiomExpr as Parameters<typeof pm.wrapExpression>[1],
        undefined,
        consequentExpr.id
    )
    collected.push(wrap)

    return { changes: mergeChangesetSequence(collected) }
}

/**
 * Returns true iff the derivation premise's root expression is
 * `IMPLIES(axiom_var, Q)` where `axiom_var` resolves to a claim-bound
 * variable for `axiomClaimId`. Used by `populateDerivationFromAxiom` for
 * the idempotency short-circuit.
 */
function isAlreadyAxiomBacked(
    engine: ProjectEngine,
    pm: NonNullable<ReturnType<ProjectEngine["getPremise"]>>,
    axiomClaimId: string
): boolean {
    const rootExprId = pm.getRootExpressionId()
    if (rootExprId === undefined) return false
    const root = pm.getExpression(rootExprId)
    if (root?.type !== "operator" || root.operator !== "implies") {
        return false
    }
    const rootChildren = pm
        .getChildExpressions(rootExprId)
        .sort((a, b) => a.position - b.position)
    if (rootChildren.length !== 2) return false
    const antecedent = rootChildren[0]
    if (antecedent.type !== "variable" || antecedent.variableId == null) {
        return false
    }
    const antecedentVar = engine.getVariable(antecedent.variableId)
    if (!antecedentVar || !("claimId" in antecedentVar)) return false
    return antecedentVar.claimId === axiomClaimId
}

// ──── Internal helpers ─────────────────────────────────────────────────────

/**
 * Strips entries with the given IDs from the `added`/`modified`/`removed`
 * arrays of a changeset. Used to drop engine-auto-generated entities so the
 * caller-facing changeset only references caller-minted IDs.
 */
function withoutEntities(
    changes: ProjectChangeset,
    omit: { variableIds?: Set<string>; expressionIds?: Set<string> }
): ProjectChangeset {
    const result: ProjectChangeset = { ...changes }
    if (
        changes.expressions &&
        omit.expressionIds &&
        omit.expressionIds.size > 0
    ) {
        const ids = omit.expressionIds
        result.expressions = {
            added: changes.expressions.added.filter((e) => !ids.has(e.id)),
            modified: changes.expressions.modified.filter(
                (e) => !ids.has(e.id)
            ),
            removed: changes.expressions.removed.filter((e) => !ids.has(e.id)),
        }
    }
    if (changes.variables && omit.variableIds && omit.variableIds.size > 0) {
        const ids = omit.variableIds
        result.variables = {
            added: changes.variables.added.filter((v) => !ids.has(v.id)),
            modified: changes.variables.modified.filter((v) => !ids.has(v.id)),
            removed: changes.variables.removed.filter((v) => !ids.has(v.id)),
        }
    }
    return result
}

/** Generates a fresh UUID for engine-auto-generated antecedent expressions. */
function generateId(): string {
    return crypto.randomUUID()
}

/**
 * Drops a premise id from the `modified` bucket of a changeset. Used when
 * combining a changeset that *added* a premise with later changesets that
 * report the same premise as `modified` (e.g. an `appendExpression` call
 * marks the parent premise as modified). The merged result needs only the
 * `added` entry — the `modified` entry is redundant and `mergeChangesets`
 * rejects ids appearing in both buckets.
 */
function withoutPremiseModifications(
    changes: ProjectChangeset,
    premiseId: string
): ProjectChangeset {
    if (!changes.premises) return changes
    const filteredModified = changes.premises.modified.filter(
        (p) => p.id !== premiseId
    )
    if (filteredModified.length === changes.premises.modified.length) {
        return changes
    }
    return {
        ...changes,
        premises: {
            ...changes.premises,
            modified: filteredModified,
        },
    }
}

/**
 * Drops every entity that appears in `added` from the `modified` bucket of
 * the same category. Required because core's `createPremiseWithId` for
 * derivation type emits the new premise in BOTH `added` (outer collector) and
 * `modified` (the inner naked-Q expression's `flushAndBuildChangeset` pushes
 * a `modifiedPremise` entry as the premise's checksum changes). Both entries
 * describe the same row; the `added` entry's data is the latest snapshot, so
 * the `modified` entry is redundant.
 */
function sanitizeAddedThenModified(
    changes: ProjectChangeset
): ProjectChangeset {
    const result: ProjectChangeset = { ...changes }
    if (changes.premises) {
        const addedIds = new Set(changes.premises.added.map((p) => p.id))
        result.premises = {
            ...changes.premises,
            modified: changes.premises.modified.filter(
                (p) => !addedIds.has(p.id)
            ),
        }
    }
    if (changes.variables) {
        const addedIds = new Set(changes.variables.added.map((v) => v.id))
        result.variables = {
            ...changes.variables,
            modified: changes.variables.modified.filter(
                (v) => !addedIds.has(v.id)
            ),
        }
    }
    if (changes.expressions) {
        const addedIds = new Set(changes.expressions.added.map((e) => e.id))
        result.expressions = {
            ...changes.expressions,
            modified: changes.expressions.modified.filter(
                (e) => !addedIds.has(e.id)
            ),
        }
    }
    return result
}

/**
 * Merges a list of changesets, treating later `added` entries for the same id
 * as superseding earlier `modified` entries (and vice versa). This is needed
 * when the engine reports the same entity in different buckets across
 * sequential mutations — e.g. an `appendExpression` adds an OR and its
 * subsequent `appendExpression` reports OR's descendant-checksum change as a
 * `modified` entry, which would otherwise trip `mergeChangesets`'s
 * single-bucket invariant.
 *
 * Resolution rule per id:
 *   - If the id is `added` in ANY changeset, drop all `modified` entries for
 *     that id (the `added` row will reflect the final post-merge state).
 *   - If the id is `removed` in ANY changeset, drop all `modified` entries
 *     for that id (the row is going away; intermediate descendant-checksum
 *     changes on it are irrelevant to the merged result). This case shows up
 *     in `clearDerivationAntecedent` after an engine reload: removing the
 *     antecedent triggers a descendant-checksum recompute on the parent
 *     IMPLIES (emitted as `modified` in step 1's changeset), and step 2
 *     subsequently removes IMPLIES — without this rule, IMPLIES would land
 *     in both buckets.
 *   - If `added` and `removed` for the same id appear, that's a logic error
 *     and `mergeChangesets` will surface it.
 */
function mergeChangesetSequence(
    changesets: ProjectChangeset[]
): ProjectChangeset {
    const addedIds = {
        premises: new Set<string>(),
        variables: new Set<string>(),
        expressions: new Set<string>(),
    }
    const removedIds = {
        premises: new Set<string>(),
        variables: new Set<string>(),
        expressions: new Set<string>(),
    }
    for (const c of changesets) {
        for (const p of c.premises?.added ?? []) addedIds.premises.add(p.id)
        for (const v of c.variables?.added ?? []) addedIds.variables.add(v.id)
        for (const e of c.expressions?.added ?? [])
            addedIds.expressions.add(e.id)
        for (const p of c.premises?.removed ?? []) removedIds.premises.add(p.id)
        for (const v of c.variables?.removed ?? [])
            removedIds.variables.add(v.id)
        for (const e of c.expressions?.removed ?? [])
            removedIds.expressions.add(e.id)
    }
    let result: ProjectChangeset = {}
    for (const c of changesets) {
        const sanitized: ProjectChangeset = { ...c }
        if (c.premises) {
            sanitized.premises = {
                ...c.premises,
                modified: c.premises.modified.filter(
                    (p) =>
                        !addedIds.premises.has(p.id) &&
                        !removedIds.premises.has(p.id)
                ),
            }
        }
        if (c.variables) {
            sanitized.variables = {
                ...c.variables,
                modified: c.variables.modified.filter(
                    (v) =>
                        !addedIds.variables.has(v.id) &&
                        !removedIds.variables.has(v.id)
                ),
            }
        }
        if (c.expressions) {
            sanitized.expressions = {
                ...c.expressions,
                modified: c.expressions.modified.filter(
                    (e) =>
                        !addedIds.expressions.has(e.id) &&
                        !removedIds.expressions.has(e.id)
                ),
            }
        }
        result = mergeChangesets(result, sanitized)
    }
    return result
}
