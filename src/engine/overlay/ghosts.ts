import type { TClaimType } from "../../schemas/model/claims.js"

/**
 * Read-only "ghost" rows for entities that were REMOVED in a diff — the deleted
 * counterpart of the added/modified change cues. Distinct item variants (rather
 * than a flag on the live item types) because ghosts render on a separate,
 * non-interactive path and their claim/premise data is sourced from a diff's
 * `removed*` maps, not the live snapshot.
 *
 * The platform-neutral item model lives here; the diff-driven builders that
 * populate it stay in each client (they consume that client's own diff/graph
 * layer).
 */
export type TAtvGhostItem =
    | {
          type: "removed-premise-header"
          premiseId: string
          role: "conclusion" | "supporting"
          title: string | null
      }
    | {
          type: "removed-claim"
          expressionId: string
          claimTitle: string
          claimBody: string
          claimType: TClaimType
          negated: boolean
          isConclusion: boolean
          depth: number
      }
    | { type: "removed-operator"; label: string; depth: number }
