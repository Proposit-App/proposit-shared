// Inherited from proposit-server. Legacy interface name (ReviewEngineLike)
// predates the brain-style T-prefix convention; retained to preserve the
// structural-typing pattern documented below. Tracked as tech debt for a
// dedicated follow-up.
/* eslint-disable @typescript-eslint/naming-convention */
import { PropositArgumentEngine } from "../../engine.js"
import { CHECKSUM_CONFIG } from "../../../checksum.js"
import { createClaimLookup } from "../../library-adapters.js"
import {
    mutateCreateDerivationPremise,
    populateDerivationFromAxiom,
    populateDerivationFromCitations,
} from "../../mutations/premises.js"
import type {
    TClaim,
    TAxiomaticClaim,
    TCitationClaim,
} from "../../../schemas/model/claims.js"
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

/**
 * Builds an engine where one claim (`cShared`) is referenced by variables in
 * two *different* premises — the supporting inference and the conclusion —
 * so `buildClaimQueue` can be asserted to emit that claimId exactly once
 * (dedupe delegated to core's `collectArgumentReferencedClaims`).
 *
 *   - Supporting premise `pSupportShared`: implies(S1, S2), S1 → cShared, S2 → cOther
 *   - Conclusion premise `pConclusionShared`: implies(A, B),  A → cShared, B → cConcl
 *
 * Both variables that bind `cShared` use claimVersion 1, so the collector's
 * same-claim-different-version guard stays silent. Expected claim queue
 * (proof order, deduped): [cShared, cOther, cConcl].
 */
export function buildEngineWithClaimSharedAcrossPremises(): PropositArgumentEngine {
    const claims = [
        makeClaim("cShared", "Claim shared across premises"),
        makeClaim("cOther", "Claim cOther"),
        makeClaim("cConcl", "Claim cConcl"),
    ]
    const claimLookup = createClaimLookup(claims)

    const engine = new PropositArgumentEngine(makeArgument(), claimLookup, {
        checksumConfig: CHECKSUM_CONFIG,
        behavior: "permissive",
    })

    engine.addVariable(makeVariable("vSup1", "S1", "cShared"))
    engine.addVariable(makeVariable("vSup2", "S2", "cOther"))
    engine.addVariable(makeVariable("vCon1", "A", "cShared"))
    engine.addVariable(makeVariable("vCon2", "B", "cConcl"))

    const supportId = "pSupportShared"
    const { result: pSupport } = engine.createPremiseWithId(supportId, {
        type: "freeform",
        extras: {
            title: "Supporting — S1 implies S2",
            role: "supporting",
            createdOn: NOW,
            creatorId: CREATOR_ID,
        },
    })
    const wireImplies = (
        premise: typeof pSupport,
        premiseId: string,
        rootId: string,
        leftVarId: string,
        rightVarId: string
    ): void => {
        premise.addExpression({
            id: rootId,
            argumentId: ARGUMENT_ID,
            argumentVersion: ARGUMENT_VERSION,
            parentId: null,
            premiseId,
            position: 0,
            type: "operator",
            variableId: null,
            operator: "implies",
            createdOn: NOW,
            creatorId: CREATOR_ID,
        })
        premise.addExpression({
            id: `${rootId}-l`,
            argumentId: ARGUMENT_ID,
            argumentVersion: ARGUMENT_VERSION,
            parentId: rootId,
            premiseId,
            position: 0,
            type: "variable",
            variableId: leftVarId,
            operator: null,
            createdOn: NOW,
            creatorId: CREATOR_ID,
        })
        premise.addExpression({
            id: `${rootId}-r`,
            argumentId: ARGUMENT_ID,
            argumentVersion: ARGUMENT_VERSION,
            parentId: rootId,
            premiseId,
            position: 1,
            type: "variable",
            variableId: rightVarId,
            operator: null,
            createdOn: NOW,
            creatorId: CREATOR_ID,
        })
    }
    wireImplies(pSupport, supportId, "eSupShared", "vSup1", "vSup2")

    const conclusionId = "pConclusionShared"
    const { result: pConclusion } = engine.createPremiseWithId(conclusionId, {
        type: "freeform",
        extras: {
            title: "Conclusion — A implies B",
            role: "conclusion",
            createdOn: NOW,
            creatorId: CREATOR_ID,
        },
    })
    wireImplies(pConclusion, conclusionId, "eConShared", "vCon1", "vCon2")

    engine.setConclusionPremise(conclusionId)
    for (const c of claims) engine.setClaim(c)

    engine.setBehavior("assistive")
    return engine
}

/**
 * Builds an engine whose conclusion premise is `(A ∧ B) → Q` — the shape real
 * arguments take when several claims jointly support a conclusion.
 *
 * The conjunction is the point: an evaluator that treats an accepted `and` as
 * an assertion about its conjuncts will manufacture `true` for A, B and then Q
 * out of an assignment where all three are unknown.
 */
export function buildEngineWithConjunctiveAntecedent(): PropositArgumentEngine {
    const claims = [
        makeClaim("cA", "Claim cA"),
        makeClaim("cB", "Claim cB"),
        makeClaim("cQ", "Claim cQ"),
    ]
    const claimLookup = createClaimLookup(claims)

    const engine = new PropositArgumentEngine(makeArgument(), claimLookup, {
        checksumConfig: CHECKSUM_CONFIG,
        behavior: "permissive",
    })

    engine.addVariable(makeVariable("vA", "A", "cA"))
    engine.addVariable(makeVariable("vB", "B", "cB"))
    engine.addVariable(makeVariable("vQ", "Q", "cQ"))

    const conclusionId = "pConjunctiveConclusion"
    const { result: pConclusion } = engine.createPremiseWithId(conclusionId, {
        type: "freeform",
        extras: {
            title: "Conclusion — (A and B) implies Q",
            role: "conclusion",
            createdOn: NOW,
            creatorId: CREATOR_ID,
        },
    })
    const common = (id: string, parentId: string | null, position: number) => ({
        id,
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId,
        premiseId: conclusionId,
        position,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    const operatorExpr = (
        id: string,
        parentId: string | null,
        position: number,
        operator: "and" | "implies"
    ): void => {
        pConclusion.addExpression({
            ...common(id, parentId, position),
            type: "operator",
            variableId: null,
            operator,
        })
    }
    const variableExpr = (
        id: string,
        parentId: string,
        position: number,
        variableId: string
    ): void => {
        pConclusion.addExpression({
            ...common(id, parentId, position),
            type: "variable",
            variableId,
            operator: null,
        })
    }
    operatorExpr("eImplies", null, 0, "implies")
    operatorExpr("eAnd", "eImplies", 0, "and")
    variableExpr("eA", "eAnd", 0, "vA")
    variableExpr("eB", "eAnd", 1, "vB")
    variableExpr("eQ", "eImplies", 1, "vQ")

    engine.setConclusionPremise(conclusionId)
    for (const c of claims) engine.setClaim(c)

    engine.setBehavior("assistive")
    return engine
}

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
 * A citation claim — the shape a source takes once it is bound to a variable.
 * `title` / `body` are null on `CitationClaimSchema`; identity lives in
 * `citation`. Anything that renders a queued claim's title renders nothing for
 * one of these, which is why they must never reach a review step.
 */
function makeCitationClaim(id: string, text: string): TCitationClaim {
    return {
        id,
        originArgumentId: ARGUMENT_ID,
        version: ARGUMENT_VERSION,
        published: false,
        publishedOn: null,
        creatorId: CREATOR_ID,
        createdOn: NOW,
        digest: `digest-${id}`,
        type: "citation",
        kind: null,
        title: null,
        body: null,
        titleContentHash: null,
        url: null,
        citation: {
            type: "unparsed",
            text,
            citationTypeGuess: "unknown",
        },
        citationContentHash: `citation-hash-${id}`,
        parentId: null,
        claimForkId: null,
        axiom: null,
    }
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
 * Builds an engine that mixes all three premise shapes a real argument has:
 *
 *   - `pSupport` — a freeform supporting inference `implies(A, B)`. Reviewable:
 *     it is user-authored and carries a decidable operator.
 *   - `pConclusion` — the conclusion premise as a bare variable bound to `cQ`.
 *     This is the shape curated arguments actually take: the conclusion premise
 *     asserts the conclusion claim and the supporting premises do the inferring.
 *     It has no operator expression, so there is nothing to decide on it.
 *   - `pDerivation` — the hidden derivation premise for `cA`, populated from a
 *     citation so its tree is `implies(citation_var, A)`. Engine-managed
 *     wiring, never user-authored.
 *   - `pAxiomDerivation` — the hidden derivation premise for `cB`, populated
 *     from an axiomatic claim so its tree is `implies(axiom_var, B)`. Same
 *     story as the citation, via the other derivation-only claim type.
 *
 * `cSource` and `cAxiom` are the two claim types that carry no prose. Both are
 * claim-bound here, so the claim queue has to exclude them by type rather than
 * by any property of the variable that binds them.
 */
export function buildEngineWithCitationBackedDerivationPremise(): PropositArgumentEngine {
    const axiomClaim = makeAxiomaticClaim("cAxiom", "Backing axiom")
    const claims = [
        makeClaim("cA", "Claim cA"),
        makeClaim("cB", "Claim cB"),
        makeClaim("cQ", "Conclusion claim cQ"),
        makeCitationClaim("cSource", "Citing source claim"),
        axiomClaim,
    ] as TClaim[]
    const claimLookup = createClaimLookup(claims)

    const engine = new PropositArgumentEngine(makeArgument(), claimLookup, {
        checksumConfig: CHECKSUM_CONFIG,
        behavior: "permissive",
    })
    for (const c of claims) engine.setClaim(c)

    engine.addVariable(makeVariable("vA", "A", "cA"))
    engine.addVariable(makeVariable("vB", "B", "cB"))
    engine.addVariable(makeVariable("vQ", "Q", "cQ"))

    // Freeform supporting inference: implies(A, B).
    const supportId = "pSupport"
    const { result: pSupport } = engine.createPremiseWithId(supportId, {
        type: "freeform",
        extras: {
            title: "Supporting — A implies B",
            role: "supporting",
            createdOn: NOW,
            creatorId: CREATOR_ID,
        },
    })
    pSupport.addExpression({
        id: "eSupportRoot",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: null,
        premiseId: supportId,
        position: 0,
        type: "operator",
        variableId: null,
        operator: "implies",
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    pSupport.addExpression({
        id: "eSupportLeft",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: "eSupportRoot",
        premiseId: supportId,
        position: 0,
        type: "variable",
        variableId: "vA",
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    pSupport.addExpression({
        id: "eSupportRight",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: "eSupportRoot",
        premiseId: supportId,
        position: 1,
        type: "variable",
        variableId: "vB",
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })

    // Conclusion premise: bare variable bound to cQ — no operator expression.
    const conclusionId = "pConclusion"
    const { result: pConclusion } = engine.createPremiseWithId(conclusionId, {
        type: "freeform",
        extras: {
            title: "Conclusion — Q",
            role: "conclusion",
            createdOn: NOW,
            creatorId: CREATOR_ID,
        },
    })
    pConclusion.addExpression({
        id: "eConclusionRoot",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: null,
        premiseId: conclusionId,
        position: 0,
        type: "variable",
        variableId: "vQ",
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    engine.setConclusionPremise(conclusionId)

    // Hidden derivation premise for cA, backed by one citation →
    // implies(cSource_var, A). Adopt rather than mint: cA already has a
    // claim-bound variable (`vA`, in pSupport), and the mint path removes the
    // claim's existing variable — which cascades away pSupport's child
    // expression and leaves its IMPLIES root childless.
    mutateCreateDerivationPremise(engine, "pDerivation", {
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        creatorId: CREATOR_ID,
        createdOn: NOW,
        derivedClaimId: "cA",
        existingConsequentVariableId: "vA",
        consequentExpressionId: "eDerivationConsequent",
    })
    populateDerivationFromCitations(engine, "pDerivation", ["cSource"])

    // Hidden derivation premise for cB, backed by an axiom →
    // implies(cAxiom_var, B).
    mutateCreateDerivationPremise(engine, "pAxiomDerivation", {
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        creatorId: CREATOR_ID,
        createdOn: NOW,
        derivedClaimId: "cB",
        existingConsequentVariableId: "vB",
        consequentExpressionId: "eAxiomDerivationConsequent",
    })
    populateDerivationFromAxiom(engine, "pAxiomDerivation", axiomClaim)

    engine.setBehavior("assistive")
    return engine
}

/**
 * Builds the shape where the conclusion is reachable *only* through a cited
 * claim:
 *
 *   - `pSupport` — `implies(Cited, Q)`, the single path to the conclusion.
 *   - `pConclusion` — the bare conclusion variable for `cQ`.
 *   - `pDerivation` — the derivation premise for `cCited`, populated from a
 *     citation → `implies(source_var, Cited)`.
 *
 * Nothing reaches `cQ` except through `cCited`, and `cCited` is backed by a
 * source. If leaving a source variable unassigned could stall evaluation, this
 * is the shape where it would show.
 */
export function buildEngineWithConclusionThroughCitedClaim(): PropositArgumentEngine {
    const claims = [
        makeClaim("cCited", "Cited claim"),
        makeClaim("cQ", "Conclusion claim cQ"),
        makeCitationClaim("cSource", "The source backing cCited"),
    ] as TClaim[]
    const claimLookup = createClaimLookup(claims)

    const engine = new PropositArgumentEngine(makeArgument(), claimLookup, {
        checksumConfig: CHECKSUM_CONFIG,
        behavior: "permissive",
    })
    for (const c of claims) engine.setClaim(c)

    engine.addVariable(makeVariable("vCited", "C", "cCited"))
    // One variable per premise, both bound to cQ — the same pattern
    // `buildEngineWithClaimSharedAcrossPremises` uses. Reusing a single
    // variable expression across two premises drops a child from whichever
    // premise wired it second.
    engine.addVariable(makeVariable("vQSupport", "Q1", "cQ"))
    engine.addVariable(makeVariable("vQ", "Q", "cQ"))

    // Supporting inference: implies(Cited, Q).
    const supportId = "pSupport"
    const { result: pSupport } = engine.createPremiseWithId(supportId, {
        type: "freeform",
        extras: {
            title: "Supporting — Cited implies Q",
            role: "supporting",
            createdOn: NOW,
            creatorId: CREATOR_ID,
        },
    })
    pSupport.addExpression({
        id: "eSupportRoot",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: null,
        premiseId: supportId,
        position: 0,
        type: "operator",
        variableId: null,
        operator: "implies",
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    pSupport.addExpression({
        id: "eSupportLeft",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: "eSupportRoot",
        premiseId: supportId,
        position: 0,
        type: "variable",
        variableId: "vCited",
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    pSupport.addExpression({
        id: "eSupportRight",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: "eSupportRoot",
        premiseId: supportId,
        position: 1,
        type: "variable",
        variableId: "vQSupport",
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })

    // Conclusion premise: bare variable bound to cQ.
    const conclusionId = "pConclusion"
    const { result: pConclusion } = engine.createPremiseWithId(conclusionId, {
        type: "freeform",
        extras: {
            title: "Conclusion — Q",
            role: "conclusion",
            createdOn: NOW,
            creatorId: CREATOR_ID,
        },
    })
    pConclusion.addExpression({
        id: "eConclusionRoot",
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        parentId: null,
        premiseId: conclusionId,
        position: 0,
        type: "variable",
        variableId: "vQ",
        operator: null,
        createdOn: NOW,
        creatorId: CREATOR_ID,
    })
    engine.setConclusionPremise(conclusionId)

    // Adopt `vCited` as the consequent — see the note on the citation-backed
    // fixture above for why minting a second variable for an already-bound
    // claim tears down the premise that references it.
    mutateCreateDerivationPremise(engine, "pDerivation", {
        argumentId: ARGUMENT_ID,
        argumentVersion: ARGUMENT_VERSION,
        creatorId: CREATOR_ID,
        createdOn: NOW,
        derivedClaimId: "cCited",
        existingConsequentVariableId: "vCited",
        consequentExpressionId: "eDerivationConsequent",
    })
    populateDerivationFromCitations(engine, "pDerivation", ["cSource"])

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

/**
 * Builds an engine carrying the two negation shapes the decision-target rule
 * has to get right, as freeform premises:
 *
 *   - `pNegatedConjunction` — `¬(A ∧ B)`. The reviewer decides the `∧`, which
 *     sits under the negation.
 *   - `pNegatedAtom` — `¬Q`. No decidable operator at any depth, so there is
 *     nothing to offer.
 *
 * A negated *conditional* is deliberately absent: the grammar puts inference
 * operators at a premise root only, so `¬(A → B)` cannot be built.
 *
 * Both premises are constraint-rooted (a `not` root is not an inference), so
 * neither enters the operator queue; the rule itself is asserted directly on
 * the premises.
 */
export function buildEngineWithNegatedPremises(): PropositArgumentEngine {
    const claims = [
        makeClaim("cA", "Claim cA"),
        makeClaim("cB", "Claim cB"),
        makeClaim("cQ", "Conclusion claim cQ"),
    ]
    const claimLookup = createClaimLookup(claims)
    const engine = new PropositArgumentEngine(makeArgument(), claimLookup, {
        checksumConfig: CHECKSUM_CONFIG,
        behavior: "permissive",
    })
    for (const c of claims) engine.setClaim(c)

    engine.addVariable(makeVariable("vA", "A", "cA"))
    engine.addVariable(makeVariable("vB", "B", "cB"))
    engine.addVariable(makeVariable("vQ", "Q", "cQ"))
    engine.addVariable(makeVariable("vQ2", "Q2", "cQ"))

    const add = (
        premise: { addExpression: (e: never) => unknown },
        premiseId: string,
        expr: {
            id: string
            parentId: string | null
            position: number
            type: "operator" | "variable"
            operator?: "not" | "and"
            variableId?: string
        }
    ): void => {
        premise.addExpression({
            id: expr.id,
            argumentId: ARGUMENT_ID,
            argumentVersion: ARGUMENT_VERSION,
            parentId: expr.parentId,
            premiseId,
            position: expr.position,
            type: expr.type,
            variableId: expr.variableId ?? null,
            operator: expr.operator ?? null,
            createdOn: NOW,
            creatorId: CREATOR_ID,
        } as never)
    }

    const negatedConjunctionId = "pNegatedConjunction"
    const { result: pNegatedConjunction } = engine.createPremiseWithId(
        negatedConjunctionId,
        {
            type: "freeform",
            extras: {
                title: "Not (A and B)",
                role: "supporting",
                createdOn: NOW,
                creatorId: CREATOR_ID,
            },
        }
    )
    add(pNegatedConjunction, negatedConjunctionId, {
        id: "eNotRoot",
        parentId: null,
        position: 0,
        type: "operator",
        operator: "not",
    })
    add(pNegatedConjunction, negatedConjunctionId, {
        id: "eInnerAnd",
        parentId: "eNotRoot",
        position: 0,
        type: "operator",
        operator: "and",
    })
    add(pNegatedConjunction, negatedConjunctionId, {
        id: "eInnerLeft",
        parentId: "eInnerAnd",
        position: 0,
        type: "variable",
        variableId: "vA",
    })
    add(pNegatedConjunction, negatedConjunctionId, {
        id: "eInnerRight",
        parentId: "eInnerAnd",
        position: 1,
        type: "variable",
        variableId: "vB",
    })

    const negatedAtomId = "pNegatedAtom"
    const { result: pNegatedAtom } = engine.createPremiseWithId(negatedAtomId, {
        type: "freeform",
        extras: {
            title: "Not Q",
            role: "supporting",
            createdOn: NOW,
            creatorId: CREATOR_ID,
        },
    })
    add(pNegatedAtom, negatedAtomId, {
        id: "eNegatedAtomRoot",
        parentId: null,
        position: 0,
        type: "operator",
        operator: "not",
    })
    add(pNegatedAtom, negatedAtomId, {
        id: "eNegatedAtomChild",
        parentId: "eNegatedAtomRoot",
        position: 0,
        type: "variable",
        variableId: "vQ2",
    })

    const conclusionId = "pConclusion"
    const { result: pConclusion } = engine.createPremiseWithId(conclusionId, {
        type: "freeform",
        extras: {
            title: "Conclusion — Q",
            role: "conclusion",
            createdOn: NOW,
            creatorId: CREATOR_ID,
        },
    })
    add(pConclusion, conclusionId, {
        id: "eConclusionRoot",
        parentId: null,
        position: 0,
        type: "variable",
        variableId: "vQ",
    })
    engine.setConclusionPremise(conclusionId)

    engine.setBehavior("assistive")
    return engine
}
