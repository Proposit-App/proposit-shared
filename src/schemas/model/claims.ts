import Type, { type Static } from "typebox"
import { EncodableDate, Nullable, UUID } from "../common.js"
import { IEEEReferenceSchema } from "./references.js"
import {
    CoreClaimAxiomaticTypeSchema,
    CoreClaimCitationTypeSchema,
    CoreClaimNormalTypeSchema,
    CoreClaimTypeSchema,
} from "@proposit/proposit-core"

// Re-export aliases so consumers that imported ClaimTypeSchema / TClaimType
// from @proposit/shared/schemas keep working without code edits.
export const ClaimTypeSchema = CoreClaimTypeSchema
export type TClaimType = Static<typeof ClaimTypeSchema>

export const AxiomKindSchema = Type.Union([
    Type.Literal("definition"),
    Type.Literal("stipulation"),
    Type.Literal("logical-principle"),
    Type.Literal("mathematical-principle"),
    Type.Literal("domain-rule"),
    Type.Literal("background-assumption"),
])
export type TAxiomKind = Static<typeof AxiomKindSchema>

// Single source of truth for `digest`. Everything that needs digest inherits
// from this rather than re-declaring the field.
const ClaimMetadataFieldsSchema = Type.Object({
    digest: Type.String(),
})

// Normal-only mutable fields. Citation/Axiomatic variants do NOT inherit from
// this — they redeclare title/body/titleContentHash inline as Type.Null().
export const MutableClaimFieldsSchema = Type.Object({
    title: Type.String(),
    body: Type.String(),
    titleContentHash: Type.String(),
})
export type TMutableClaimFields = Static<typeof MutableClaimFieldsSchema>

// Update request: Normal mutable fields + digest. Update is Normal-only in
// this bump (creation/update for Citation/Axiomatic comes later).
export const ClaimUpdateRequestSchema = Type.Interface(
    [MutableClaimFieldsSchema, ClaimMetadataFieldsSchema],
    {}
)
export type TClaimUpdateFields = Static<typeof ClaimUpdateRequestSchema>

// Presentation taxonomy — Normal-claim-only. `kind` is null on Citation and
// Axiomatic claims.
export const NormalClaimKinds = {
    CLAIM: "claim",
    CONCLUSION: "conclusion",
    DEFINITION: "definition",
    CRITERION: "criterion",
} as const

const NormalClaimChildKindsSchema = Type.Union([
    Type.Literal(NormalClaimKinds.DEFINITION),
    Type.Literal(NormalClaimKinds.CRITERION),
])
const NormalClaimLogicalKindsSchema = Type.Union([
    Type.Literal(NormalClaimKinds.CONCLUSION),
    Type.Literal(NormalClaimKinds.CLAIM),
])

export const NormalClaimKindsSchema = Type.Union([
    NormalClaimChildKindsSchema,
    NormalClaimLogicalKindsSchema,
])
export type TNormalClaimKinds = Static<typeof NormalClaimKindsSchema>

// Identity / lineage fields shared by all variants, with digest inherited.
const ClaimSharedFieldsSchema = Type.Interface(
    [ClaimMetadataFieldsSchema],
    {
        id: UUID,
        argumentId: UUID,
        version: Type.Number(),
        claimForkId: Nullable(UUID),
        creatorId: UUID,
        createdOn: EncodableDate,
        parentId: Nullable(UUID),
    }
)

export const NormalClaimSchema = Type.Interface(
    [ClaimSharedFieldsSchema, MutableClaimFieldsSchema],
    {
        type: CoreClaimNormalTypeSchema,
        kind: NormalClaimKindsSchema,
        url: Type.Null(),
        citation: Type.Null(),
        citationContentHash: Type.Null(),
        axiom: Type.Null(),
    }
)
export type TNormalClaim = Static<typeof NormalClaimSchema>

export const CitationClaimSchema = Type.Interface(
    [ClaimSharedFieldsSchema],
    {
        type: CoreClaimCitationTypeSchema,
        kind: Type.Null(),
        title: Type.Null(),
        body: Type.Null(),
        titleContentHash: Type.Null(),
        url: Type.String(),
        citation: IEEEReferenceSchema,
        citationContentHash: Type.String(),
        axiom: Type.Null(),
    }
)
export type TCitationClaim = Static<typeof CitationClaimSchema>

export const AxiomaticClaimSchema = Type.Interface(
    [ClaimSharedFieldsSchema],
    {
        type: CoreClaimAxiomaticTypeSchema,
        kind: Type.Null(),
        title: Type.Null(),
        body: Type.Null(),
        titleContentHash: Type.Null(),
        url: Type.Null(),
        citation: Type.Null(),
        citationContentHash: Type.Null(),
        axiom: AxiomKindSchema,
    }
)
export type TAxiomaticClaim = Static<typeof AxiomaticClaimSchema>

export const ClaimSchema = Type.Union([
    NormalClaimSchema,
    CitationClaimSchema,
    AxiomaticClaimSchema,
])
export type TClaim = Static<typeof ClaimSchema>

export function isNormalClaim(claim: TClaim): claim is TNormalClaim {
    return claim.type === "normal"
}
export function isCitationClaim(claim: TClaim): claim is TCitationClaim {
    return claim.type === "citation"
}
export function isAxiomaticClaim(claim: TClaim): claim is TAxiomaticClaim {
    return claim.type === "axiomatic"
}

// Re-based on NormalClaimSchema. Server's getClaims() filters by
// type='normal' before populating childClaimIds/childCitationIds, so this
// type accurately describes only Normal-with-children rows.
export const ClaimWithChildrenSchema = Type.Interface(
    [NormalClaimSchema],
    {
        childClaimIds: Type.Array(UUID),
        childCitationIds: Type.Array(UUID),
    }
)
export type TClaimWithChildren = Static<typeof ClaimWithChildrenSchema>
