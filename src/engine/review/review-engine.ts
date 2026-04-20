// Inherited from proposit-server. Legacy type-alias name (ReviewEngineMode)
// predates the brain-style T-prefix convention; renaming cascades through
// every consumer. Tracked as tech debt for a dedicated follow-up.
/* eslint-disable @typescript-eslint/naming-convention */
import type { PropositArgumentEngine } from "../engine.js"
import type {
    TReviewDraft,
    TReviewResult,
    TOperatorAssignment,
    TClaimReasonCode,
    TOperatorReasonCode,
    TTrivalentValue,
} from "../../schemas/review.js"
import type { UUID } from "../../schemas/common.js"
import type { TReviewStore, TReviewKey } from "./review-store.js"
import {
    buildClaimQueue,
    buildOperatorQueue,
    advanceQueue,
    type TOperatorQueueEntry,
} from "./step-queue.js"
import {
    evaluateArgumentForReview,
    checkValidityForReview,
} from "./evaluation.js"
import { materialFingerprint } from "./fingerprint.js"
import { getClaimReasonsForValue } from "./reasons.js"
import type { TCoreValidityCheckResult } from "@proposit/proposit-core"

const COUNTEREXAMPLE_CAP = 50

const newId = (): UUID => globalThis.crypto.randomUUID()

export type ReviewEngineMode = "editable" | "readonly"

export type TReviewStep =
    | { kind: "claim"; claimId: UUID; referencedInPremiseIds: UUID[] }
    | {
          kind: "operator"
          premiseId: UUID
          scope: "premise" | "expression"
          expressionId?: UUID
      }
    | {
          kind: "skip-requeue-notice"
          phase: "claims" | "operators"
          remainingCount: number
      }
    | { kind: "results" }

export interface TReviewProgress {
    totalClaims: number
    decidedClaims: number
    skippedClaims: number
    totalPremises: number
    decidedPremises: number
    skippedPremises: number
    phase: TReviewDraft["phase"]
    currentStepIndex: number
    totalStepsInPhase: number
    currentPhaseSkippedCount: number
    canGoBack: boolean
}

export interface TReviewEngineSnapshot {
    draft: TReviewDraft
    lastResult: TReviewResult | undefined
    currentStep: TReviewStep | undefined
    progress: TReviewProgress
    canRunEvaluation: boolean
    droppedStaleCount: number
}

export class ReviewEngine {
    private argEngine: PropositArgumentEngine
    private store: TReviewStore
    private key: TReviewKey
    private draft: TReviewDraft
    private lastResult: TReviewResult | undefined
    private claimQueue: UUID[]
    private operatorQueue: TOperatorQueueEntry[]
    private skippedOperatorKeys = new Set<string>()
    private history: { phase: TReviewDraft["phase"]; index: number }[] = []
    private listeners = new Set<() => void>()
    private snapshotCache: TReviewEngineSnapshot | undefined
    private saveTimer: ReturnType<typeof setTimeout> | undefined
    private droppedStaleCount = 0
    /** When true, the next advanceStep jumps straight to the results step and clears the flag. Set by goToClaimForEdit / goToPremiseForEdit. */
    private editingReturnToResults = false
    /** In readonly mode, all assignment-mutation methods no-op. Navigation and runEvaluation still work. */
    public readonly mode: ReviewEngineMode

    constructor(args: {
        argEngine: PropositArgumentEngine
        store: TReviewStore
        userId?: UUID
        initialDraft?: TReviewDraft
        initialResult?: TReviewResult
        mode?: ReviewEngineMode
    }) {
        this.argEngine = args.argEngine
        this.store = args.store
        this.key = {
            argumentId: args.argEngine.getArgument().id,
            argumentVersion: args.argEngine.getArgument().version,
            userId: args.userId,
        }
        this.claimQueue = buildClaimQueue(this.argEngine)
        this.operatorQueue = buildOperatorQueue(this.argEngine)
        this.draft = args.initialDraft ?? this.freshDraft()
        this.lastResult = args.initialResult
        this.mode = args.mode ?? "editable"
        this.dropStaleAssignments()
    }

    private freshDraft(): TReviewDraft {
        const now = new Date()
        return {
            schemaVersion: 1,
            reviewId: newId(),
            argumentId: this.key.argumentId,
            argumentVersion: this.key.argumentVersion,
            userId: this.key.userId,
            createdAt: now,
            updatedAt: now,
            phase: "claims",
            currentStepIndex: 0,
            claimAssignments: {},
            operatorAssignments: [],
        }
    }

    private dropStaleAssignments(): void {
        let dropped = 0
        for (const id of Object.keys(this.draft.claimAssignments)) {
            if (!this.argEngine.getClaim(id)) {
                delete this.draft.claimAssignments[id]
                dropped++
            }
        }
        this.draft.operatorAssignments = this.draft.operatorAssignments.filter(
            (o) => {
                const premise = this.argEngine.getPremise(o.premiseId)
                if (!premise) {
                    dropped++
                    return false
                }
                if (o.scope === "expression" && o.expressionId) {
                    const expr = premise
                        .getExpressions()
                        .find((e) => e.id === o.expressionId)
                    if (!expr) {
                        dropped++
                        return false
                    }
                }
                return true
            }
        )
        this.droppedStaleCount = dropped
    }

    start(): void {
        this.notify()
    }

    async clear(): Promise<void> {
        if (this.mode === "readonly") return
        this.cancelPersist()
        await this.store.clear(this.key)
        this.draft = this.freshDraft()
        this.lastResult = undefined
        this.skippedOperatorKeys.clear()
        this.history = []
        this.notify()
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener)
        return () => this.listeners.delete(listener)
    }

    getSnapshot(): TReviewEngineSnapshot {
        this.snapshotCache ??= this.computeSnapshot()
        return this.snapshotCache
    }

    private notify(): void {
        // Shallow-copy the draft so every notify cycle hands subscribers a
        // fresh reference. Consumers that `useMemo([snap.draft])` rely on
        // this to invalidate (e.g. the review overlay in graph-data-context);
        // without the churn they see stale data because in-place mutations
        // on claimAssignments / operatorAssignments leave `draft` pointing
        // at the same object.
        this.draft = { ...this.draft }
        this.snapshotCache = undefined
        this.schedulePersist()
        for (const l of this.listeners) l()
    }

    private schedulePersist(): void {
        this.cancelPersist()
        this.saveTimer = setTimeout(() => {
            this.saveTimer = undefined
            void this.store.save(this.key, {
                draft: this.draft,
                lastResult: this.lastResult,
            })
        }, 200)
    }

    private cancelPersist(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer)
            this.saveTimer = undefined
        }
    }

    /** Called by the React provider on `window.storage` events for this key. */
    async reloadFromStore(): Promise<void> {
        if (this.mode === "readonly") return
        this.cancelPersist()
        const state = await this.store.load(this.key)
        if (state) {
            this.draft = state.draft
            this.lastResult = state.lastResult
            this.dropStaleAssignments()
        }
        this.notify()
    }

    // ─── Claim phase ───────────────────────────────────────────────────
    setClaimValue(claimId: UUID, value: TTrivalentValue): void {
        if (this.mode === "readonly") return
        const prior = this.draft.claimAssignments[claimId]
        // Reasons are scoped to each trivalent value — drop any prior code
        // that doesn't belong to the new value's reason set.
        const validCodes = new Set(
            getClaimReasonsForValue(value).map((r) => r.code)
        )
        const carryOverReason =
            prior?.reasonCode && validCodes.has(prior.reasonCode)
                ? prior.reasonCode
                : undefined
        this.draft.claimAssignments[claimId] = {
            assignmentId: prior?.assignmentId ?? newId(),
            claimId,
            value,
            reasonCode: carryOverReason,
            skipped: false,
            decidedAt: new Date(),
        }
        this.draft.updatedAt = new Date()
        this.notify()
    }

    /** Jump the wizard to the claim step for `claimId` (no-op if absent). */
    goToClaim(claimId: UUID): void {
        const index = this.claimQueue.indexOf(claimId)
        if (index < 0) return
        this.pushHistory()
        this.draft.phase = "claims"
        this.draft.currentStepIndex = index
        this.draft.updatedAt = new Date()
        this.notify()
    }

    /** Jump the wizard to the operator step for `premiseId` (no-op if absent). */
    goToPremise(premiseId: UUID): void {
        const index = this.operatorQueue.findIndex(
            (e) => e.premiseId === premiseId
        )
        if (index < 0) return
        this.pushHistory()
        this.draft.phase = "operators"
        this.draft.currentStepIndex = index
        this.draft.updatedAt = new Date()
        this.notify()
    }

    /**
     * Same as `goToClaim`, but marks the next `advanceStep` to jump directly
     * to results. Used when editing a single claim from the results page.
     */
    goToClaimForEdit(claimId: UUID): void {
        this.editingReturnToResults = true
        this.goToClaim(claimId)
    }

    /**
     * Same as `goToPremise`, but marks the next `advanceStep` to jump directly
     * to results. Used when editing a single premise from the results page.
     */
    goToPremiseForEdit(premiseId: UUID): void {
        this.editingReturnToResults = true
        this.goToPremise(premiseId)
    }

    /** Ordered claim ids that are referenced by this argument's premises. */
    getClaimQueue(): UUID[] {
        return [...this.claimQueue]
    }

    /** Ordered premise ids that have decidable operator expressions. */
    getOperatorQueue(): UUID[] {
        return this.operatorQueue.map((e) => e.premiseId)
    }

    setClaimReason(claimId: UUID, code: TClaimReasonCode): void {
        if (this.mode === "readonly") return
        const a = this.draft.claimAssignments[claimId]
        if (!a) throw new Error(`setClaimReason: no assignment for ${claimId}`)
        this.draft.claimAssignments[claimId] = { ...a, reasonCode: code }
        this.draft.updatedAt = new Date()
        this.notify()
    }

    skipClaim(claimId: UUID): void {
        if (this.mode === "readonly") return
        const prior = this.draft.claimAssignments[claimId]
        this.draft.claimAssignments[claimId] = {
            assignmentId: prior?.assignmentId ?? newId(),
            claimId,
            value: null,
            reasonCode: prior?.reasonCode,
            skipped: true,
            decidedAt: new Date(),
        }
        this.draft.updatedAt = new Date()
        this.notify()
    }

    // ─── Operator phase ────────────────────────────────────────────────
    setOperatorAssignment(input: {
        premiseId: UUID
        scope: "premise" | "expression"
        expressionId?: UUID
        decision: "accepted" | "rejected"
    }): void {
        if (this.mode === "readonly") return
        const target: TOperatorAssignment = {
            assignmentId: newId(),
            premiseId: input.premiseId,
            expressionId: input.expressionId,
            scope: input.scope,
            decision: input.decision,
            decidedAt: new Date(),
        }
        const idx = this.draft.operatorAssignments.findIndex(
            (o) => opKey(o) === opKey(target)
        )
        if (idx >= 0) {
            this.draft.operatorAssignments[idx] = {
                ...target,
                assignmentId: this.draft.operatorAssignments[idx].assignmentId,
            }
        } else {
            this.draft.operatorAssignments.push(target)
        }
        this.draft.updatedAt = new Date()
        this.notify()
    }

    setOperatorReason(key: string, code: TOperatorReasonCode): void {
        if (this.mode === "readonly") return
        const [premiseId, expressionId = ""] = key.split(":")
        const idx = this.draft.operatorAssignments.findIndex(
            (o) =>
                o.premiseId === premiseId &&
                (o.expressionId ?? "") === expressionId
        )
        if (idx < 0) throw new Error(`setOperatorReason: no op for ${key}`)
        this.draft.operatorAssignments[idx] = {
            ...this.draft.operatorAssignments[idx],
            reasonCode: code,
        }
        this.draft.updatedAt = new Date()
        this.notify()
    }

    /** Session-only: operator skips don't persist across reload. */
    skipOperator(key: string): void {
        if (this.mode === "readonly") return
        this.skippedOperatorKeys.add(key)
        this.notify()
    }

    expandPremiseToExpressions(premiseId: UUID): void {
        const premise = this.argEngine.getPremise(premiseId)
        if (!premise) return
        const premiseLevel = this.draft.operatorAssignments.find(
            (o) => o.scope === "premise" && o.premiseId === premiseId
        )
        const seed: "accepted" | "rejected" =
            premiseLevel?.decision ?? "accepted"
        for (const expr of premise.getDecidableOperatorExpressions()) {
            this.setOperatorAssignment({
                premiseId,
                scope: "expression",
                expressionId: expr.id,
                decision: seed,
            })
        }
    }

    backOutToPremiseLevel(premiseId: UUID): void {
        if (this.mode === "readonly") return
        this.draft.operatorAssignments = this.draft.operatorAssignments.filter(
            (o) => !(o.scope === "expression" && o.premiseId === premiseId)
        )
        this.draft.updatedAt = new Date()
        this.notify()
    }

    // ─── Navigation ────────────────────────────────────────────────────
    proceedWithSkippedAsUnknown(): void {
        if (this.mode === "readonly") return
        if (this.draft.phase === "claims") {
            for (const a of Object.values(this.draft.claimAssignments)) {
                if (a.skipped) {
                    this.draft.claimAssignments[a.claimId] = {
                        ...a,
                        decidedAt: new Date(),
                    }
                }
            }
            this.transitionTo("operators")
        } else if (this.draft.phase === "operators") {
            this.skippedOperatorKeys.clear()
            this.transitionTo("done")
        }
        this.notify()
    }

    private transitionTo(phase: TReviewDraft["phase"]): void {
        this.pushHistory()
        this.draft.phase = phase
        this.draft.currentStepIndex = 0
        this.draft.updatedAt = new Date()
    }

    advanceStep(): void {
        this.pushHistory()
        if (this.editingReturnToResults) {
            this.editingReturnToResults = false
            this.draft.phase = "done"
            this.draft.currentStepIndex = 0
            this.draft.updatedAt = new Date()
            this.notify()
            return
        }
        const result =
            this.draft.phase === "claims"
                ? advanceQueue({
                      queue: { kind: "claim", items: this.claimQueue },
                      currentIndex: this.draft.currentStepIndex,
                      skippedKeys: this.claimSkippedKeys(),
                      decidedKeys: this.claimDecidedKeys(),
                  })
                : this.draft.phase === "operators"
                  ? advanceQueue({
                        queue: {
                            kind: "operator",
                            items: this.operatorQueue,
                        },
                        currentIndex: this.draft.currentStepIndex,
                        skippedKeys: this.skippedOperatorKeys,
                        decidedKeys: this.operatorDecidedKeys(),
                    })
                  : { done: true as const }
        if ("done" in result) {
            this.transitionTo(
                this.draft.phase === "claims" ? "operators" : "done"
            )
        } else if (result.insertRequeueNotice) {
            // Land "past the end" so computeSnapshot emits the skip-requeue-notice.
            // If the user chooses "review skipped" the UI will call goToStep(nextIndex).
            const total =
                this.draft.phase === "claims"
                    ? this.claimQueue.length
                    : this.operatorQueue.length
            this.draft.currentStepIndex = total
        } else {
            this.draft.currentStepIndex = result.nextIndex
        }
        this.draft.updatedAt = new Date()
        this.notify()
    }

    goBack(): void {
        const last = this.history.pop()
        if (!last) return
        this.draft.phase = last.phase
        this.draft.currentStepIndex = last.index
        this.draft.updatedAt = new Date()
        this.notify()
    }

    goToStep(index: number): void {
        this.pushHistory()
        this.draft.currentStepIndex = Math.max(0, index)
        this.draft.updatedAt = new Date()
        this.notify()
    }

    private pushHistory(): void {
        this.history.push({
            phase: this.draft.phase,
            index: this.draft.currentStepIndex,
        })
        if (this.history.length > 200) this.history.shift()
    }

    // ─── Evaluation ────────────────────────────────────────────────────
    async runEvaluation(): Promise<TReviewResult> {
        const now = new Date()
        const evaluation = evaluateArgumentForReview(this.draft, this.argEngine)
        const result: TReviewResult = {
            schemaVersion: 1,
            createdAt: now,
            evaluatedAt: now,
            evaluatedFingerprint: materialFingerprint(this.draft),
            evaluation,
            validityCheck: undefined,
        }
        this.lastResult = result
        // Write the full state directly — avoids the load-then-save path in
        // saveResult, which requires a prior save (not guaranteed before eval).
        this.cancelPersist()
        await this.store.save(this.key, {
            draft: this.draft,
            lastResult: result,
        })
        this.notify()
        return result
    }

    async runValidityCheck(options?: {
        maxVariables?: number
        maxAssignmentsChecked?: number
    }): Promise<TCoreValidityCheckResult> {
        if (this.mode === "readonly") return { ok: false }
        const raw = checkValidityForReview(this.argEngine, options)
        const counterexamples = raw.counterexamples?.slice(
            0,
            COUNTEREXAMPLE_CAP
        )
        const capped: TCoreValidityCheckResult = {
            ...raw,
            counterexamples,
            truncated:
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- falsy truncated must fall through
                raw.truncated ||
                (raw.counterexamples !== undefined &&
                    raw.counterexamples.length > COUNTEREXAMPLE_CAP),
        }
        if (this.lastResult) {
            this.lastResult = { ...this.lastResult, validityCheck: capped }
            this.cancelPersist()
            await this.store.save(this.key, {
                draft: this.draft,
                lastResult: this.lastResult,
            })
        }
        this.notify()
        return capped
    }

    resetSkipFlags(): void {
        if (this.mode === "readonly") return
        for (const id of Object.keys(this.draft.claimAssignments)) {
            const a = this.draft.claimAssignments[id]
            if (a.skipped)
                this.draft.claimAssignments[id] = { ...a, skipped: false }
        }
        this.skippedOperatorKeys.clear()
        this.history = []
        this.draft.phase = "claims"
        this.draft.currentStepIndex = 0
        this.draft.updatedAt = new Date()
        this.notify()
    }

    /** Jump the wizard to the results step. History is preserved, so Back returns to the prior step. */
    jumpToResults(): void {
        this.pushHistory()
        this.draft.phase = "done"
        this.draft.currentStepIndex = 0
        this.draft.updatedAt = new Date()
        this.notify()
    }

    // ─── Snapshot ──────────────────────────────────────────────────────
    private computeSnapshot(): TReviewEngineSnapshot {
        let currentStep: TReviewStep | undefined
        if (this.draft.phase === "claims") {
            const claimId = this.claimQueue[this.draft.currentStepIndex]
            if (claimId) {
                const refs: UUID[] = []
                for (const p of this.argEngine.listPremises()) {
                    for (const vId of p.getReferencedVariableIds()) {
                        const variable = this.argEngine.getVariable(vId)
                        const vcId =
                            variable && "claimId" in variable
                                ? variable.claimId
                                : undefined
                        if (vcId === claimId) {
                            refs.push(p.getId())
                            break
                        }
                    }
                }
                currentStep = {
                    kind: "claim",
                    claimId,
                    referencedInPremiseIds: refs,
                }
            } else if (this.claimSkippedRemain()) {
                currentStep = {
                    kind: "skip-requeue-notice",
                    phase: "claims",
                    remainingCount: this.claimSkippedKeys().size,
                }
            }
        } else if (this.draft.phase === "operators") {
            const entry = this.operatorQueue[this.draft.currentStepIndex]
            if (entry) {
                currentStep = {
                    kind: "operator",
                    premiseId: entry.premiseId,
                    scope: "premise",
                }
            } else if (this.operatorSkippedRemain()) {
                currentStep = {
                    kind: "skip-requeue-notice",
                    phase: "operators",
                    remainingCount: this.skippedOperatorKeys.size,
                }
            }
        } else {
            currentStep = { kind: "results" }
        }

        return {
            draft: this.draft,
            lastResult: this.lastResult,
            currentStep,
            progress: {
                totalClaims: this.claimQueue.length,
                decidedClaims: this.claimDecidedKeys().size,
                skippedClaims: this.claimSkippedKeys().size,
                totalPremises: this.operatorQueue.length,
                decidedPremises: this.operatorDecidedKeys().size,
                skippedPremises: this.skippedOperatorKeys.size,
                phase: this.draft.phase,
                currentStepIndex: this.draft.currentStepIndex,
                totalStepsInPhase:
                    this.draft.phase === "claims"
                        ? this.claimQueue.length
                        : this.draft.phase === "operators"
                          ? this.operatorQueue.length
                          : 0,
                currentPhaseSkippedCount:
                    this.draft.phase === "claims"
                        ? this.claimSkippedKeys().size
                        : this.draft.phase === "operators"
                          ? this.skippedOperatorKeys.size
                          : 0,
                canGoBack: this.history.length > 0,
            },
            canRunEvaluation: this.draft.phase === "done",
            droppedStaleCount: this.droppedStaleCount,
        }
    }

    // ─── Key helpers ───────────────────────────────────────────────────
    private claimSkippedKeys(): Set<string> {
        return new Set(
            Object.values(this.draft.claimAssignments)
                .filter((a) => a.skipped)
                .map((a) => a.claimId)
        )
    }
    private claimDecidedKeys(): Set<string> {
        return new Set(
            Object.values(this.draft.claimAssignments)
                .filter((a) => !a.skipped)
                .map((a) => a.claimId)
        )
    }
    private claimSkippedRemain(): boolean {
        for (const a of Object.values(this.draft.claimAssignments)) {
            if (a.skipped) return true
        }
        return false
    }
    private operatorDecidedKeys(): Set<string> {
        const s = new Set<string>()
        for (const o of this.draft.operatorAssignments) s.add(opKey(o))
        return s
    }
    private operatorSkippedRemain(): boolean {
        return this.skippedOperatorKeys.size > 0
    }
}

function opKey(o: TOperatorAssignment): string {
    return o.scope === "premise"
        ? o.premiseId
        : `${o.premiseId}:${o.expressionId ?? ""}`
}
