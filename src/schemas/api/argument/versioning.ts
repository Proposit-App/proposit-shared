import Type, { type Static } from "typebox"
import { Nullable, UUID } from "../../common.js"

// ──── Latest published claim version (GET /claim/[claimId]/latest-version) ──

/**
 * Response body for
 * `GET /api/v1/claim/[claimId]/latest-version?pinned=<number>`.
 *
 * Claims are independently versioned and shared by reference. A draft argument
 * pins a specific claim version through its propositional variable; this read
 * lets the caller learn the claim trunk's latest published version and whether
 * it is newer than the version it currently pins.
 *
 * - `latestPublishedVersion` is `null` when the claim has no published version
 *   yet (only a draft head exists).
 * - `hasNewer` is the server-computed predicate
 *   `latestPublishedVersion != null && pinned != null && latestPublishedVersion > pinned`.
 *   When the `pinned` query param is omitted, the server returns `false`.
 */
export const ClaimLatestVersionResponseSchema = Type.Object({
    claimId: UUID,
    latestPublishedVersion: Nullable(Type.Number()),
    hasNewer: Type.Boolean(),
})
export type TClaimLatestVersionResponse = Static<
    typeof ClaimLatestVersionResponseSchema
>

// ──── Advance claim reference (POST /argument/[id]/[v]/claim/[claimId]/advance) ──

/**
 * Request body for
 * `POST /api/v1/argument/[argumentId]/[version]/claim/[claimId]/advance`.
 *
 * Repins the draft argument's variable(s) that reference the claim to a newer
 * published version. Omit `toVersion` to advance to the claim's latest
 * published head; supply it to repin to an explicit target version.
 */
export const AdvanceClaimReferenceRequestSchema = Type.Object({
    toVersion: Type.Optional(Type.Number()),
})
export type TAdvanceClaimReferenceRequest = Static<
    typeof AdvanceClaimReferenceRequestSchema
>

/**
 * Response body for the advance-claim-reference POST. Echoes the claim and the
 * version now pinned by the draft after the advance.
 */
export const AdvanceClaimReferenceResponseSchema = Type.Object({
    claimId: UUID,
    newVersion: Type.Number(),
})
export type TAdvanceClaimReferenceResponse = Static<
    typeof AdvanceClaimReferenceResponseSchema
>
