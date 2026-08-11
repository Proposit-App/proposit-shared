/**
 * The copy the review surface renders, declared once for every client.
 *
 * The engine owns the words for the two assessment axes; this module
 * re-exports them so a client has one import site, and adds the chrome copy
 * that sits around them. Nothing moves: the labels stay in
 * `engine/review/assessment.ts`, because importing them from here would point
 * the engine at the UI layer.
 *
 * The three standing constraints on that engine module hold for every string
 * added here, which now sit beside the ones the rules were written for:
 *
 * - **No proof language.** Every finding is relative to one reader's
 *   assignment and may rest on steps they granted for inductive reasons, so
 *   "proved" would overclaim in two directions at once. Reaching a conclusion
 *   is the strongest thing said.
 * - **Nothing implies a granted inductive step establishes less than an
 *   entailment does.** Acceptance reasons are a record of why, not a modifier
 *   on force.
 * - **Nothing borrows the reader's accept/reject vocabulary.** A reader
 *   accepts and rejects premise relations, and a review reports those
 *   rejections beside its findings — so a finding worded in the same words
 *   contradicts itself over a state the engine deliberately allows.
 */
import { CONCLUSION_VALUE_LABELS } from "../../../engine/review/assessment.js"
import type {
    TAssignmentPill,
    TAssignmentProvenance,
} from "../../../engine/review/types.js"

export {
    ARGUMENT_OUTCOME_LABELS,
    CONCLUSION_VALUE_LABELS,
} from "../../../engine/review/assessment.js"

/**
 * The label on an assignment pill. The three truth words come from the engine;
 * `skipped` is an assignment state rather than a truth value, so it is not in
 * that table and is worded here.
 */
export const REVIEW_PILL_LABELS: Record<TAssignmentPill, string> = {
    ...CONCLUSION_VALUE_LABELS,
    skipped: "Skipped",
}

/**
 * Where a claim's value came from when the reader did not set it. Written once
 * without its first letter because it is rendered two ways — opening a
 * sentence of its own, and folded into
 * {@link REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP} after an em dash — and the same
 * sentence written twice is what drifts.
 */
const VALUE_ORIGIN_BODY =
    "erived from how this claim is used: grounded claims (citations, " +
    "axioms, and claims they directly support) start true; claims the " +
    "argument still has to reach start unknown."

/**
 * The origin sentence on its own, for a caller that opens a sentence with it.
 */
export const REVIEW_DEFAULT_VALUE_ORIGIN = `D${VALUE_ORIGIN_BODY}`

/**
 * The whole tooltip for a value the reader did not set. One sentence: what
 * follows the em dash continues it rather than starting a second one.
 */
export const REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP = `Default — d${VALUE_ORIGIN_BODY}`

/** The tooltip carried by a claim's provenance mark, per provenance. */
export const REVIEW_PROVENANCE_TOOLTIPS: Record<TAssignmentProvenance, string> =
    {
        user: "Your assignment.",
        default: REVIEW_DEFAULT_ASSIGNMENT_TOOLTIP,
    }
