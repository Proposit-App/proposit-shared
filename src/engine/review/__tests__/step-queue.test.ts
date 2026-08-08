import { describe, it, expect } from "vitest"
import { evaluateArgumentForReview } from "../../review/evaluation.js"
import type { TReviewDraft } from "../../../schemas/review.js"
import {
    buildClaimQueue,
    buildOperatorQueue,
    advanceQueue,
    type TStepQueue,
} from "../../review/step-queue.js"
import {
    buildEngineWithTwoPremises,
    buildEngineWithClaimSharedAcrossPremises,
    buildEngineWithCitationBackedDerivationPremise,
    buildEngineWithDerivationOnlyClaim,
    buildEngineWithUnreferencedClaimVariable,
} from "./fixtures.js"

describe("step-queue", () => {
    it("buildClaimQueue yields supporting-first, conclusion-last claim IDs", () => {
        const engine = buildEngineWithTwoPremises()
        expect(buildClaimQueue(engine)).toEqual(["sA", "cA", "cB"])
    })

    it("buildClaimQueue emits a claim referenced across multiple premises exactly once, in proof order", () => {
        // cShared is bound by a variable in the supporting premise AND a
        // variable in the conclusion premise. Core's dedupe must fold both
        // references into a single first-appearance entry.
        const engine = buildEngineWithClaimSharedAcrossPremises()
        const queue = buildClaimQueue(engine)
        expect(queue).toEqual(["cShared", "cOther", "cConcl"])
        expect(queue.filter((id) => id === "cShared")).toHaveLength(1)
    })

    it("buildClaimQueue excludes null-claimId (premise-bound derivation) rows", () => {
        // The engine synthesizes premise-bound derivation-consequent variables
        // (no claimId) for every non-conclusion normal claim. The queue must
        // carry only genuine claim-bound references, never those wrapper rows.
        const engine = buildEngineWithTwoPremises()
        const nullClaimVarCount = engine
            .getVariables()
            .filter((v) => !("claimId" in v)).length
        expect(nullClaimVarCount).toBeGreaterThan(0)
        const queue = buildClaimQueue(engine)
        // Every queued id is a real claim on the engine — no synthesized rows.
        for (const id of queue) {
            expect(engine.getProjectClaim(id)).toBeDefined()
        }
        expect(queue).toEqual(["sA", "cA", "cB"])
    })

    it("buildClaimQueue excludes a citation claim bound by a derivation antecedent", () => {
        // A claim carrying ≥1 citation mints implies(citation_var, Q), so the
        // source claim is claim-bound and would otherwise be queued as its own
        // step. It has no title and no body — the reviewer would be asked to
        // judge an empty card.
        const engine = buildEngineWithCitationBackedDerivationPremise()
        expect(engine.getProjectClaim("cSource")?.type).toBe("citation")
        expect(buildClaimQueue(engine)).not.toContain("cSource")
    })

    it("buildClaimQueue excludes an axiomatic claim bound by a derivation antecedent", () => {
        // Axioms are titleless for the same reason and are already forced true
        // by the engine before evaluation, so a reviewer's answer would be
        // discarded even if they gave one.
        const engine = buildEngineWithCitationBackedDerivationPremise()
        expect(engine.getProjectClaim("cAxiom")?.type).toBe("axiomatic")
        expect(buildClaimQueue(engine)).not.toContain("cAxiom")
    })

    it("buildClaimQueue keeps only the user-authored claims", () => {
        // Order is core's premise-listing order, which the two derivation
        // premises participate in even though their antecedent claims are
        // dropped — the narrowing removes entries, it does not resequence
        // what remains.
        const engine = buildEngineWithCitationBackedDerivationPremise()
        expect(buildClaimQueue(engine)).toEqual(["cB", "cA", "cQ"])
    })

    it("buildClaimQueue leaves an argument with no sources or axioms unchanged", () => {
        const engine = buildEngineWithTwoPremises()
        for (const id of ["sA", "cA", "cB"]) {
            expect(engine.getProjectClaim(id)?.type).toBe("normal")
        }
        expect(buildClaimQueue(engine)).toEqual(["sA", "cA", "cB"])
    })

    it("buildOperatorQueue returns premises that have at least one decidable operator", () => {
        const engine = buildEngineWithTwoPremises()
        const queue = buildOperatorQueue(engine)
        expect(queue.map((e) => e.premiseId).sort()).toEqual([
            "pConclusion",
            "pSupport",
        ])
        expect(queue.every((e) => e.scope === "premise")).toBe(true)
    })

    it("buildOperatorQueue marks the conclusion premise as accept-only", () => {
        // Core exempts the conclusion premise from striking, so a rejection
        // recorded against it is ignored — offering the control would record a
        // decision that changes nothing the reader was told it changes.
        // Accepting it still grants the inference for propagation.
        const engine = buildEngineWithTwoPremises()
        const queue = buildOperatorQueue(engine)
        const byId = Object.fromEntries(queue.map((e) => [e.premiseId, e]))
        expect(byId.pConclusion.rejectable).toBe(false)
        expect(byId.pSupport.rejectable).toBe(true)
    })

    it("buildOperatorQueue excludes a citation-backed derivation premise", () => {
        // A claim with ≥1 citation gets a derivation premise shaped
        // implies(citation_var, Q). It is an inference with a decidable
        // operator, so both gates pass — but it is engine-managed wiring, not
        // a user-authored inference step, and must never be offered for review.
        const engine = buildEngineWithCitationBackedDerivationPremise()
        expect(
            engine.getPremise("pDerivation")?.getDecidableOperatorExpressions()
                .length
        ).toBeGreaterThan(0)
        expect(buildOperatorQueue(engine).map((e) => e.premiseId)).toEqual([
            "pSupport",
        ])
    })

    it("buildOperatorQueue omits a conclusion premise that is a bare variable", () => {
        // The queue counts premises that need an operator verdict, not
        // premises. A conclusion premise asserting a single claim has no
        // operator to decide, so it is absent by design — the operator-queue
        // length is not a premise count and consumers must not label it as one.
        const engine = buildEngineWithCitationBackedDerivationPremise()
        expect(
            engine.getConclusionPremise()?.getDecidableOperatorExpressions()
        ).toEqual([])
        expect(
            buildOperatorQueue(engine).map((e) => e.premiseId)
        ).not.toContain("pConclusion")
    })

    it("advanceQueue moves forward when not at end", () => {
        const q: TStepQueue = { kind: "claim", items: ["a", "b", "c"] }
        expect(
            advanceQueue({
                queue: q,
                currentIndex: 0,
                skippedKeys: new Set(),
                decidedKeys: new Set(["a"]),
            })
        ).toEqual({ nextIndex: 1, insertRequeueNotice: false })
    })

    it("advanceQueue re-queues at end-of-phase when skipped items remain", () => {
        const q: TStepQueue = { kind: "claim", items: ["a", "b", "c"] }
        expect(
            advanceQueue({
                queue: q,
                currentIndex: 2,
                skippedKeys: new Set(["b"]),
                decidedKeys: new Set(["a", "c"]),
            })
        ).toEqual({ nextIndex: 1, insertRequeueNotice: true })
    })

    it("advanceQueue reports done when everything decided at end", () => {
        const q: TStepQueue = { kind: "claim", items: ["a", "b"] }
        expect(
            advanceQueue({
                queue: q,
                currentIndex: 1,
                skippedKeys: new Set(),
                decidedKeys: new Set(["a", "b"]),
            })
        ).toEqual({ done: true })
    })
})

describe("claim-queue reachability", () => {
    it("does not offer a claim whose variable no expression references", () => {
        const engine = buildEngineWithUnreferencedClaimVariable()
        // The variable exists and is bound to a normal claim, so nothing about
        // its kind keeps it out — only that nothing reads it.
        const unwired = engine
            .getVariables()
            .find((v) => "claimId" in v && v.claimId === "cUnwired")
        expect(unwired).toBeDefined()
        expect(engine.getProjectClaim("cUnwired")?.type).toBe("normal")
        const referenced = new Set(
            engine
                .listPremises()
                .flatMap((p) => p.getExpressions())
                .filter((e) => e.type === "variable")
                .map((e) => e.variableId)
        )
        expect(referenced.has(unwired!.id)).toBe(false)
        expect(buildClaimQueue(engine)).not.toContain("cUnwired")
    })

    it("offers the same claim once one expression references its variable", () => {
        // The only difference between the two arguments is that one premise
        // reads the variable. Guards the narrowing against over-reach.
        const engine = buildEngineWithUnreferencedClaimVariable({
            referenced: true,
        })
        expect(buildClaimQueue(engine)).toContain("cUnwired")
    })

    it("queues exactly the authored claims an assignment can bear on", () => {
        const engine = buildEngineWithUnreferencedClaimVariable()
        expect(buildClaimQueue(engine)).toEqual(["cA", "cQ"])
    })

    it("still offers a claim reachable only through a derivation premise", () => {
        // Recorded rather than fixed: the queue is one longer than the argument
        // renders, but the step is not inert — the derivation premise holding
        // that claim is counted among the surviving supporting premises, so
        // dropping it would change the argument assessment. See the note on
        // buildClaimQueue.
        const engine = buildEngineWithDerivationOnlyClaim()
        const queue = buildClaimQueue(engine)
        expect(queue).toContain("cCited")
        const authoredClaimIds = new Set(
            engine
                .listPremises()
                .filter((p) => p.toPremiseData().type !== "derivation")
                .flatMap((p) => p.getExpressions())
                .filter((e) => e.type === "variable")
                .map((e) => {
                    const variable = engine.getVariable(e.variableId)
                    return variable && "claimId" in variable
                        ? variable.claimId
                        : undefined
                })
        )
        expect(authoredClaimIds.has("cCited")).toBe(false)
        expect(queue.length).toBe(authoredClaimIds.size + 1)
    })
})

describe("why a derivation-only claim is not narrowed away", () => {
    const NOW = new Date("2026-04-14T00:00:00Z")

    function draftWith(claims: Record<string, boolean | null>): TReviewDraft {
        return {
            schemaVersion: 1,
            reviewId: "r",
            argumentId: "a",
            argumentVersion: 1,
            createdAt: NOW,
            updatedAt: NOW,
            phase: "done",
            currentStepIndex: 0,
            claimAssignments: Object.fromEntries(
                Object.entries(claims).map(([claimId, value]) => [
                    claimId,
                    {
                        assignmentId: claimId,
                        claimId,
                        value,
                        skipped: false,
                        decidedAt: NOW,
                    },
                ])
            ),
            operatorAssignments: [
                {
                    assignmentId: "pSupport",
                    premiseId: "pSupport",
                    scope: "premise" as const,
                    decision: "accepted" as const,
                    decidedAt: NOW,
                },
            ],
        }
    }

    it("the step is not inert: answering it moves the supporting aggregate", () => {
        // The measurement behind the note on buildClaimQueue. The derivation
        // premise holding this claim is counted among the surviving supporting
        // premises, so removing the step would leave it unresolved and drag the
        // aggregate to unknown for every reader who would have answered.
        const engine = buildEngineWithDerivationOnlyClaim()
        const answered = evaluateArgumentForReview(
            draftWith({ cA: true, cQ: true, cCited: true }),
            engine
        )
        const unanswered = evaluateArgumentForReview(
            draftWith({ cA: true, cQ: true }),
            engine
        )
        expect(answered.survivingSupportingPremisesTrue).toBe(true)
        expect(unanswered.survivingSupportingPremisesTrue).toBe(null)
    })
})
