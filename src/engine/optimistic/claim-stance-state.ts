import type {
    TClaimReactionSelection,
    TClaimReactionStanceCounts,
} from "../../schemas/api/claim-reaction/index.js"
import type { TClaimReasonCode } from "../../schemas/review.js"

export type TStanceBucket = "affirm" | "disagree" | "neutral"

// The optimistic per-claim reaction state the UI drives: public aggregate
// counts plus the caller's own selection (null when they haven't reacted).
export type TClaimReactionState = {
    counts: TClaimReactionStanceCounts
    own: TClaimReactionSelection | null
}

type TStanceValue = TClaimReactionSelection["value"]
// A newly submitted reason is always a closed-union code (chosen from the reason
// list), so the write-facing setters use the narrow union — the read schema's
// `reasonCode` widened to `string` to carry stored codes that fell out of the
// union, but those only ever arrive on the display path, not on submit.
type TReasonCode = TClaimReasonCode

export function bucketOf(value: TStanceValue): TStanceBucket {
    if (value === true) return "affirm"
    if (value === false) return "disagree"
    return "neutral"
}

// Upsert the caller's stance. A single reaction per claim, so switching to a
// different bucket decrements the old and increments the new; a reason change
// within the same bucket leaves counts untouched.
export function applyStance(
    state: TClaimReactionState,
    value: TStanceValue,
    reasonCode: TReasonCode
): TClaimReactionState {
    const nextBucket = bucketOf(value)
    const counts = { ...state.counts }
    if (state.own !== null) {
        const prevBucket = bucketOf(state.own.value)
        if (prevBucket === nextBucket) {
            return { counts, own: { value, reasonCode } }
        }
        counts[prevBucket] = Math.max(0, counts[prevBucket] - 1)
    }
    counts[nextBucket] = counts[nextBucket] + 1
    return { counts, own: { value, reasonCode } }
}

// Remove the caller's reaction, decrementing whichever bucket they held.
export function clearOwn(state: TClaimReactionState): TClaimReactionState {
    if (state.own === null) return state
    const bucket = bucketOf(state.own.value)
    const counts = { ...state.counts }
    counts[bucket] = Math.max(0, counts[bucket] - 1)
    return { counts, own: null }
}
