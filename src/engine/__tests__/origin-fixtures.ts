import { v4 } from "uuid"
import { sha256Hex } from "@proposit/proposit-core"
import { CHECKSUM_CONFIG } from "../../checksum.js"
import { PropositArgumentEngine } from "../engine.js"
import { createClaimLookup } from "../library-adapters.js"
import {
    mutateCreateExpression,
    mutateWrapExpression,
} from "../mutations/expressions.js"
import { mutateCreateDerivationPremise } from "../mutations/premises.js"
import type { TArgument } from "../../schemas/model/arguments.js"
import type { TPropositionalVariable } from "../../schemas/logic.js"
import type {
    TOriginAnchor,
    TOriginDocument,
    TOriginLink,
    TOriginStance,
} from "../../schemas/model/origin.js"

/**
 * Builds an engine holding one supporting premise with two variable
 * expressions — one claim-bound, one premise-bound — which is the smallest
 * shape that exercises both the enthymeme mutations and the suggestion
 * derivation's claim-bound-only rule.
 */
export const ORIGIN_TEXT =
    "All men are mortal. Socrates is a man. Therefore Socrates is mortal."

export const ANCHOR_QUOTE = "Socrates is a man."

export type TOriginTestScene = {
    engine: PropositArgumentEngine
    argumentId: string
    argumentVersion: number
    creatorId: string
    claimId: string
    claimBoundVariableId: string
    premiseId: string
    claimBoundExpressionId: string
    operatorExpressionId: string
    premiseBoundExpressionId: string
}

export function buildOriginScene(): TOriginTestScene {
    const argumentId = v4()
    const argumentVersion = 1
    const creatorId = v4()
    const now = new Date("2026-01-01T00:00:00Z")

    const argument: TArgument = {
        id: argumentId,
        version: argumentVersion,
        checksum: "test",
        descendantChecksum: null,
        combinedChecksum: "test",
        title: "Test Argument",
        published: false,
        creatorId,
        createdOn: now,
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

    const claimId = v4()
    const secondClaimId = v4()
    const engine = new PropositArgumentEngine(
        argument,
        createClaimLookup([
            { id: claimId, version: 1 },
            { id: secondClaimId, version: 1 },
        ]),
        { checksumConfig: CHECKSUM_CONFIG }
    )

    const premiseId = v4()
    engine.createPremiseWithId(premiseId, {
        argumentId,
        argumentVersion,
        title: "Test premise",
        role: "supporting",
        createdOn: now,
        creatorId,
    })

    const claimBoundVariable: TPropositionalVariable = {
        id: v4(),
        argumentId,
        argumentVersion,
        claimId,
        claimVersion: 1,
        symbol: "P",
        checksum: "test",
        descendantChecksum: null,
        combinedChecksum: "test",
        createdOn: now,
        creatorId,
    }
    engine.addVariable(claimBoundVariable)

    const secondClaimBoundVariable: TPropositionalVariable = {
        id: v4(),
        argumentId,
        argumentVersion,
        claimId: secondClaimId,
        claimVersion: 1,
        symbol: "R",
        checksum: "test",
        descendantChecksum: null,
        combinedChecksum: "test",
        createdOn: now,
        creatorId,
    }
    engine.addVariable(secondClaimBoundVariable)

    const otherPremiseId = v4()
    engine.createPremiseWithId(otherPremiseId, {
        argumentId,
        argumentVersion,
        title: "Bound premise",
        role: "conclusion",
        createdOn: now,
        creatorId,
    })

    const premiseBoundVariable: TPropositionalVariable = {
        id: v4(),
        argumentId,
        argumentVersion,
        boundPremiseId: premiseId,
        boundArgumentId: argumentId,
        boundArgumentVersion: argumentVersion,
        symbol: "Q",
        checksum: "test",
        descendantChecksum: null,
        combinedChecksum: "test",
        createdOn: now,
        creatorId,
    }
    engine.bindVariableToPremise(premiseBoundVariable)

    const claimBoundExpressionId = v4()
    mutateCreateExpression(engine, {
        premiseId,
        expressionId: claimBoundExpressionId,
        parentId: null,
        type: "variable",
        variableId: claimBoundVariable.id,
        argumentId,
        argumentVersion,
        creatorId,
        createdOn: now,
    })

    // Wrapping turns the supporting premise into an `and` over two claim-bound
    // variables, so the scene also carries an operator expression — the shape
    // core's P-6 rule refuses a mark on. Built by wrapping rather than by
    // creating the operator first, because core collapses a childless operator.
    const operatorExpressionId = v4()
    mutateWrapExpression(engine, {
        premiseId,
        targetExpressionId: claimBoundExpressionId,
        direction: "after",
        operatorId: operatorExpressionId,
        operatorType: "and",
        siblingId: v4(),
        siblingType: "variable",
        variableId: secondClaimBoundVariable.id,
        argumentId,
        argumentVersion,
        creatorId,
        createdOn: now,
    })

    const premiseBoundExpressionId = v4()
    mutateCreateExpression(engine, {
        premiseId: otherPremiseId,
        expressionId: premiseBoundExpressionId,
        parentId: null,
        type: "variable",
        variableId: premiseBoundVariable.id,
        argumentId,
        argumentVersion,
        creatorId,
        createdOn: now,
    })

    return {
        engine,
        argumentId,
        argumentVersion,
        creatorId,
        claimId,
        claimBoundVariableId: claimBoundVariable.id,
        premiseId,
        claimBoundExpressionId,
        operatorExpressionId,
        premiseBoundExpressionId,
    }
}

/**
 * Adds the engine-synthesized derivation premise a persisted claim carries in
 * addition to its authored expression — the shape that made the suggestion
 * derivation double-count. Adopt mode, so the derivation's consequent
 * expression binds the same claim-bound variable the authored expression does.
 */
export function addDerivationPremise(scene: TOriginTestScene): {
    premiseId: string
    consequentExpressionId: string
} {
    const derivationPremiseId = v4()
    const consequentExpressionId = v4()
    mutateCreateDerivationPremise(scene.engine, derivationPremiseId, {
        argumentId: scene.argumentId,
        argumentVersion: scene.argumentVersion,
        creatorId: scene.creatorId,
        createdOn: new Date("2026-01-01T00:00:00Z"),
        derivedClaimId: scene.claimId,
        existingConsequentVariableId: scene.claimBoundVariableId,
        consequentExpressionId,
    })
    return { premiseId: derivationPremiseId, consequentExpressionId }
}

export function makeDocument(scene: TOriginTestScene): TOriginDocument {
    return {
        id: v4(),
        text: ORIGIN_TEXT,
        digest: sha256Hex(ORIGIN_TEXT),
        checksum: "doc-checksum",
        creatorId: scene.creatorId,
        createdOn: new Date("2026-01-01T00:00:00Z"),
    }
}

export function makeLink(
    scene: TOriginTestScene,
    documentId: string,
    stance: TOriginStance
): TOriginLink {
    return {
        id: v4(),
        argumentId: scene.argumentId,
        argumentVersion: scene.argumentVersion,
        documentId,
        stance,
        checksum: "link-checksum",
        createdOn: new Date("2026-01-01T00:00:00Z"),
    }
}

export function makeAnchor(
    scene: TOriginTestScene,
    documentId: string,
    targetType: TOriginAnchor["targetType"],
    targetId: string
): TOriginAnchor {
    const startCodePoint = ORIGIN_TEXT.indexOf(ANCHOR_QUOTE)
    return {
        id: v4(),
        argumentId: scene.argumentId,
        argumentVersion: scene.argumentVersion,
        documentId,
        targetType,
        targetId,
        exact: ANCHOR_QUOTE,
        startCodePoint,
        endCodePoint: startCodePoint + ANCHOR_QUOTE.length,
        checksum: "anchor-checksum",
        createdOn: new Date("2026-01-01T00:00:00Z"),
    }
}
