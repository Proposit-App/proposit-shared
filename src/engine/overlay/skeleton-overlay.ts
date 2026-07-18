import type { TAtvItem } from "./atv-items.js"
import type { TAtvGhostItem } from "./ghosts.js"
import type { TProjectReactiveSnapshot } from "../engine.js"
import {
    computeWrap,
    defaultSkeletonOperator,
    planSkeletonCommit,
    rootNegationUnitId,
} from "../skeleton-inference.js"
import type {
    TSkeletonOperator,
    TSkeletonCommitTarget,
    TSkeletonCommitPlan,
} from "../skeleton-inference.js"

/**
 * Client-only "skeleton" nodes overlaid on the ATV item stream so the user
 * builds a premise by direct manipulation instead of menu-picking. Skeletons are
 * never persisted — they render what the argument *would* look like and only
 * materialize (via the existing engine mutations) on commit.
 *
 * The overlay is a pure transform applied to `buildAtvEditableItems` output,
 * keyed off the current selection. `buildTextTree` is deliberately untouched:
 * skeletons live entirely in this overlay layer.
 *
 * The operator-inference primitives (`computeWrap`, `defaultSkeletonOperator`,
 * `rootNegationUnitId`, `planSkeletonCommit` and their plan types) live in
 * `../skeleton-inference` and are re-exported here so the ATV layer keeps a
 * single local import surface for skeleton building.
 */

export {
    computeWrap,
    defaultSkeletonOperator,
    planSkeletonCommit,
    rootNegationUnitId,
}
export type { TSkeletonOperator, TSkeletonCommitTarget, TSkeletonCommitPlan }

export type TAtvSkeletonItem =
    | { type: "skeleton-formula-open"; premiseId: string }
    | { type: "skeleton-formula-close"; premiseId: string }
    /** A dashed full-size claim card with a center "+". `leg` names which side
     *  of an empty premise's skeleton inference it fills. */
    | { type: "skeleton-claim"; premiseId: string; leg: "first" | "second" }
    /** The new sibling of a pre-emptive wrap around a selected real claim.
     *  Carries the wrapped real expression + root-ness for the commit phase.
     *  `existingIsConsequent` is set when the wrapped real claim is the
     *  CONSEQUENT — i.e. the user filled the consequent (TOP) leg of an empty
     *  premise first — so this new "+" is the antecedent and the wrap commits
     *  with `direction: "before"`. (In the ATV a formula reads "P is true if Q"
     *  top→bottom, so the consequent is on top and the antecedent on the
     *  bottom.) */
    | {
          type: "skeleton-wrap-claim"
          premiseId: string
          wrappedExpressionId: string
          root: boolean
          existingIsConsequent?: boolean
      }
    /** An uncommitted operator; `root` widens its cycle to all four operators.
     *  `id` is a stable key (`empty:<premiseId>` / `wrap:<exprId>`) the render
     *  layer uses to apply a per-skeleton operator-cycle override. `cyclable` is
     *  false when the operator is pinned to an enclosing `and`/`or` (the engine
     *  flattens into it, so a different operator can't be expressed). */
    | {
          type: "skeleton-operator"
          id: string
          operator: TSkeletonOperator
          root: boolean
          cyclable: boolean
      }

/**
 * The ATV item stream after the skeleton overlay — `TAtvItem` plus skeletons,
 * plus read-only `removed` ghost rows spliced in for diff deletions.
 */
export type TAtvOverlayItem = TAtvItem | TAtvSkeletonItem | TAtvGhostItem

export interface TSkeletonOverlayContext {
    /**
     * The currently-selected claim *expression* (a single rendered instance), or
     * null. Drives pre-emptive skeletons — only the selected expression wraps, so
     * a claim rendered in several expressions spawns at most one skeleton (the
     * clicked instance), never one per instance.
     */
    selectedExpressionId: string | null
    /**
     * The empty-premise leg the user filled FIRST, when a build is mid-flight. In
     * the ATV a formula reads "P is true if Q" top→bottom, so the TOP leg
     * (`"first"`) is the CONSEQUENT and the BOTTOM leg (`"second"`) is the
     * ANTECEDENT. Whichever leg is filled first becomes a lone claim; this lets
     * the follow-up wrap keep that claim in its slot (no top/bottom jump) and
     * commit the correct operand order, so filling the two legs in either order
     * yields the same `implies(antecedent, consequent)`:
     *  - leg `"first"` (consequent/top) → lone claim is the consequent → the new
     *    "+" (antecedent) renders BELOW it, wrap `direction: "before"`.
     *  - leg `"second"` (antecedent/bottom) → lone claim is the antecedent → the
     *    new "+" (consequent) renders ABOVE it, wrap `direction: "after"`.
     */
    emptyPremiseFirstLeg?: { premiseId: string; leg: "first" | "second" } | null
}

// Operator cycles for the skeleton "click to change operator" affordance. A root
// operator (the premise AST's root) is an inference by default, so its cycle is
// the inference pair. Advanced users may additionally root a premise on a bare
// `and`/`or` grouping, so their root cycle appends the sibling pair.
const ROOT_CYCLE: readonly TSkeletonOperator[] = ["implies", "iff"]
const SIBLING_CYCLE: readonly TSkeletonOperator[] = ["and", "or"]
const ROOT_CYCLE_ADVANCED_MODE: readonly TSkeletonOperator[] = [
    ...ROOT_CYCLE,
    ...SIBLING_CYCLE,
]

/**
 * Advance a skeleton operator within its cycle. A non-root skeleton always
 * cycles `and ↔ or`. A root skeleton cycles the inference pair
 * (`implies ↔ iff`); in advanced mode it cycles all four
 * (`implies → iff → and → or`), so only advanced users can root a premise on
 * `and`/`or`. An operator outside the active cycle falls through to the cycle's
 * first entry. Pure.
 */
export function nextSkeletonOperator(
    current: TSkeletonOperator,
    root: boolean,
    advancedMode: boolean
): TSkeletonOperator {
    const cycle = root
        ? advancedMode
            ? ROOT_CYCLE_ADVANCED_MODE
            : ROOT_CYCLE
        : SIBLING_CYCLE
    const i = cycle.indexOf(current)
    return cycle[(i + 1) % cycle.length]
}

export function applySkeletonOverlay(
    items: TAtvItem[],
    snapshot: TProjectReactiveSnapshot,
    ctx: TSkeletonOverlayContext
): TAtvOverlayItem[] {
    const result: TAtvOverlayItem[] = []
    let currentPremiseId: string | null = null

    for (const item of items) {
        if (item.type === "premise-header") currentPremiseId = item.premiseId

        // Empty premise / empty argument: replace the "+" root slot with a
        // skeleton inference so there is no up-front "first claim vs inference"
        // choice.
        if (item.type === "slot" && item.kind === "premise-root") {
            result.push(
                { type: "skeleton-formula-open", premiseId: item.premiseId },
                {
                    type: "skeleton-claim",
                    premiseId: item.premiseId,
                    leg: "first",
                },
                {
                    type: "skeleton-operator",
                    id: `empty:${item.premiseId}`,
                    operator: "implies",
                    root: true,
                    cyclable: true,
                },
                {
                    type: "skeleton-claim",
                    premiseId: item.premiseId,
                    leg: "second",
                },
                { type: "skeleton-formula-close", premiseId: item.premiseId }
            )
            continue
        }

        // Pre-emptive wrap: selecting a real claim's expression wraps it in a
        // skeleton compound so the user can build out by direct manipulation.
        // This fires on the conclusion premise too: after a skeleton leg commits
        // and auto-selects the new claim, the wrap re-renders so the inference
        // can be completed there as well as on supporting premises.
        if (
            item.type === "claim" &&
            ctx.selectedExpressionId !== null &&
            item.expressionId === ctx.selectedExpressionId &&
            currentPremiseId !== null
        ) {
            const wrap = computeWrap(
                item.expressionId,
                currentPremiseId,
                snapshot
            )
            if (wrap) {
                const operatorItem: TAtvSkeletonItem = {
                    type: "skeleton-operator",
                    id: `wrap:${item.expressionId}`,
                    operator: wrap.operator,
                    root: wrap.root,
                    cyclable: wrap.cyclable,
                }
                // Keep a first-filled empty-premise leg in its slot (no
                // top/bottom jump) and commit the correct operand order. Top
                // (`"first"`) is the consequent, bottom (`"second"`) the
                // antecedent.
                const firstLeg =
                    ctx.emptyPremiseFirstLeg?.premiseId === wrap.premiseId
                        ? ctx.emptyPremiseFirstLeg.leg
                        : null
                // Lone claim filled the consequent (top) leg → it IS the
                // consequent; the wrap commits with direction "before".
                const existingIsConsequent = firstLeg === "first"
                // Lone claim filled the antecedent (bottom) leg → the new "+" is
                // the consequent, so it renders ABOVE the lone claim.
                const newSlotOnTop = firstLeg === "second"
                const wrapClaimItem: TAtvSkeletonItem = {
                    type: "skeleton-wrap-claim",
                    premiseId: wrap.premiseId,
                    wrappedExpressionId: item.expressionId,
                    root: wrap.root,
                    ...(existingIsConsequent
                        ? { existingIsConsequent: true }
                        : {}),
                }
                result.push(
                    {
                        type: "skeleton-formula-open",
                        premiseId: wrap.premiseId,
                    },
                    ...(newSlotOnTop
                        ? [wrapClaimItem, operatorItem, item]
                        : [item, operatorItem, wrapClaimItem]),
                    {
                        type: "skeleton-formula-close",
                        premiseId: wrap.premiseId,
                    }
                )
                continue
            }
        }

        result.push(item)
    }

    return result
}
