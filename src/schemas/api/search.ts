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

// ── Citation Search ────────────────────────────────────────────────────────

export const CitationSearchRequestSchema = Type.Object({
    q: Type.String({ minLength: 3 }),
    limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50, default: 20 })),
})
export type TCitationSearchRequest = Static<typeof CitationSearchRequestSchema>

export const CitationSearchResultSchema = Type.Object({
    id: UUID,
    citation: Type.Any(),
    argumentTitle: Type.String(),
    argumentId: UUID,
    argumentVersion: Type.Number(),
    distance: Type.Number(),
})
export type TCitationSearchResult = Static<typeof CitationSearchResultSchema>

export const CitationSearchResponseSchema = Type.Array(
    CitationSearchResultSchema
)
export type TCitationSearchResponse = Static<
    typeof CitationSearchResponseSchema
>

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
    citations: Type.Array(CitationSearchResultSchema),
    // Signals which retrieval path produced the results: "embedding" (vector
    // path) or "string" (SQL literal-match fallback). Optional so an older
    // field-less server, and a client reading an older server, both validate.
    searchMode: Type.Optional(
        Type.Union([Type.Literal("embedding"), Type.Literal("string")])
    ),
})
export type TEntitySearchResponse = Static<typeof EntitySearchResponseSchema>
