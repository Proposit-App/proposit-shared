// Shared golden fixtures for the derived-view layer (engine/derive, engine/render,
// engine/algebra, engine/overlay). Exported so server + mobile can import the same
// inputs and prove their swap onto this layer reproduces the canonical output
// byte-for-byte. Fixtures are hand-built wire-shaped snapshots — no engine run —
// so the inputs are stable and reviewable.

import type { TProjectOriginData, TProjectReactiveSnapshot } from "../engine.js"
import type { TClaim } from "../../schemas/model/claims.js"
import type { TClaimCitation } from "../../schemas/model/citations.js"
import type { TPropositionalExpressionCombined } from "../../schemas/logic.js"
import type { TClaimReasonCode } from "../../schemas/review.js"

type TExpr = TPropositionalExpressionCombined
type TVar = TProjectReactiveSnapshot["variables"][string]
type TPremiseSnap = TProjectReactiveSnapshot["premises"][string]

const EXPR_BASE = {
    checksum: "c",
    descendantChecksum: null,
    combinedChecksum: "c",
    createdOn: new Date("2026-01-01T00:00:00Z"),
    creatorId: "u",
    argumentId: "a",
    argumentVersion: 1,
}

const CLAIM_BASE = {
    originArgumentId: "a",
    version: 1,
    published: false,
    publishedOn: null,
    claimForkId: null,
    creatorId: "u",
    createdOn: new Date("2026-01-01T00:00:00Z"),
    parentId: null,
    digest: "d",
}

export function normalClaim(id: string, title: string, body: string): TClaim {
    return {
        ...CLAIM_BASE,
        id,
        type: "normal",
        kind: "claim",
        title,
        body,
        titleContentHash: "h",
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: null,
    } as unknown as TClaim
}

export function axiomaticClaim(id: string): TClaim {
    return {
        ...CLAIM_BASE,
        id,
        type: "axiomatic",
        kind: null,
        title: null,
        body: null,
        titleContentHash: null,
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: "definition",
    } as unknown as TClaim
}

export function citationClaim(id: string, text: string): TClaim {
    return {
        ...CLAIM_BASE,
        id,
        type: "citation",
        kind: null,
        title: null,
        body: null,
        titleContentHash: null,
        url: "https://example.com/src",
        citation: { type: "unparsed", text },
        citationContentHash: "ch",
        axiom: null,
    } as unknown as TClaim
}

export function citationEdge(
    claimId: string,
    supportingClaimId: string
): TClaimCitation {
    return {
        id: `edge-${claimId}`,
        claimId,
        claimVersion: 1,
        supportingClaimId,
        supportingClaimVersion: 1,
        checksum: "c",
        argumentId: "a",
        createdOn: new Date("2026-01-01T00:00:00Z"),
    } as unknown as TClaimCitation
}

export function claimVar(id: string, symbol: string, claimId: string): TVar {
    return {
        id,
        symbol,
        claimId,
        claimVersion: 1,
        premiseId: null,
        argumentId: "a",
        argumentVersion: 1,
        checksum: "c",
        descendantChecksum: null,
        combinedChecksum: "c",
        createdOn: new Date("2026-01-01T00:00:00Z"),
        creatorId: "u",
    } as unknown as TVar
}

type TExprSpec =
    | { v: string }
    | { op: "not" | "and" | "or" | "implies" | "iff"; children: TExprSpec[] }
    | { formula: TExprSpec }

function buildExprTree(
    premiseId: string,
    spec: TExprSpec,
    exprs: Record<string, TExpr>,
    parentId: string | null,
    position: number
): string {
    const id = `${premiseId}#e${Object.keys(exprs).length}`
    if ("v" in spec) {
        exprs[id] = {
            ...EXPR_BASE,
            id,
            type: "variable",
            variableId: spec.v,
            operator: null,
            premiseId,
            parentId,
            position,
        } as unknown as TExpr
        return id
    }
    if ("formula" in spec) {
        exprs[id] = {
            ...EXPR_BASE,
            id,
            type: "formula",
            variableId: null,
            operator: null,
            premiseId,
            parentId,
            position,
        } as unknown as TExpr
        buildExprTree(premiseId, spec.formula, exprs, id, 0)
        return id
    }
    exprs[id] = {
        ...EXPR_BASE,
        id,
        type: "operator",
        variableId: null,
        operator: spec.op,
        premiseId,
        parentId,
        position,
    } as unknown as TExpr
    spec.children.forEach((child, i) =>
        buildExprTree(premiseId, child, exprs, id, i)
    )
    return id
}

export function makeFreeformPremise(
    id: string,
    title: string | null,
    rootSpec: TExprSpec | undefined
): TPremiseSnap {
    const exprs: Record<string, TExpr> = {}
    const rootExpressionId = rootSpec
        ? buildExprTree(id, rootSpec, exprs, null, 0)
        : undefined
    return {
        premise: { id, type: "freeform", title } as TPremiseSnap["premise"],
        rootExpressionId,
        expressions: exprs,
    }
}

export function makeDerivationPremise(
    id: string,
    derivedClaimId: string,
    rootSpec: TExprSpec
): TPremiseSnap {
    const exprs: Record<string, TExpr> = {}
    const rootExpressionId = buildExprTree(id, rootSpec, exprs, null, 0)
    return {
        premise: {
            id,
            type: "derivation",
            derivedClaimId,
        } as TPremiseSnap["premise"],
        rootExpressionId,
        expressions: exprs,
    }
}

/**
 * The canonical derived-view golden snapshot: a conclusion `P → Q`, a supporting
 * lone-claim premise `P`, a counterargument premise `¬R`, and a derivation
 * premise deriving Q from a citation source. Exercises counterargument
 * partition, formula/legend, markdown/text serialization, proof-state, and the
 * ATV/overlay item model.
 */
export function goldenSnapshot(): TProjectReactiveSnapshot {
    const variables: Record<string, TVar> = {
        vP: claimVar("vP", "P", "cP"),
        vQ: claimVar("vQ", "Q", "cQ"),
        vR: claimVar("vR", "R", "cR"),
        vSrc: claimVar("vSrc", "S", "src1"),
    }
    const premises: Record<string, TPremiseSnap> = {
        concl: makeFreeformPremise("concl", null, {
            op: "implies",
            children: [{ v: "vP" }, { v: "vQ" }],
        }),
        supp: makeFreeformPremise("supp", "Ground", { v: "vP" }),
        counter: makeFreeformPremise("counter", "Objection", {
            op: "not",
            children: [{ v: "vR" }],
        }),
        deriv: makeDerivationPremise("deriv", "cQ", {
            op: "implies",
            children: [{ v: "vSrc" }, { v: "vQ" }],
        }),
    }
    return {
        argument: {
            id: "a",
            version: 3,
            title: "The golden argument",
            description: "A worked example.",
            published: true,
            publishedOn: new Date("2026-01-15T00:00:00Z"),
        } as TProjectReactiveSnapshot["argument"],
        variables,
        premises,
        roles: { conclusionPremiseId: "concl" },
        claims: {
            cP: normalClaim("cP", "P is true", "because reasons"),
            cQ: normalClaim("cQ", "Q follows", ""),
            cR: normalClaim("cR", "R the rebutted", "a countered claim"),
            src1: citationClaim("src1", "Smith 2020"),
        },
        citations: { cQ: [citationEdge("cQ", "src1")] },
        validationIssues: [
            {
                code: "EXPR_CHILD_COUNT_INVALID",
                premiseId: "concl",
                expressionId: "concl#e0",
            },
            {
                code: "CHECKSUM_STALE",
                premiseId: "supp",
                expressionId: undefined,
            },
        ],
    } as unknown as TProjectReactiveSnapshot
}

const ORIGIN_DOCUMENT_TEXT =
    "All men are mortal.\nSocrates is a man.\nTherefore Socrates is mortal."

function originAnchor(
    targetType: "expression" | "premise" | "argument",
    targetId: string,
    exact: string
): TProjectOriginData["anchors"][string][number] {
    return {
        id: `anchor-${targetId}`,
        argumentId: "a",
        argumentVersion: 3,
        documentId: "doc1",
        targetType,
        targetId,
        exact,
        startCodePoint: ORIGIN_DOCUMENT_TEXT.indexOf(exact),
        endCodePoint: ORIGIN_DOCUMENT_TEXT.indexOf(exact) + exact.length,
        checksum: "c",
        createdOn: new Date("2026-01-01T00:00:00Z"),
    } as unknown as TProjectOriginData["anchors"][string][number]
}

function originDocument(
    reference?: unknown
): TProjectOriginData["document"] | undefined {
    return {
        id: "doc1",
        text: ORIGIN_DOCUMENT_TEXT,
        digest: "d",
        checksum: "c",
        creatorId: "u",
        createdOn: new Date("2026-01-01T00:00:00Z"),
        reference,
    } as unknown as TProjectOriginData["document"]
}

function originLink(): TProjectOriginData["link"] {
    return {
        id: "link1",
        argumentId: "a",
        argumentVersion: 3,
        documentId: "doc1",
        stance: "representation",
        checksum: "c",
        createdOn: new Date("2026-01-01T00:00:00Z"),
    } as unknown as TProjectOriginData["link"]
}

/**
 * The golden snapshot plus origin data: a source document with a structured
 * reference, and one anchor of each target type — the argument as a whole, the
 * `supp` premise, and the `concl#e2` claim expression (the conclusion's `Q`).
 * The expression anchor's passage spans a newline on purpose, so the export's
 * whitespace collapsing is covered by the golden output itself. Every anchor's
 * `exact` occurs verbatim in `ORIGIN_DOCUMENT_TEXT`, so its offsets slice back
 * out to itself the way core's `OriginLibrary` requires — pinned by a test, not
 * left to whoever edits a quote next.
 */
export function originGoldenSnapshot(): TProjectReactiveSnapshot {
    const snapshot = goldenSnapshot()
    snapshot.origin = {
        document: originDocument({ type: "Book", title: "The Republic" }),
        link: originLink(),
        anchors: {
            a: [originAnchor("argument", "a", "All men are mortal.")],
            supp: [originAnchor("premise", "supp", "Socrates is a man.")],
            "concl#e2": [
                originAnchor(
                    "expression",
                    "concl#e2",
                    "Socrates is a man.\nTherefore Socrates is mortal."
                ),
            ],
        },
    }
    return snapshot
}

/** The golden snapshot with an origin slice present but empty. */
export function emptyOriginGoldenSnapshot(): TProjectReactiveSnapshot {
    const snapshot = goldenSnapshot()
    snapshot.origin = { document: undefined, link: undefined, anchors: {} }
    return snapshot
}

/** The golden snapshot with a referenced source but no argument-level anchor. */
export function unanchoredOriginGoldenSnapshot(): TProjectReactiveSnapshot {
    const snapshot = goldenSnapshot()
    snapshot.origin = {
        document: originDocument({ type: "Book", title: "The Republic" }),
        link: originLink(),
        anchors: {
            supp: [originAnchor("premise", "supp", "Socrates is a man.")],
        },
    }
    return snapshot
}

// Golden fixtures for the optimistic claim-reaction reducer
// (engine/optimistic claim-stance-state). Exported so server + mobile can
// replay the same scripted sequence against their local copy and prove
// byte-identical output before deleting it. Structurally typed here so the
// fixtures don't couple to the reducer's own type declarations.

type TGoldenStanceState = {
    counts: { affirm: number; disagree: number; neutral: number }
    own: { value: boolean | null; reasonCode: TClaimReasonCode } | null
}

export type TStanceGoldenOp =
    | { op: "apply"; value: boolean | null; reasonCode: TClaimReasonCode }
    | { op: "clear" }

// Empty starting state: no reaction, all buckets zero.
export const stanceGoldenStart: TGoldenStanceState = {
    counts: { affirm: 0, disagree: 0, neutral: 0 },
    own: null,
}

// Scripted operation sequence exercising every reducer branch in order:
// none→affirm, same-bucket reason change (counts unchanged), cross-bucket
// affirm→disagree (count moves), disagree→neutral, clear (decrement), and a
// redundant clear (no-op when own is already null).
export const stanceGoldenScript: TStanceGoldenOp[] = [
    { op: "apply", value: true, reasonCode: "common-knowledge" },
    { op: "apply", value: true, reasonCode: "expert-consensus" },
    { op: "apply", value: false, reasonCode: "factually-incorrect" },
    { op: "apply", value: null, reasonCode: "unknowable" },
    { op: "clear" },
    { op: "clear" },
]

// Floor case: caller holds a reaction while the bucket count is already 0, so
// a clear must floor the decrement at 0 rather than going negative.
export const stanceGoldenFloorStart: TGoldenStanceState = {
    counts: { affirm: 0, disagree: 0, neutral: 0 },
    own: { value: true, reasonCode: "common-knowledge" },
}
