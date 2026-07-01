import { describe, test, expect } from "vitest"
import { orderPremisesForReading } from "../premise-reading-order.js"
import type { TProjectReactiveSnapshot } from "../engine.js"
import type { TPropositionalExpressionCombined } from "../../schemas/logic.js"

type TExpr = TPropositionalExpressionCombined
type TVar = TProjectReactiveSnapshot["variables"][string]
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

/**
 * A premise spec for the fixture builder. Exactly one of `bare` / `consequent`
 * describes the conclusion side; `antecedents` (claim ids) and
 * `boundAntecedents` (target premise ids) describe the support side.
 */
type TPremiseSpec = {
    id: string
    bare?: string // bare assertion of this claim id
    antecedents?: string[] // claim ids on the antecedent side
    boundAntecedents?: string[] // premise ids referenced by a premise-bound antecedent
    consequent?: string // claim id on the consequent side
    negatedConsequent?: boolean // rebuttal: consequent wrapped in `not`
}

function claimVar(id: string, claimId: string): TVar {
    return {
        id,
        symbol: claimId,
        claimId,
        claimVersion: 1,
        premiseId: null,
        argumentId: "a",
        argumentVersion: 1,
        checksum: "c",
        descendantChecksum: null,
        combinedChecksum: "c",
        createdOn: new Date(),
        creatorId: "u",
    } as unknown as TVar
}

function boundVar(id: string, boundPremiseId: string): TVar {
    return {
        id,
        symbol: id,
        boundPremiseId,
        boundArgumentId: "a",
        boundArgumentVersion: 1,
        premiseId: null,
        argumentId: "a",
        argumentVersion: 1,
        checksum: "c",
        descendantChecksum: null,
        combinedChecksum: "c",
        createdOn: new Date(),
        creatorId: "u",
    } as unknown as TVar
}

function makeSnapshot(
    specs: TPremiseSpec[],
    conclusionPremiseId?: string
): TProjectReactiveSnapshot {
    const variables: Record<string, TVar> = {}
    const premises: Record<string, TPremiseSnap> = {}

    for (const spec of specs) {
        const exprs: Record<string, TExpr> = {}
        let seq = 0
        const eid = (tag: string) => `${spec.id}#${tag}${seq++}`

        const addVar = (v: TVar) => {
            variables[v.id] = v
            return v.id
        }
        const varExpr = (
            variableId: string,
            parentId: string | null,
            position: number
        ): string => {
            const id = eid("v")
            exprs[id] = {
                ...EXPR_BASE,
                id,
                type: "variable",
                variableId,
                operator: null,
                premiseId: spec.id,
                parentId,
                position,
            } as unknown as TExpr
            return id
        }
        const opExpr = (
            operator: string,
            parentId: string | null,
            position: number
        ): string => {
            const id = eid("op")
            exprs[id] = {
                ...EXPR_BASE,
                id,
                type: "operator",
                variableId: null,
                operator,
                premiseId: spec.id,
                parentId,
                position,
            } as unknown as TExpr
            return id
        }

        let rootExpressionId: string

        if (spec.bare !== undefined) {
            const vId = addVar(claimVar(`${spec.id}_v_${spec.bare}`, spec.bare))
            rootExpressionId = varExpr(vId, null, 0)
        } else {
            const impId = opExpr("implies", null, 0)
            rootExpressionId = impId

            // Antecedent side (position 0 under implies).
            const antClaimVars = (spec.antecedents ?? []).map((c) =>
                addVar(claimVar(`${spec.id}_v_${c}`, c))
            )
            const antBoundVars = (spec.boundAntecedents ?? []).map((target) =>
                addVar(boundVar(`${spec.id}_b_${target}`, target))
            )
            const antVarIds = [...antClaimVars, ...antBoundVars]
            if (antVarIds.length === 1) {
                varExpr(antVarIds[0], impId, 0)
            } else {
                const andId = opExpr("and", impId, 0)
                antVarIds.forEach((vId, i) => varExpr(vId, andId, i))
            }

            // Consequent side (position 1 under implies = highest position).
            const conId = addVar(
                claimVar(`${spec.id}_v_${spec.consequent}`, spec.consequent!)
            )
            if (spec.negatedConsequent) {
                const notId = opExpr("not", impId, 1)
                varExpr(conId, notId, 0)
            } else {
                varExpr(conId, impId, 1)
            }
        }

        premises[spec.id] = {
            premise: {
                id: spec.id,
                title: null,
                type: "freeform",
            } as TPremiseSnap["premise"],
            rootExpressionId,
            expressions: exprs,
        }
    }

    return {
        argument: {
            id: "a",
            version: 1,
        } as TProjectReactiveSnapshot["argument"],
        variables,
        premises,
        roles: { conclusionPremiseId },
        claims: {},
        citations: {},
        validationIssues: [],
    } as unknown as TProjectReactiveSnapshot
}

describe("orderPremisesForReading", () => {
    test("orders the conclusion-rooted proof tree in DFS pre-order", () => {
        // P1: A (conclusion), P2: (B∧C∧D)⇒A, P3: (E∧F)⇒B, P4: (G∧H)⇒C.
        // Fed in scrambled input order to prove independence from insertion order.
        const snapshot = makeSnapshot(
            [
                { id: "p4", antecedents: ["G", "H"], consequent: "C" },
                { id: "p2", antecedents: ["B", "C", "D"], consequent: "A" },
                { id: "p1", bare: "A" },
                { id: "p3", antecedents: ["E", "F"], consequent: "B" },
            ],
            "p1"
        )

        expect(orderPremisesForReading(snapshot)).toEqual([
            "p1",
            "p2",
            "p3",
            "p4",
        ])
    })

    test("places a reused antecedent's proof once, at first encounter", () => {
        // p2: (B∧C)⇒A; p3: D⇒B (proves B); p4: B⇒C (proves C, reuses B).
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", antecedents: ["B", "C"], consequent: "A" },
                { id: "p3", antecedents: ["D"], consequent: "B" },
                { id: "p4", antecedents: ["B"], consequent: "C" },
            ],
            "p1"
        )

        const order = orderPremisesForReading(snapshot)
        // Every premise emitted exactly once.
        expect(order).toHaveLength(4)
        expect(new Set(order).size).toBe(4)
        // B's proof (p3) sits under p2's B branch, before p4 re-references B.
        expect(order.indexOf("p3")).toBeLessThan(order.indexOf("p4"))
        expect(order.filter((id) => id === "p3")).toHaveLength(1)
    })

    test("terminates on a cycle, emitting each premise once", () => {
        // p2: A⇒B, p3: B⇒A — a cycle through the conclusion claim A.
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", antecedents: ["A"], consequent: "B" },
                { id: "p3", antecedents: ["B"], consequent: "A" },
            ],
            "p1"
        )

        const order = orderPremisesForReading(snapshot)
        expect(order).toHaveLength(3)
        expect(new Set(order)).toEqual(new Set(["p1", "p2", "p3"]))
    })

    test("weaves a same-polarity prover but appends an opposite-polarity rebuttal", () => {
        // p2: B⇒A. p4: F⇒B (proves +B → woven). p3: E⇒¬B (rebuttal → off-chain).
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", antecedents: ["B"], consequent: "A" },
                {
                    id: "p3",
                    antecedents: ["E"],
                    consequent: "B",
                    negatedConsequent: true,
                },
                { id: "p4", antecedents: ["F"], consequent: "B" },
            ],
            "p1"
        )

        const order = orderPremisesForReading(snapshot)
        // +B prover woven right under p2; ¬B rebuttal pushed to the tail.
        expect(order).toEqual(["p1", "p2", "p4", "p3"])
    })

    test("follows premise-bound antecedents as direct premise edges", () => {
        // p2's antecedent is premise-bound to z_target; a_orphan is disconnected.
        // If bound edges are followed, z_target is woven (before the appended
        // orphan); if not, baseOrder would append a_orphan before z_target.
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", boundAntecedents: ["z_target"], consequent: "A" },
                { id: "z_target", bare: "X" },
                { id: "a_orphan", bare: "Z" },
            ],
            "p1"
        )

        const order = orderPremisesForReading(snapshot)
        expect(order.indexOf("z_target")).toBeLessThan(
            order.indexOf("a_orphan")
        )
        expect(order.indexOf("z_target")).toBe(order.indexOf("p2") + 1)
    })

    test("appends off-chain premises after the chain in lexicographic base order", () => {
        // p1⇐p2 is the chain; the rest are disconnected and append sorted.
        const snapshot = makeSnapshot(
            [
                { id: "z_off", bare: "Z" },
                { id: "p1", bare: "A" },
                { id: "m_off", bare: "M" },
                { id: "p2", antecedents: ["B"], consequent: "A" },
            ],
            "p1"
        )

        const order = orderPremisesForReading(snapshot)
        expect(order).toEqual(["p1", "p2", "m_off", "z_off"])
    })

    test("returns lexicographic base order when no conclusion is set", () => {
        const snapshot = makeSnapshot([
            { id: "p_c", bare: "C" },
            { id: "p_a", bare: "A" },
            { id: "p_b", bare: "B" },
        ])

        expect(orderPremisesForReading(snapshot)).toEqual(["p_a", "p_b", "p_c"])
    })

    test("does not throw when conclusionPremiseId is dangling", () => {
        const snapshot = makeSnapshot(
            [
                { id: "p_a", bare: "A" },
                { id: "p_b", bare: "B" },
            ],
            "does-not-exist"
        )

        expect(orderPremisesForReading(snapshot)).toEqual(["p_a", "p_b"])
    })
})
