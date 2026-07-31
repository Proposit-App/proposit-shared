import { v4 } from "uuid"
import { sha256Hex } from "@proposit/proposit-core"
import { CHECKSUM_CONFIG } from "../../checksum.js"
import { PropositArgumentEngine } from "../engine.js"
import { createClaimLookup } from "../library-adapters.js"
import { mutateCreateExpression } from "../mutations/expressions.js"
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
    premiseId: string
    claimBoundExpressionId: string
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
    const engine = new PropositArgumentEngine(
        argument,
        createClaimLookup([{ id: claimId, version: 1 }]),
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
        premiseId,
        claimBoundExpressionId,
        premiseBoundExpressionId,
    }
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
