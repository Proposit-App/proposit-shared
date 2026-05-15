import { InvariantViolationError } from "@proposit/proposit-core"
import type {
    TPremiseRoleType,
    TPropositionalPremise,
    TPropositionalVariable,
    TPropositionalExpressionCombined,
} from "../../schemas/logic.js"
import type { ProjectEngine, ProjectChangeset } from "./types.js"
import { mergeChangesets } from "./types.js"

// Error codes mirrored from `@proposit/proposit-core`. Surfaced in messages so
// callers (server, tests) can match on string codes without importing core.
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
        // proposit-core 0.8.0+ auto-sets the first premise as conclusion
        // regardless of the requested role. Undo the auto-assignment when
        // the caller requested "supporting".
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
    if (newRole === "conclusion") {
        const { changes } = engine.setConclusionPremise(premiseId)
        return { changes }
    }

    const currentConclusion = engine.getConclusionPremise()
    if (currentConclusion?.getId() === premiseId) {
        const { changes } = engine.clearConclusionPremise()
        return { changes }
    }

    return { changes: {} }
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
    //     (no formula buffer), reached only via a load through
    //     `LOADING_GRAMMAR`.
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
    // Standard grammar drives construction throughout. For n ≥ 2 the engine
    // inserts a formula buffer between IMPLIES and OR (in core ≤ 0.12.x this
    // is the `wrapInsertFormula` auto-normalize rule; in core ≥ 1.0.0 it is
    // the AN post-hook in assistive behavior — see cross-repo spec
    // 2026-05-13-grammar-tiers-design §5). The result is the canonical
    // `IMPLIES(formula(OR(c1, …, cn)), Q)` shape. n = 0 and n = 1 have no
    // operator-under-operator nesting so no formula gets inserted.
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
    // n ≥ 2: wrap with IMPLIES(OR, Q) and append citation children to OR.
    // The engine slips a formula expression between IMPLIES and OR
    // (auto-normalize in core ≤ 0.12.x; AN post-hook in core ≥ 1.0.0
    // assistive behavior).
    const orId = generateId()
    const orSibling = {
        id: orId,
        ...sharedMeta,
        parentId: null,
        type: "operator" as const,
        operator: "or" as const,
        variableId: null,
    }
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

    return { changes: mergeChangesetSequence(collected) }
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
