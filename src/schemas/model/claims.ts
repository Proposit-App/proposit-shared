import Type, { type Static } from "typebox"
import { EncodableDate, Nullable, UUID } from "../common.js"
import { IEEEReferenceSchema, UnparsedCitationSchema } from "./references.js"
import {
    CoreClaimAxiomaticTypeSchema,
    CoreClaimCitationTypeSchema,
    CoreClaimNormalTypeSchema,
    CoreClaimTypeSchema,
} from "@proposit/proposit-core"

// Claim-fork provenance type lives in forks.ts; re-export it here (the
// claim-related entry point) so consumers can import it through the package,
// paralleling the ArgumentForkSchema re-export in arguments.ts.
export { ClaimForkSchema, type TClaimFork } from "./forks.js"

// Re-export aliases so consumers that imported ClaimTypeSchema / TClaimType
// from @proposit/shared/schemas keep working without code edits.
export const ClaimTypeSchema = CoreClaimTypeSchema
export type TClaimType = Static<typeof ClaimTypeSchema>

export const AxiomKindSchema = Type.Union([
    Type.Literal("definition", {
        description:
            "The claim is true because of what the relevant words, categories, or concepts mean.",
    }),
    Type.Literal("stipulation", {
        description:
            "Assumed locally for this argument; the argument defines or postulates it for its own purposes.",
    }),
    Type.Literal("logical-principle", {
        description:
            "A basic principle of valid reasoning (for example, modus ponens or non-contradiction).",
    }),
    Type.Literal("mathematical-principle", {
        description:
            "A basic mathematical identity, axiom, or quantitative rule.",
    }),
    Type.Literal("domain-rule", {
        description:
            "Comes from a rule, standard, contract, doctrine, protocol, or authority internal to a system.",
    }),
    Type.Literal("background-assumption", {
        description:
            "A foundational premise the argument relies on but does not prove.",
    }),
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
const ClaimSharedFieldsSchema = Type.Interface([ClaimMetadataFieldsSchema], {
    id: UUID,
    // Provenance only: the argument this claim was first created in. A claim is
    // an independently-versioned entity shared by reference across arguments, so
    // it is no longer owned by one argument — this is nullable and records where
    // it originated, not where it lives. (Replaces the former `argumentId`,
    // which keyed claims to a single argument.)
    originArgumentId: Nullable(UUID),
    // The claim's OWN trunk version, independent of any argument version. It
    // advances only when this claim's content changes; it is NOT a denormalized
    // copy of the referencing argument's version. Different arguments may pin
    // different versions of the same claim.
    version: Type.Number(),
    // Per-claim-version publish state. A `v0` draft is unpublished (`false`);
    // a version becomes published as a side-effect of its argument's publish.
    published: Type.Boolean(),
    // Timestamp this claim version was published; null while unpublished.
    publishedOn: Nullable(EncodableDate),
    claimForkId: Nullable(UUID),
    creatorId: UUID,
    createdOn: EncodableDate,
    parentId: Nullable(UUID),
})

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

export const CitationClaimSchema = Type.Interface([ClaimSharedFieldsSchema], {
    type: CoreClaimCitationTypeSchema,
    kind: Type.Null(),
    title: Type.Null(),
    body: Type.Null(),
    titleContentHash: Type.Null(),
    url: Type.String(),
    // Full IEEE references and ingestion-extracted unparsed citations both
    // attach here; null is the url-only citation claim (a `url` column with no
    // structured reference). The single `type` discriminant — the 33 IEEE
    // literals vs `"unparsed"` — keeps the union unambiguous, and the `url`
    // string is what distinguishes a citation claim from the normal/axiomatic
    // branches, so a null citation does not collide with them.
    citation: Nullable(
        Type.Union([IEEEReferenceSchema, UnparsedCitationSchema])
    ),
    citationContentHash: Type.String(),
    axiom: Type.Null(),
})
export type TCitationClaim = Static<typeof CitationClaimSchema>

export const AxiomaticClaimSchema = Type.Interface([ClaimSharedFieldsSchema], {
    type: CoreClaimAxiomaticTypeSchema,
    kind: Type.Null(),
    title: Type.Null(),
    body: Type.Null(),
    titleContentHash: Type.Null(),
    url: Type.Null(),
    citation: Type.Null(),
    citationContentHash: Type.Null(),
    axiom: AxiomKindSchema,
})
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

// Union of NormalClaim | AxiomaticClaim with `childClaimIds` /
// `childCitationIds` arrays attached. Citation claims are excluded — they
// have no children of their own (they're leaf citations).
//
// Widened from NormalClaim-only in `@proposit/shared@0.12.1` to admit
// axiomatic claims. Server's `getClaims()` filtered by `type='normal'` in
// pre-axiom releases; the axiom-mutation server work removed that filter
// so axiomatic claims now flow through this surface. The schema follows.
export const ClaimWithChildrenSchema = Type.Union([
    Type.Interface([NormalClaimSchema], {
        childClaimIds: Type.Array(UUID),
        childCitationIds: Type.Array(UUID),
    }),
    Type.Interface([AxiomaticClaimSchema], {
        childClaimIds: Type.Array(UUID),
        childCitationIds: Type.Array(UUID),
    }),
])
export type TClaimWithChildren = Static<typeof ClaimWithChildrenSchema>
