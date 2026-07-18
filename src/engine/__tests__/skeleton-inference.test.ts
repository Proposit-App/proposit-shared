import { describe, test, expect } from "vitest"
import {
    computeWrap,
    defaultSkeletonOperator,
    rootNegationUnitId,
    planSkeletonCommit,
} from "../skeleton-inference.js"
import type { TSkeletonCommitTarget } from "../skeleton-inference.js"
import type { TProjectReactiveSnapshot } from "../engine.js"
import type { TPropositionalExpressionCombined } from "../../schemas/logic.js"

type TExpr = TPropositionalExpressionCombined
type TPremiseSnap = TProjectReactiveSnapshot["premises"][string]

const EXPR_BASE = {
    checksum: "c",
    descendantChecksum: null,
    combinedChecksum: "c",
    createdOn: new Date(),
    creatorId: "u",
    argumentId: "a",
    argumentVersion: 1,
}

function makeExpr(p: {
    id: string
    type: "variable" | "operator" | "formula"
    operator?: "not" | "and" | "or" | "implies" | "iff" | null
    variableId?: string | null
    parentId: string | null
    position?: number
}): TExpr {
    return {
        ...EXPR_BASE,
        position: p.position ?? 0,
        operator: p.operator ?? null,
        variableId: p.variableId ?? null,
        premiseId: "P",
        ...p,
    } as unknown as TExpr
}

function makeExprs(list: TExpr[]): Record<string, TExpr> {
    const out: Record<string, TExpr> = {}
    for (const e of list) out[e.id] = e
    return out
}

function makePremise(
    id: string,
    expressions: Record<string, TExpr>,
    rootExpressionId: string | undefined
): TPremiseSnap {
    return {
        premise: { id, type: "freeform" } as TPremiseSnap["premise"],
        rootExpressionId,
        expressions,
    }
}

function makeSnapshot(
    premises: Record<string, TPremiseSnap>
): TProjectReactiveSnapshot {
    return {
        argument: {
            id: "a",
            version: 1,
        } as TProjectReactiveSnapshot["argument"],
        variables: {},
        premises,
        roles: { conclusionPremiseId: undefined },
        claims: {},
        citations: {},
        validationIssues: [],
    } as unknown as TProjectReactiveSnapshot
}

// ── defaultSkeletonOperator ─────────────────────────────────────────────

describe("defaultSkeletonOperator", () => {
    test("root defaults to implies, non-root to and", () => {
        expect(defaultSkeletonOperator(true)).toBe("implies")
        expect(defaultSkeletonOperator(false)).toBe("and")
    })
})

// ── computeWrap ─────────────────────────────────────────────────────────

describe("computeWrap", () => {
    test("returns null when the premise is missing", () => {
        const snap = makeSnapshot({})
        expect(computeWrap("e1", "P", snap)).toBeNull()
    })

    test("returns null when the expression is missing", () => {
        const exprs = makeExprs([
            makeExpr({ id: "e1", type: "variable", parentId: null }),
        ])
        const snap = makeSnapshot({ P: makePremise("P", exprs, "e1") })
        expect(computeWrap("nope", "P", snap)).toBeNull()
    })

    test("lone claim at root → implies, cyclable", () => {
        const exprs = makeExprs([
            makeExpr({ id: "e1", type: "variable", parentId: null }),
        ])
        const snap = makeSnapshot({ P: makePremise("P", exprs, "e1") })
        expect(computeWrap("e1", "P", snap)).toEqual({
            premiseId: "P",
            root: true,
            operator: "implies",
            cyclable: true,
        })
    })

    test("direct parent 'and' → pinned, non-cyclable", () => {
        const exprs = makeExprs([
            makeExpr({
                id: "and1",
                type: "operator",
                operator: "and",
                parentId: null,
            }),
            makeExpr({ id: "e1", type: "variable", parentId: "and1" }),
        ])
        const snap = makeSnapshot({ P: makePremise("P", exprs, "and1") })
        expect(computeWrap("e1", "P", snap)).toEqual({
            premiseId: "P",
            root: false,
            operator: "and",
            cyclable: false,
        })
    })

    test("direct parent 'or' → pinned to or, non-cyclable", () => {
        const exprs = makeExprs([
            makeExpr({
                id: "or1",
                type: "operator",
                operator: "or",
                parentId: null,
            }),
            makeExpr({ id: "e1", type: "variable", parentId: "or1" }),
        ])
        const snap = makeSnapshot({ P: makePremise("P", exprs, "or1") })
        expect(computeWrap("e1", "P", snap)).toEqual({
            premiseId: "P",
            root: false,
            operator: "or",
            cyclable: false,
        })
    })

    test("nested under implies (parent not and/or) → and, cyclable, non-root", () => {
        const exprs = makeExprs([
            makeExpr({
                id: "imp1",
                type: "operator",
                operator: "implies",
                parentId: null,
            }),
            makeExpr({
                id: "e1",
                type: "variable",
                parentId: "imp1",
                position: 0,
            }),
            makeExpr({
                id: "e2",
                type: "variable",
                parentId: "imp1",
                position: 1,
            }),
        ])
        const snap = makeSnapshot({ P: makePremise("P", exprs, "imp1") })
        expect(computeWrap("e1", "P", snap)).toEqual({
            premiseId: "P",
            root: false,
            operator: "and",
            cyclable: true,
        })
    })

    test("lone negated claim at root stays root → implies default", () => {
        const exprs = makeExprs([
            makeExpr({
                id: "not1",
                type: "operator",
                operator: "not",
                parentId: null,
            }),
            makeExpr({ id: "e1", type: "variable", parentId: "not1" }),
        ])
        const snap = makeSnapshot({ P: makePremise("P", exprs, "not1") })
        expect(computeWrap("e1", "P", snap)).toEqual({
            premiseId: "P",
            root: true,
            operator: "implies",
            cyclable: true,
        })
    })
})

// ── rootNegationUnitId ──────────────────────────────────────────────────

describe("rootNegationUnitId", () => {
    test("not(A), expr A → outermost NOT id", () => {
        const exprs = makeExprs([
            makeExpr({
                id: "not1",
                type: "operator",
                operator: "not",
                parentId: null,
            }),
            makeExpr({ id: "eA", type: "variable", parentId: "not1" }),
        ])
        expect(rootNegationUnitId(exprs, "eA")).toBe("not1")
    })

    test("not(not(A)) → outermost NOT id", () => {
        const exprs = makeExprs([
            makeExpr({
                id: "not1",
                type: "operator",
                operator: "not",
                parentId: null,
            }),
            makeExpr({
                id: "not2",
                type: "operator",
                operator: "not",
                parentId: "not1",
            }),
            makeExpr({ id: "eA", type: "variable", parentId: "not2" }),
        ])
        expect(rootNegationUnitId(exprs, "eA")).toBe("not1")
    })

    test("positive lone claim → null", () => {
        const exprs = makeExprs([
            makeExpr({ id: "eA", type: "variable", parentId: null }),
        ])
        expect(rootNegationUnitId(exprs, "eA")).toBeNull()
    })

    test("negation nested inside and → null", () => {
        const exprs = makeExprs([
            makeExpr({
                id: "and1",
                type: "operator",
                operator: "and",
                parentId: null,
            }),
            makeExpr({
                id: "not1",
                type: "operator",
                operator: "not",
                parentId: "and1",
            }),
            makeExpr({ id: "eA", type: "variable", parentId: "not1" }),
        ])
        expect(rootNegationUnitId(exprs, "eA")).toBeNull()
    })

    test("missing expression → null", () => {
        expect(rootNegationUnitId({}, "eA")).toBeNull()
    })
})

// ── planSkeletonCommit ──────────────────────────────────────────────────

describe("planSkeletonCommit", () => {
    test("empty-leg target → lone route", () => {
        const snap = makeSnapshot({})
        const target: TSkeletonCommitTarget = {
            kind: "empty-leg",
            premiseId: "P",
            leg: "first",
        }
        expect(
            planSkeletonCommit({ target, operator: "implies", snapshot: snap })
        ).toEqual({
            route: "lone",
            premiseId: "P",
        })
    })

    test("lone-negation wrap → wrap-nest on the NOT unit, direction before", () => {
        const exprs = makeExprs([
            makeExpr({
                id: "not1",
                type: "operator",
                operator: "not",
                parentId: null,
            }),
            makeExpr({ id: "eA", type: "variable", parentId: "not1" }),
        ])
        const snap = makeSnapshot({ P: makePremise("P", exprs, "not1") })
        const target: TSkeletonCommitTarget = {
            kind: "wrap",
            premiseId: "P",
            wrappedExpressionId: "eA",
            root: true,
        }
        expect(
            planSkeletonCommit({ target, operator: "implies", snapshot: snap })
        ).toEqual({
            route: "wrap-nest",
            premiseId: "P",
            targetExpressionId: "not1",
            operator: "implies",
            direction: "before",
        })
    })

    test("wrap target whose direct parent is and/or → wrap-associative", () => {
        const exprs = makeExprs([
            makeExpr({
                id: "and1",
                type: "operator",
                operator: "and",
                parentId: null,
            }),
            makeExpr({
                id: "eA",
                type: "variable",
                parentId: "and1",
                position: 0,
            }),
            makeExpr({
                id: "eB",
                type: "variable",
                parentId: "and1",
                position: 1,
            }),
        ])
        const snap = makeSnapshot({ P: makePremise("P", exprs, "and1") })
        const target: TSkeletonCommitTarget = {
            kind: "wrap",
            premiseId: "P",
            wrappedExpressionId: "eA",
            root: false,
        }
        expect(
            planSkeletonCommit({ target, operator: "and", snapshot: snap })
        ).toEqual({
            route: "wrap-associative",
            premiseId: "P",
            parentId: "and1",
            afterExpressionId: "eA",
        })
    })

    test("lone positive claim wrap (no direction) → wrap-nest, antecedent order", () => {
        const exprs = makeExprs([
            makeExpr({ id: "eA", type: "variable", parentId: null }),
        ])
        const snap = makeSnapshot({ P: makePremise("P", exprs, "eA") })
        const target: TSkeletonCommitTarget = {
            kind: "wrap",
            premiseId: "P",
            wrappedExpressionId: "eA",
            root: true,
        }
        const plan = planSkeletonCommit({
            target,
            operator: "implies",
            snapshot: snap,
        })
        expect(plan).toEqual({
            route: "wrap-nest",
            premiseId: "P",
            targetExpressionId: "eA",
            operator: "implies",
        })
        expect(plan).not.toHaveProperty("direction")
    })

    test("wrap with existingIsConsequent → wrap-nest, direction before (consequent order)", () => {
        const exprs = makeExprs([
            makeExpr({ id: "eA", type: "variable", parentId: null }),
        ])
        const snap = makeSnapshot({ P: makePremise("P", exprs, "eA") })
        const target: TSkeletonCommitTarget = {
            kind: "wrap",
            premiseId: "P",
            wrappedExpressionId: "eA",
            root: true,
            existingIsConsequent: true,
        }
        expect(
            planSkeletonCommit({ target, operator: "implies", snapshot: snap })
        ).toEqual({
            route: "wrap-nest",
            premiseId: "P",
            targetExpressionId: "eA",
            operator: "implies",
            direction: "before",
        })
    })
})
