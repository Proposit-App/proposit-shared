import { describe, it, expect } from "vitest"
import { ReviewEngine } from "../review-engine.js"
import type { TReviewStore } from "../review-store.js"
import { isReviewComplete } from "../wire.js"
import {
    buildEngineWithRestrictionConflict,
    buildEngineWithTwoPremises,
    buildEngineWithUnsatisfiablePremises,
} from "./fixtures.js"

/** The phase machine is what is under test here, not persistence. */
const memoryStore = (): TReviewStore => {
    let saved: Parameters<TReviewStore["save"]>[1] | undefined
    return {
        load: () => Promise.resolve(saved),
        save: (_key, state) => {
            saved = state
            return Promise.resolve()
        },
        clear: () => {
            saved = undefined
            return Promise.resolve()
        },
        upsertClaimAssignment: () => Promise.resolve(),
        upsertOperatorAssignment: () => Promise.resolve(),
        saveResult: () => Promise.resolve(),
        keyFor: (key) =>
            `${key.argumentId}:${key.argumentVersion}:${key.userId ?? ""}`,
    }
}

function buildBlockedReview(): ReviewEngine {
    // P true with both inferences granted derives A and B, which the granted
    // restriction rules out. The premise set is satisfiable (take P false), so
    // the reader has a resolution and is held at the gate until they take it.
    const re = new ReviewEngine({
        argEngine: buildEngineWithRestrictionConflict(),
        store: memoryStore(),
    })
    re.start()
    re.setClaimValue("cP", true)
    for (const premiseId of ["pToA", "pToB", "pRestriction"]) {
        re.setOperatorAssignment({
            premiseId,
            scope: "premise",
            decision: "accepted",
        })
    }
    re.jumpToResults()
    return re
}

describe("the blocked review state", () => {
    it("holds a review with a resolvable contradiction at the gate", async () => {
        const re = buildBlockedReview()
        await re.runEvaluation()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("blocked")
        expect(isReviewComplete(snap.draft)).toBe(false)
        expect(snap.coherence?.state).toBe("reader-resolvable")
        expect(snap.coherence?.contradictions).toHaveLength(1)
    })

    it("still renders the results step while blocked", async () => {
        const re = buildBlockedReview()
        await re.runEvaluation()
        const snap = re.getSnapshot()
        expect(snap.currentStep).toEqual({ kind: "results" })
        expect(snap.canRunEvaluation).toBe(true)
    })

    it("cannot be stepped past", async () => {
        const re = buildBlockedReview()
        await re.runEvaluation()
        re.advanceStep()
        expect(re.getSnapshot().draft.phase).toBe("blocked")
    })

    it("returns to done once the reader resolves the collision", async () => {
        const re = buildBlockedReview()
        await re.runEvaluation()
        re.setOperatorAssignment({
            premiseId: "pRestriction",
            scope: "premise",
            decision: "rejected",
        })
        await re.runEvaluation()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("done")
        expect(isReviewComplete(snap.draft)).toBe(true)
        expect(snap.coherence?.state).toBe("coherent")
    })

    it("never blocks a reader over premises that cannot all hold", async () => {
        // No assignment of theirs could have changed the outcome, so they are
        // told at the start and left free to finish.
        const re = new ReviewEngine({
            argEngine: buildEngineWithUnsatisfiablePremises(),
            store: memoryStore(),
        })
        re.start()
        re.setOperatorAssignment({
            premiseId: "pRestriction",
            scope: "premise",
            decision: "accepted",
        })
        re.jumpToResults()
        await re.runEvaluation()
        const snap = re.getSnapshot()
        expect(snap.coherence?.state).toBe("premises-contradict")
        expect(snap.draft.phase).toBe("done")
        expect(isReviewComplete(snap.draft)).toBe(true)
        expect(snap.coherence?.notice).toBeDefined()
        expect(snap.assessment?.argument.outcome).toBe("premises-contradict")
    })
})

describe("the blocked gate across a reload", () => {
    /** Rehydrate the blocked review the way a page load does: draft only. */
    async function reloadedBlockedReview(): Promise<ReviewEngine> {
        const store = memoryStore()
        const first = new ReviewEngine({
            argEngine: buildEngineWithRestrictionConflict(),
            store,
        })
        first.start()
        first.setClaimValue("cP", true)
        for (const premiseId of ["pToA", "pToB", "pRestriction"]) {
            first.setOperatorAssignment({
                premiseId,
                scope: "premise",
                decision: "accepted",
            })
        }
        first.jumpToResults()
        await first.runEvaluation()
        expect(first.getSnapshot().draft.phase).toBe("blocked")
        const stored = await store.load(
            {} as Parameters<TReviewStore["load"]>[0]
        )
        return new ReviewEngine({
            argEngine: buildEngineWithRestrictionConflict(),
            store,
            initialDraft: stored!.draft,
            initialResult: stored!.lastResult,
        })
    }

    it("keeps the review blocked when nothing has been re-evaluated", async () => {
        const re = await reloadedBlockedReview()
        re.start()
        // Edit a claim and come straight back: the return trip goes through
        // the same gate, and no evaluation has run in this session.
        re.goToClaimForEdit("cP")
        re.advanceStep()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("blocked")
        expect(isReviewComplete(snap.draft)).toBe(false)
    })

    it("opens the gate again only once an evaluation clears the collision", async () => {
        const re = await reloadedBlockedReview()
        re.start()
        re.setOperatorAssignment({
            premiseId: "pRestriction",
            scope: "premise",
            decision: "rejected",
        })
        await re.runEvaluation()
        expect(re.getSnapshot().draft.phase).toBe("done")
    })

    it("does not carry a block into a brand-new review", async () => {
        const re = buildBlockedReview()
        await re.runEvaluation()
        expect(re.getSnapshot().draft.phase).toBe("blocked")
        await re.clear()
        re.jumpToResults()
        expect(re.getSnapshot().draft.phase).toBe("done")
    })
})

describe("the blocked gate against a stale finding", () => {
    it("does not report done off a coherence finding for a different draft", async () => {
        // Evaluate clean, then edit and step forward without re-evaluating.
        // The finding on hand describes the draft before the edit, and a
        // finding that no longer applies is not evidence about this one.
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: memoryStore(),
        })
        re.start()
        re.jumpToResults()
        await re.runEvaluation()
        expect(re.getSnapshot().draft.phase).toBe("done")

        re.setClaimValue("cA", true)
        re.jumpToResults()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("blocked")
        expect(isReviewComplete(snap.draft)).toBe(false)

        // …and back to done once a finding describes this draft again.
        await re.runEvaluation()
        expect(re.getSnapshot().draft.phase).toBe("done")
    })

    it("holds a review whose edit introduced a collision", async () => {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: memoryStore(),
        })
        re.start()
        re.jumpToResults()
        await re.runEvaluation()
        expect(re.getSnapshot().draft.phase).toBe("done")

        re.setOperatorAssignment({
            premiseId: "pConclusion",
            scope: "premise",
            decision: "accepted",
        })
        re.setClaimValue("cA", true)
        re.setClaimValue("cB", false)
        await re.runEvaluation()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("blocked")
        expect(snap.coherence?.contestedVariableIds.length).toBeGreaterThan(0)
    })
})

describe("a rejection core ignores cannot be recorded", () => {
    /** cA true, cB false, with the conclusion premise decided either way. */
    async function conclusionDecidedAs(
        decision: "accepted" | "rejected"
    ): Promise<ReviewEngine> {
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: memoryStore(),
        })
        re.start()
        re.setClaimValue("cA", true)
        re.setClaimValue("cB", false)
        re.setOperatorAssignment({
            premiseId: "pConclusion",
            scope: "premise",
            decision,
        })
        re.jumpToResults()
        await re.runEvaluation()
        return re
    }

    it("refuses a rejection of the conclusion premise at the write path", async () => {
        const re = await conclusionDecidedAs("rejected")
        expect(
            re
                .getSnapshot()
                .draft.operatorAssignments.filter(
                    (o) => o.premiseId === "pConclusion"
                )
        ).toEqual([])
    })

    it("cannot be used as a way past the collision", async () => {
        // Recording the rejection took the premise out of the accepted set, so
        // the contradiction vanished; and core never applies the forward rule
        // through a rejected operator, so `contestedVariableIds` came back
        // empty too. Neither gate saw anything, and the review completed with
        // the collision still in it.
        //
        // Refused, the review is exactly where it would be had the reader not
        // answered the step at all — the decision is still outstanding, and the
        // only one this premise takes leads straight back to the gate.
        const re = await conclusionDecidedAs("rejected")
        expect(re.getSnapshot().draft.operatorAssignments).toEqual([])
        re.setOperatorAssignment({
            premiseId: "pConclusion",
            scope: "premise",
            decision: "accepted",
        })
        await re.runEvaluation()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("blocked")
        expect(isReviewComplete(snap.draft)).toBe(false)
        expect(snap.coherence?.blocksCompletion).toBe(true)
    })

    it("still records an acceptance, which core does honour", async () => {
        const re = await conclusionDecidedAs("accepted")
        const snap = re.getSnapshot()
        expect(snap.draft.operatorAssignments.map((o) => o.decision)).toContain(
            "accepted"
        )
        expect(snap.draft.phase).toBe("blocked")
    })
})

describe("the snapshot never contradicts itself", () => {
    it("withholds a coherence finding that describes a different draft", async () => {
        // `blocked` used to imply a finding that blocked. Now it can also mean
        // "not re-checked yet", and a client drawing the blocked screen from
        // `coherence.contradictions` would render an empty dead end.
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: memoryStore(),
        })
        re.start()
        re.jumpToResults()
        await re.runEvaluation()
        expect(re.getSnapshot().coherence?.state).toBe("coherent")

        re.setClaimValue("cA", true)
        re.jumpToResults()
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("blocked")
        expect(snap.coherence).toBeUndefined()
    })
})

describe("a material edit made at the results step re-opens the gate", () => {
    it("leaves a done review no longer done", async () => {
        // The change-assignment exits carry claimId/variableId and invite an
        // inline edit rather than a trip back through the wizard, so the phase
        // has to move with the edit — otherwise the debounced persist writes a
        // completed review whose collision was never evaluated.
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store: memoryStore(),
        })
        re.start()
        re.jumpToResults()
        await re.runEvaluation()
        expect(re.getSnapshot().draft.phase).toBe("done")

        re.setClaimValue("cA", true)
        expect(re.getSnapshot().draft.phase).toBe("blocked")
        expect(isReviewComplete(re.getSnapshot().draft)).toBe(false)
    })

    it("moves on an operator decision and on a skip too", async () => {
        for (const edit of [
            (re: ReviewEngine) =>
                re.setOperatorAssignment({
                    premiseId: "pSupport",
                    scope: "premise",
                    decision: "accepted",
                }),
            (re: ReviewEngine) => re.skipClaim("cA"),
        ]) {
            const re = new ReviewEngine({
                argEngine: buildEngineWithTwoPremises(),
                store: memoryStore(),
            })
            re.start()
            re.jumpToResults()
            await re.runEvaluation()
            expect(re.getSnapshot().draft.phase).toBe("done")
            edit(re)
            expect(re.getSnapshot().draft.phase).toBe("blocked")
        }
    })
})

describe("a reopened review that is edited", () => {
    it("stops reporting itself finished", async () => {
        // The common shape: a finished review is reopened later — a stored
        // result, no coherence finding in hand — and the reader changes an
        // answer. Without the stored result counting as evidence that has gone
        // stale, the phase gate has nothing to compare and leaves it `done`.
        const store = memoryStore()
        const first = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store,
        })
        first.start()
        first.jumpToResults()
        await first.runEvaluation()
        expect(first.getSnapshot().draft.phase).toBe("done")

        const stored = await store.load(
            {} as Parameters<TReviewStore["load"]>[0]
        )
        const re = new ReviewEngine({
            argEngine: buildEngineWithTwoPremises(),
            store,
            initialDraft: stored!.draft,
            initialResult: stored!.lastResult,
        })
        re.start()
        expect(re.getSnapshot().draft.phase).toBe("done")

        re.setClaimValue("cA", true)
        const snap = re.getSnapshot()
        expect(snap.draft.phase).toBe("blocked")
        expect(isReviewComplete(snap.draft)).toBe(false)
        expect(snap.coherence).toBeUndefined()
    })
})
