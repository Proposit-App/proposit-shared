import Type, { type Static } from "typebox"
import { UUID } from "../common.js"

// ── Claim Search ───────────────────────────────────────────────────────────

export const ClaimSearchRequestSchema = Type.Object({
    q: Type.String({ minLength: 3 }),
    limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50, default: 20 })),
    argumentId: Type.Optional(UUID),
})
export type TClaimSearchRequest = Static<typeof ClaimSearchRequestSchema>

export const ClaimSearchResultSchema = Type.Object({
    id: UUID,
    argumentId: UUID,
    version: Type.Number(),
    title: Type.String(),
    kind: Type.String(),
    argumentTitle: Type.String(),
    distance: Type.Number(),
})
export type TClaimSearchResult = Static<typeof ClaimSearchResultSchema>

export const ClaimSearchResponseSchema = Type.Array(ClaimSearchResultSchema)
export type TClaimSearchResponse = Static<typeof ClaimSearchResponseSchema>

// ── Source Search ──────────────────────────────────────────────────────────

export const SourceSearchRequestSchema = Type.Object({
    q: Type.String({ minLength: 3 }),
    limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50, default: 20 })),
})
export type TSourceSearchRequest = Static<typeof SourceSearchRequestSchema>

export const SourceSearchResultSchema = Type.Object({
    id: UUID,
    citation: Type.Any(),
    argumentTitle: Type.String(),
    argumentId: UUID,
    argumentVersion: Type.Number(),
    distance: Type.Number(),
})
export type TSourceSearchResult = Static<typeof SourceSearchResultSchema>

export const SourceSearchResponseSchema = Type.Array(SourceSearchResultSchema)
export type TSourceSearchResponse = Static<typeof SourceSearchResponseSchema>

// ── Entity Search (Profile) ────────────────────────────────────────────────

export const EntitySearchRequestSchema = Type.Object({
    q: Type.String({ minLength: 3 }),
    types: Type.Optional(Type.String()),
    limit: Type.Optional(Type.Number({ minimum: 1, maximum: 25, default: 10 })),
})
export type TEntitySearchRequest = Static<typeof EntitySearchRequestSchema>

export const PremiseSearchResultSchema = Type.Object({
    id: UUID,
    argumentId: UUID,
    argumentVersion: Type.Number(),
    title: Type.String(),
    role: Type.String(),
    argumentTitle: Type.String(),
    distance: Type.Number(),
})
export type TPremiseSearchResult = Static<typeof PremiseSearchResultSchema>

export const ArgumentSearchResultSchema = Type.Object({
    id: UUID,
    version: Type.Number(),
    title: Type.String(),
    distance: Type.Number(),
})
export type TArgumentSearchResult = Static<typeof ArgumentSearchResultSchema>

export const EntitySearchResponseSchema = Type.Object({
    arguments: Type.Array(ArgumentSearchResultSchema),
    claims: Type.Array(ClaimSearchResultSchema),
    premises: Type.Array(PremiseSearchResultSchema),
    sources: Type.Array(SourceSearchResultSchema),
})
export type TEntitySearchResponse = Static<typeof EntitySearchResponseSchema>
