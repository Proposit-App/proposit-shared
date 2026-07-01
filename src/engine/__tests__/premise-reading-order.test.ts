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
 * A premise spec for the fixture builder. Shapes covered:
 * - `bare` (optionally `bareNegated`): a bare assertion of a claim (the shape a
 *   conclusion usually takes), e.g. `A` or `¬A`.
 * - `empty`: a premise with no root expression at all.
 * - otherwise an implication (`op`, default `implies`; `iff` also supported)
 *   whose consequent is `consequent` (optionally `negatedConsequent`) and whose
 *   antecedent side is the combination (`antecedentOp`, default `and`; `or`
 *   supported) of positive claim `antecedents`, `negatedAntecedents`, and
 *   `boundAntecedents` (premise-bound references to other premise ids).
 */
type TPremiseSpec = {
    id: string
    type?: "freeform" | "derivation"
    bare?: string
    bareNegated?: boolean
    empty?: boolean
    op?: "implies" | "iff"
    antecedents?: string[]
    negatedAntecedents?: string[]
    boundAntecedents?: string[]
    antecedentOp?: "and" | "or"
    consequent?: string
    negatedConsequent?: boolean
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

        // A leaf on the antecedent side: a positive claim var, a negated claim
        // var (wrapped in `not`), or a premise-bound var.
        type TLeaf =
            | { kind: "claim"; ref: string }
            | { kind: "negclaim"; ref: string }
            | { kind: "bound"; ref: string }
        const placeLeaf = (
            leaf: TLeaf,
            parentId: string | null,
            position: number
        ): void => {
            if (leaf.kind === "claim") {
                varExpr(
                    addVar(claimVar(`${spec.id}_v_${leaf.ref}`, leaf.ref)),
                    parentId,
                    position
                )
            } else if (leaf.kind === "negclaim") {
                const notId = opExpr("not", parentId, position)
                varExpr(
                    addVar(claimVar(`${spec.id}_nv_${leaf.ref}`, leaf.ref)),
                    notId,
                    0
                )
            } else {
                varExpr(
                    addVar(boundVar(`${spec.id}_b_${leaf.ref}`, leaf.ref)),
                    parentId,
                    position
                )
            }
        }

        let rootExpressionId: string | undefined

        if (spec.empty) {
            rootExpressionId = undefined
        } else if (spec.bare !== undefined) {
            const vId = addVar(claimVar(`${spec.id}_v_${spec.bare}`, spec.bare))
            if (spec.bareNegated) {
                const notId = opExpr("not", null, 0)
                rootExpressionId = notId
                varExpr(vId, notId, 0)
            } else {
                rootExpressionId = varExpr(vId, null, 0)
            }
        } else {
            const impId = opExpr(spec.op ?? "implies", null, 0)
            rootExpressionId = impId

            const leaves: TLeaf[] = [
                ...(spec.antecedents ?? []).map(
                    (ref) => ({ kind: "claim", ref }) as TLeaf
                ),
                ...(spec.negatedAntecedents ?? []).map(
                    (ref) => ({ kind: "negclaim", ref }) as TLeaf
                ),
                ...(spec.boundAntecedents ?? []).map(
                    (ref) => ({ kind: "bound", ref }) as TLeaf
                ),
            ]
            // Antecedent side at position 0.
            if (leaves.length === 1) {
                placeLeaf(leaves[0], impId, 0)
            } else if (leaves.length > 1) {
                const combineId = opExpr(spec.antecedentOp ?? "and", impId, 0)
                leaves.forEach((leaf, i) => placeLeaf(leaf, combineId, i))
            }
            // Consequent side at position 1 (highest position).
            const conVarId = addVar(
                claimVar(`${spec.id}_vc_${spec.consequent}`, spec.consequent!)
            )
            if (spec.negatedConsequent) {
                const notId = opExpr("not", impId, 1)
                varExpr(conVarId, notId, 0)
            } else {
                varExpr(conVarId, impId, 1)
            }
        }

        premises[spec.id] = {
            premise: {
                id: spec.id,
                title: null,
                type: spec.type ?? "freeform",
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

describe("orderPremisesForReading — well-formed proofs", () => {
    test("orders the conclusion-rooted proof tree in DFS pre-order", () => {
        // P1: A (conclusion), P2: (B∧C∧D)⇒A, P3: (E∧F)⇒B, P4: (G∧H)⇒C.
        // Fed scrambled to prove independence from insertion order.
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

    test("walks a deep linear chain in order", () => {
        // A ⇐ B ⇐ C ⇐ D ⇐ E
        const snapshot = makeSnapshot(
            [
                { id: "p5", antecedents: ["E"], consequent: "D" },
                { id: "p3", antecedents: ["C"], consequent: "B" },
                { id: "p1", bare: "A" },
                { id: "p4", antecedents: ["D"], consequent: "C" },
                { id: "p2", antecedents: ["B"], consequent: "A" },
            ],
            "p1"
        )
        expect(orderPremisesForReading(snapshot)).toEqual([
            "p1",
            "p2",
            "p3",
            "p4",
            "p5",
        ])
    })

    test("visits antecedents in their in-premise position order (wide fan-out)", () => {
        const snapshot = makeSnapshot(
            [
                {
                    id: "p2",
                    antecedents: ["B", "C", "D", "E", "F"],
                    consequent: "A",
                },
                { id: "p1", bare: "A" },
                { id: "pF", antecedents: ["K"], consequent: "F" },
                { id: "pB", antecedents: ["G"], consequent: "B" },
                { id: "pE", antecedents: ["J"], consequent: "E" },
                { id: "pC", antecedents: ["H"], consequent: "C" },
                { id: "pD", antecedents: ["I"], consequent: "D" },
            ],
            "p1"
        )
        expect(orderPremisesForReading(snapshot)).toEqual([
            "p1",
            "p2",
            "pB",
            "pC",
            "pD",
            "pE",
            "pF",
        ])
    })

    test("shares a sub-proof: places it once, at first encounter (diamond)", () => {
        // A ⇐ (B∧C); B ⇐ D; C ⇐ D; D ⇐ E. D's proof (p5) placed under B, reused under C.
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", antecedents: ["B", "C"], consequent: "A" },
                { id: "p3", antecedents: ["D"], consequent: "B" },
                { id: "p4", antecedents: ["D"], consequent: "C" },
                { id: "p5", antecedents: ["E"], consequent: "D" },
            ],
            "p1"
        )
        const order = orderPremisesForReading(snapshot)
        expect(order).toEqual(["p1", "p2", "p3", "p5", "p4"])
        expect(order.filter((id) => id === "p5")).toHaveLength(1)
    })

    test("expands the antecedents of a conclusion that is itself an implication", () => {
        // Conclusion is B⇒A (not a bare assertion); its frontier is its antecedent B.
        const snapshot = makeSnapshot(
            [
                { id: "p1", antecedents: ["B"], consequent: "A" },
                { id: "p2", antecedents: ["C"], consequent: "B" },
                { id: "p3", bare: "Z" },
            ],
            "p1"
        )
        expect(orderPremisesForReading(snapshot)).toEqual(["p1", "p2", "p3"])
    })

    test("emits every premise that proves a shared claim, in base order", () => {
        // Both p2 and p3 conclude A.
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p3", antecedents: ["C"], consequent: "A" },
                { id: "p2", antecedents: ["B"], consequent: "A" },
            ],
            "p1"
        )
        expect(orderPremisesForReading(snapshot)).toEqual(["p1", "p2", "p3"])
    })

    test("treats an iff root like an implication (consequent = highest position)", () => {
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", op: "iff", antecedents: ["B"], consequent: "A" },
            ],
            "p1"
        )
        expect(orderPremisesForReading(snapshot)).toEqual(["p1", "p2"])
    })

    test("expands both branches of a disjunctive antecedent", () => {
        // (B ∨ C) ⇒ A; both disjuncts are frontier claims.
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                {
                    id: "p2",
                    antecedents: ["B", "C"],
                    antecedentOp: "or",
                    consequent: "A",
                },
                { id: "p3", antecedents: ["D"], consequent: "B" },
                { id: "p4", antecedents: ["E"], consequent: "C" },
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
})

describe("orderPremisesForReading — polarity", () => {
    test("reuses a same-polarity prover but appends an opposite-polarity rebuttal", () => {
        // p2: B⇒A. p4: F⇒B (proves +B, woven). p3: E⇒¬B (rebuttal, off-chain).
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
        expect(orderPremisesForReading(snapshot)).toEqual([
            "p1",
            "p2",
            "p4",
            "p3",
        ])
    })

    test("matches a negated antecedent to a negated-consequent prover, not a positive one", () => {
        // p2 needs ¬B. p3 concludes ¬B (woven). p4 concludes +B (does NOT match → appended).
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", negatedAntecedents: ["B"], consequent: "A" },
                {
                    id: "p3",
                    antecedents: ["C"],
                    consequent: "B",
                    negatedConsequent: true,
                },
                { id: "p4", antecedents: ["D"], consequent: "B" },
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

    test("handles a negated bare conclusion (¬A) proved by a ¬A-concluding premise", () => {
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A", bareNegated: true },
                {
                    id: "p2",
                    antecedents: ["B"],
                    consequent: "A",
                    negatedConsequent: true,
                },
            ],
            "p1"
        )
        expect(orderPremisesForReading(snapshot)).toEqual(["p1", "p2"])
    })
})

describe("orderPremisesForReading — premise-bound edges", () => {
    test("follows a premise-bound antecedent as a direct premise edge", () => {
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
        expect(order.indexOf("z_target")).toBe(order.indexOf("p2") + 1)
        expect(order.indexOf("z_target")).toBeLessThan(
            order.indexOf("a_orphan")
        )
    })

    test("follows multiple premise-bound antecedents in order", () => {
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                {
                    id: "p2",
                    boundAntecedents: ["t1", "t2"],
                    consequent: "A",
                },
                { id: "t1", bare: "X" },
                { id: "t2", bare: "Y" },
            ],
            "p1"
        )
        expect(orderPremisesForReading(snapshot)).toEqual([
            "p1",
            "p2",
            "t1",
            "t2",
        ])
    })
})

describe("orderPremisesForReading — degenerate / nonsensical constructions", () => {
    test("empty argument → empty order", () => {
        expect(orderPremisesForReading(makeSnapshot([]))).toEqual([])
    })

    test("single bare conclusion with no support → just the conclusion", () => {
        const snapshot = makeSnapshot([{ id: "p1", bare: "A" }], "p1")
        expect(orderPremisesForReading(snapshot)).toEqual(["p1"])
    })

    test("terminates on a two-cycle through the conclusion claim", () => {
        // p2: A⇒B, p3: B⇒A.
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

    test("terminates on a self-loop (A⇒A)", () => {
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", antecedents: ["A"], consequent: "A" },
            ],
            "p1"
        )
        const order = orderPremisesForReading(snapshot)
        expect(order).toHaveLength(2)
        expect(new Set(order)).toEqual(new Set(["p1", "p2"]))
    })

    test("terminates on a three-cycle (A→B→C→A)", () => {
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", antecedents: ["A"], consequent: "B" },
                { id: "p3", antecedents: ["B"], consequent: "C" },
                { id: "p4", antecedents: ["C"], consequent: "A" },
            ],
            "p1"
        )
        const order = orderPremisesForReading(snapshot)
        expect(order).toHaveLength(4)
        expect(new Set(order)).toEqual(new Set(["p1", "p2", "p3", "p4"]))
    })

    test("terminates on a cycle that does not involve the conclusion", () => {
        // A ⇐ D; D ⇐ E; E ⇐ D  (D↔E cycle below the conclusion).
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", antecedents: ["D"], consequent: "A" },
                { id: "p3", antecedents: ["E"], consequent: "D" },
                { id: "p4", antecedents: ["D"], consequent: "E" },
            ],
            "p1"
        )
        const order = orderPremisesForReading(snapshot)
        expect(order).toHaveLength(4)
        expect(new Set(order)).toEqual(new Set(["p1", "p2", "p3", "p4"]))
    })

    test("appends a fully disjoint component flat in base order (not DFS-expanded)", () => {
        // Chain p1⇐p2. Separate q-tree (a_q2 proves m_q1's Z) is disconnected;
        // it appends by lexicographic id, so a_q2 precedes m_q1 despite the proof
        // direction — off-chain premises are not re-ordered among themselves.
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", antecedents: ["B"], consequent: "A" },
                { id: "m_q1", bare: "Z" },
                { id: "a_q2", antecedents: ["Y"], consequent: "Z" },
            ],
            "p1"
        )
        expect(orderPremisesForReading(snapshot)).toEqual([
            "p1",
            "p2",
            "a_q2",
            "m_q1",
        ])
    })

    test("tolerates a premise with no root expression (empty premise)", () => {
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", antecedents: ["B"], consequent: "A" },
                { id: "p3", empty: true },
            ],
            "p1"
        )
        const order = orderPremisesForReading(snapshot)
        expect(order).toEqual(["p1", "p2", "p3"])
    })

    test("an implication with no antecedent side proves its consequent as a leaf", () => {
        // p2 has a consequent A but no antecedents — degenerate but must not crash.
        const snapshot = makeSnapshot(
            [
                { id: "p1", bare: "A" },
                { id: "p2", antecedents: [], consequent: "A" },
            ],
            "p1"
        )
        expect(orderPremisesForReading(snapshot)).toEqual(["p1", "p2"])
    })

    test("is a stable permutation of the input on a large mixed/nonsensical snapshot", () => {
        // Cycle + disjoint tree + rebuttal + premise-bound + multi-prover +
        // empty premise, all at once.
        const specs: TPremiseSpec[] = [
            { id: "c_concl", bare: "A" },
            { id: "s_main", antecedents: ["B", "C"], consequent: "A" },
            { id: "s_altA", antecedents: ["Q"], consequent: "A" }, // 2nd prover of A
            { id: "s_B1", antecedents: ["C"], consequent: "B" }, // B↔C cycle
            { id: "s_C1", antecedents: ["B"], consequent: "C" },
            {
                id: "s_rebut",
                antecedents: ["E"],
                consequent: "B",
                negatedConsequent: true,
            },
            { id: "s_bound", boundAntecedents: ["s_leaf"], consequent: "Q" },
            { id: "s_leaf", bare: "L" },
            { id: "d_off1", bare: "Z" }, // disjoint
            { id: "d_off2", antecedents: ["Y"], consequent: "Z" },
            { id: "e_empty", empty: true },
        ]
        const snapshot = makeSnapshot(specs, "c_concl")
        const order = orderPremisesForReading(snapshot)
        const allIds = specs.map((s) => s.id)
        // Exactly the input set, each once (nothing dropped or duplicated).
        expect(order).toHaveLength(allIds.length)
        expect(new Set(order)).toEqual(new Set(allIds))
        // Conclusion still leads.
        expect(order[0]).toBe("c_concl")
        // Deterministic across repeated runs.
        expect(orderPremisesForReading(snapshot)).toEqual(order)
    })
})

describe("orderPremisesForReading — fallbacks & tie-breaks", () => {
    test("places a reused antecedent's proof once, at first encounter", () => {
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
        expect(order).toHaveLength(4)
        expect(new Set(order).size).toBe(4)
        expect(order.indexOf("p3")).toBeLessThan(order.indexOf("p4"))
        expect(order.filter((id) => id === "p3")).toHaveLength(1)
    })

    test("appends off-chain premises after the chain in lexicographic base order", () => {
        const snapshot = makeSnapshot(
            [
                { id: "z_off", bare: "Z" },
                { id: "p1", bare: "A" },
                { id: "m_off", bare: "M" },
                { id: "p2", antecedents: ["B"], consequent: "A" },
            ],
            "p1"
        )
        expect(orderPremisesForReading(snapshot)).toEqual([
            "p1",
            "p2",
            "m_off",
            "z_off",
        ])
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
