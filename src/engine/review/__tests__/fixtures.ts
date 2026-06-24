// Inherited from proposit-server. Legacy interface name (ReviewEngineLike)
// predates the brain-style T-prefix convention; retained to preserve the
// structural-typing pattern documented below. Tracked as tech debt for a
// dedicated follow-up.
/* eslint-disable @typescript-eslint/naming-convention */
import { PropositArgumentEngine } from "../../engine.js"
import { CHECKSUM_CONFIG } from "../../../checksum.js"
import { createClaimLookup } from "../../library-adapters.js"
import type { TClaim, TAxiomaticClaim } from "../../../schemas/model/claims.js"
import type { TArgument } from "../../../schemas/model/arguments.js"
import type { TClaimBoundVariable } from "../../../schemas/logic.js"

// Structural type for ReviewEngine methods used by phase-advancement helpers.
// The concrete ReviewEngine class is defined elsewhere; declaring it structurally here keeps this
// fixture file free of circular imports and compiles without forward references.
interface ReviewEngineLike {
    getSnapshot(): {
        draft: { phase: "claims" | "operators" | "done" }
        currentStep:
            | { kind: "claim"; claimId: string }
            | {
                  kind: "operator"
                  premiseId: string
                  scope: "premise" | "expression"
                  expressionId?: string
              }
            | { kind: "skip-requeue-notice" }
            | { kind: "results" }
            | undefined
    }
    setClaimValue(claimId: string, value: boolean | null): void
    setOperatorAssignment(input: {
        premiseId: string
        scope: "premise" | "expression"
        expressionId?: string
        decision: "accepted" | "rejected"
    }): void
    advanceStep(): void
    proceedWithSkippedAsUnknown(): void
}

// Concrete IDs used across the review test suite so assertions can reference them
// directly. These aren't UUIDs — the engine accepts any unique string for entity IDs
// in tests; schema validation only applies at storage boundaries.
const ARGUMENT_ID = "00000000-0000-0000-0000-00000000a001"
const ARGUMENT_VERSION = 1
const CREATOR_ID = "00000000-0000-0000-0000-00000000c001"

const CLAIM_IDS = {
    sA: "sA",
    cA: "cA",
    cB: "cB",
} as const

const PREMISE_IDS = {
    pSupport: "pSupport",
    pConclusion: "pConclusion",
} as const

const VARIABLE_IDS = {
    vS1: "vS1",
    vS2: "vS2",
    vA: "vA",
    vB: "vB",
} as const

const EXPR_IDS = {
    // Supporting premise: implies(S1, S2) — both bound to claim sA so the premise
    // qualifies as an inference (core.listSupportingPremises() filters on
    // isInference(), which requires a root operator of "implies" or "iff"),
    // while the claim queue still contains only sA for this premise.
    supportRoot: "eSupportRoot",
    supportLeft: "eSupportLeft",
    supportRight: "eSupportRight",
    // Conclusion premise: implies(A, B)
    impliesRoot: "eImpliesRoot",
    impliesLeft: "eImpliesLeft",
    impliesRight: "eImpliesRight",
} as const

const NOW = new Date("2026-04-14T00:00:00Z")

function makeClaim(id: string, title: string): TClaim {
    return {
        id,
        originArgumentId: ARGUMENT_ID,
        version: ARGUMENT_VERSION,
        published: false,
        publishedOn: null,
        title,
        body: `Body of ${title}`,
        titleContentHash: `hash-of-${id}`,
        kind: "claim",
        type: "normal",
        creatorId: CREATOR_ID,
        createdOn: NOW,
        digest: `digest-${id}`,
        parentId: null,
        claimForkId: null,
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: null,
    }
}

function makeArgument(): TArgument {
    return {
        id: ARGUMENT_ID,
        version: ARGUMENT_VERSION,
        checksum: "test",
        descendantChecksum: null,
        combinedChecksum: "test",
        title: "Review Fixture Argument",
        published: false,
        creatorId: CREATOR_ID,
        createdOn: NOW,
        publishedOn: null,
        forkId: null,
        digest: "test-digest",
        popularity: 0,
        platform: "manual",
        platformData: null,
        platformUsername: null,
        titleContentHash: null,
        description: null,
    }
}

function makeVariable(
    id: string,
    symbol: string,
    claimId: string
): TClaimBoundVariable {
    return {
        id,
        checksum: "test",
        descendantChecksum: null,
        combinedChecksum: "test",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        claimId,
        claimVersion: 1,
        symbol,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    }
}

/**
 * Builds a minimal PropositArgumentEngine:
 *   - Supporting premise `pSupport`: single variable referencing claim `sA` (no operators)
 *   - Conclusion premise `pConclusion`: implies(A, B) where A → cA, B → cB
 *
 * Construction uses `permissive` engine behavior so the AN post-hook
 * doesn't fire between consecutive `addExpression` calls — AN-3 would
 * delete the transient 0-child IMPLIES root before its children land
 * (core 1.0 spec §11 incremental tree-build pattern). The engine flips
 * to the default `'assistive'` behavior before returning so test
 * assertions see the runtime contract that production callers get.
 */
export function buildEngineWithTwoPremises(): PropositArgumentEngine {
    const claims = [
        makeClaim(CLAIM_IDS.sA, "Claim sA"),
        makeClaim(CLAIM_IDS.cA, "Claim cA"),
        makeClaim(CLAIM_IDS.cB, "Claim cB"),
    ]
    const claimLookup = createClaimLookup(claims)

    const engine = new PropositArgumentEngine(makeArgument(), claimLookup, {
        checksumConfig: CHECKSUM_CONFIG,
        behavior: "permissive",
    })

    // Variables — two bound to sA so pSupport can be an implies(S1, S2) inference
    // while still referencing only one claim (sA) for the claim queue.
    engine.addVariable(makeVariable(VARIABLE_IDS.vS1, "S1", CLAIM_IDS.sA))
    engine.addVariable(makeVariable(VARIABLE_IDS.vS2, "S2", CLAIM_IDS.sA))
    engine.addVariable(makeVariable(VARIABLE_IDS.vA, "A", CLAIM_IDS.cA))
    engine.addVariable(makeVariable(VARIABLE_IDS.vB, "B", CLAIM_IDS.cB))

    // Supporting premise: implies(S1, S2) — both reference claim sA.
    const { result: pSupport } = engine.createPremiseWithId(
        PREMISE_IDS.pSupport,
        {
            type: "freeform",
            extras: {
                title: "Supporting — S1 implies S2",
                role: "supporting",
                createdOn: NOW,
                creatorId: CREATOR_ID,
            },
        }
    )
    pSupport.addExpression({
        id: EXPR_IDS.supportRoot,
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: null,
        premiseId: PREMISE_IDS.pSupport,
        position: 0,
        type: "operator",
        variableId: null,
        operator: "implies",
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    pSupport.addExpression({
        id: EXPR_IDS.supportLeft,
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: EXPR_IDS.supportRoot,
        premiseId: PREMISE_IDS.pSupport,
        position: 0,
        type: "variable",
        variableId: VARIABLE_IDS.vS1,
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    pSupport.addExpression({
        id: EXPR_IDS.supportRight,
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: EXPR_IDS.supportRoot,
        premiseId: PREMISE_IDS.pSupport,
        position: 1,
        type: "variable",
        variableId: VARIABLE_IDS.vS2,
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })

    // Conclusion premise: implies(A, B)
    const { result: pConclusion } = engine.createPremiseWithId(
        PREMISE_IDS.pConclusion,
        {
            type: "freeform",
            extras: {
                title: "Conclusion — A implies B",
                role: "conclusion",
                createdOn: NOW,
                creatorId: CREATOR_ID,
            },
        }
    )
    pConclusion.addExpression({
        id: EXPR_IDS.impliesRoot,
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: null,
        premiseId: PREMISE_IDS.pConclusion,
        position: 0,
        type: "operator",
        variableId: null,
        operator: "implies",
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    pConclusion.addExpression({
        id: EXPR_IDS.impliesLeft,
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: EXPR_IDS.impliesRoot,
        premiseId: PREMISE_IDS.pConclusion,
        position: 0,
        type: "variable",
        variableId: VARIABLE_IDS.vA,
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    pConclusion.addExpression({
        id: EXPR_IDS.impliesRight,
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: EXPR_IDS.impliesRoot,
        premiseId: PREMISE_IDS.pConclusion,
        position: 1,
        type: "variable",
        variableId: VARIABLE_IDS.vB,
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })

    engine.setConclusionPremise(PREMISE_IDS.pConclusion)
    for (const c of claims) engine.setClaim(c)

    // Restore the production-default behavior so review tests see the same
    // assistive AN post-hook semantics that real callers get.
    engine.setBehavior("assistive")

    return engine
}

/** Alias used by later tasks. */
export const buildEngine = buildEngineWithTwoPremises

function makeAxiomaticClaim(id: string, title: string): TAxiomaticClaim {
    return {
        id,
        originArgumentId: ARGUMENT_ID,
        version: ARGUMENT_VERSION,
        published: false,
        publishedOn: null,
        creatorId: CREATOR_ID,
        createdOn: NOW,
        digest: `digest-${id}`,
        type: "axiomatic",
        kind: null,
        title: null,
        body: null,
        titleContentHash: null,
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: "logical-principle",
        parentId: null,
        claimForkId: null,
        // `title` is null on AxiomaticClaimSchema, but tests still want a
        // human-readable label for logging — store it on the digest field.
        ...{ _label: title },
    } as unknown as TAxiomaticClaim
}

/**
 * Builds a minimal engine whose conclusion premise's root expression is a
 * single variable expression bound to an axiomatic claim. With no user
 * assignments, the only way the review evaluation can return a definite
 * verdict is if the engine forces the axiomatic-bound variable to `true`
 * before evaluating. Used by the axiomatic-conclusion regression test.
 */
export function buildEngineWithAxiomaticConclusion(): PropositArgumentEngine {
    const axiomClaim = makeAxiomaticClaim("cAxiom", "Axiom claim")
    const claims = [axiomClaim] as unknown as TClaim[]
    const claimLookup = createClaimLookup(claims)

    const engine = new PropositArgumentEngine(makeArgument(), claimLookup, {
        checksumConfig: CHECKSUM_CONFIG,
        behavior: "permissive",
    })

    engine.addVariable(makeVariable("vAxiom", "X", "cAxiom"))

    const conclusionPremiseId = "pAxiomaticConclusion"
    const { result: pConclusion } = engine.createPremiseWithId(
        conclusionPremiseId,
        {
            type: "freeform",
            extras: {
                title: "Conclusion — axiom variable",
                role: "conclusion",
                createdOn: NOW,
                creatorId: CREATOR_ID,
            },
        }
    )
    pConclusion.addExpression({
        id: "eAxiomRoot",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: null,
        premiseId: conclusionPremiseId,
        position: 0,
        type: "variable",
        variableId: "vAxiom",
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })

    engine.setConclusionPremise(conclusionPremiseId)
    for (const c of claims) engine.setClaim(c)

    engine.setBehavior("assistive")
    return engine
}

/**
 * Builds a minimal engine with:
 *   - A conclusion premise whose root is a single variable expression bound
 *     to `cConclusion` (a normal claim).
 *   - A supporting "naked-Q derivation premise" whose root is a single
 *     variable expression bound to `cDerived` (a normal claim). This is the
 *     post-`addClaim` scaffolding shape: every non-conclusion normal claim
 *     has a hidden derivation premise minted in the naked-Q form.
 *
 * With only `cConclusion` assigned true and `cDerived` left unassigned, the
 * standalone evaluator sees the naked-Q derivation premise's variable as
 * null and propagates that null up through `allSupportingPremisesTrue` →
 * Indeterminate. The engine's `asEvaluationContext()` filters naked-Q
 * derivation premises out, so calling `engine.evaluate(...)` (the safety-
 * net path) gives a definite verdict. Used by the naked-Q safety-net regression test.
 */
export function buildEngineWithNakedQSupportingPremise(): PropositArgumentEngine {
    const claims = [
        makeClaim("cConclusion", "Conclusion claim"),
        makeClaim("cDerived", "Derived claim (scaffold)"),
    ]
    const claimLookup = createClaimLookup(claims)

    const engine = new PropositArgumentEngine(makeArgument(), claimLookup, {
        checksumConfig: CHECKSUM_CONFIG,
        behavior: "permissive",
    })

    engine.addVariable(makeVariable("vConclusion", "C", "cConclusion"))

    // Conclusion premise: single variable expression for cConclusion.
    const conclusionPremiseId = "pConclusion"
    const { result: pConclusion } = engine.createPremiseWithId(
        conclusionPremiseId,
        {
            type: "freeform",
            extras: {
                title: "Conclusion — C",
                role: "conclusion",
                createdOn: NOW,
                creatorId: CREATOR_ID,
            },
        }
    )
    pConclusion.addExpression({
        id: "eConclusionRoot",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: null,
        premiseId: conclusionPremiseId,
        position: 0,
        type: "variable",
        variableId: "vConclusion",
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })

    // Naked-Q derivation premise for cDerived. `createPremiseWithId` with
    // `type: "derivation"` auto-creates the consequent variable + naked-Q
    // expression — we don't have to wire anything manually.
    engine.createPremiseWithId("pNakedQ", {
        type: "derivation",
        derivedClaimId: "cDerived",
        extras: {
            creatorId: CREATOR_ID,
            createdOn: NOW,
            role: "supporting" as const,
        },
    })

    engine.setConclusionPremise(conclusionPremiseId)
    for (const c of claims) engine.setClaim(c)

    engine.setBehavior("assistive")
    return engine
}

/**
 * Fast-forwards a ReviewEngine through the claim phase, assigning `true` to every claim
 * and advancing until the phase transitions to "operators".
 */
export async function completeClaimPhase(re: ReviewEngineLike): Promise<void> {
    while (re.getSnapshot().draft.phase === "claims") {
        const step = re.getSnapshot().currentStep
        if (step?.kind === "claim") {
            re.setClaimValue(step.claimId, true)
            re.advanceStep()
        } else if (step?.kind === "skip-requeue-notice") {
            re.proceedWithSkippedAsUnknown()
        } else {
            break
        }
    }
    await Promise.resolve()
}

/**
 * Fast-forwards a ReviewEngine through both phases, accepting every premise-level
 * operator decision.
 */
export async function completeFullPhases(re: ReviewEngineLike): Promise<void> {
    await completeClaimPhase(re)

    while (re.getSnapshot().draft.phase === "operators") {
        const step = re.getSnapshot().currentStep
        if (step?.kind === "operator") {
            re.setOperatorAssignment({
                premiseId: step.premiseId,
                scope: step.scope,
                expressionId: step.expressionId,
                decision: "accepted",
            })
            re.advanceStep()
        } else if (step?.kind === "skip-requeue-notice") {
            re.proceedWithSkippedAsUnknown()
        } else {
            break
        }
    }
}
