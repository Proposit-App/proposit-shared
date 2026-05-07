import Type, { type Static } from "typebox"
import { EncodableDate, Nullable, UUID } from "../common.js"
import { IEEEReferenceSchema } from "./references.js"

export const MutableClaimFieldsSchema = Type.Object({
    title: Type.String(),
    body: Type.String(),
})
export type TMutableClaimFields = Static<typeof MutableClaimFieldsSchema>

export const ClaimUpdateRequestSchema = Type.Interface(
    [MutableClaimFieldsSchema],
    {
        digest: Type.String(),
    }
)
export type TClaimUpdateFields = Static<typeof ClaimUpdateRequestSchema>

export const ClaimKinds = {
    CLAIM: "claim",
    CONCLUSION: "conclusion",
    DEFINITION: "definition",
    CRITERION: "criterion",
} as const

const ChildClaimKinds = Type.Union([
    Type.Literal(ClaimKinds.DEFINITION),
    Type.Literal(ClaimKinds.CRITERION),
])

const LogicalClaimKinds = Type.Union([
    Type.Literal(ClaimKinds.CONCLUSION),
    Type.Literal(ClaimKinds.CLAIM),
])

export const ClaimKindsSchema = Type.Union([ChildClaimKinds, LogicalClaimKinds])
export type TClaimKindsSchema = Static<typeof ClaimKindsSchema>

export const ClaimTypeSchema = Type.Union([
    Type.Literal("normal"),
    Type.Literal("citation"),
])
export type TClaimType = Static<typeof ClaimTypeSchema>

export const ClaimSchema = Type.Interface([ClaimUpdateRequestSchema], {
    id: UUID,
    argumentId: UUID,
    version: Type.Number(),
    claimForkId: Nullable(UUID),
    creatorId: UUID,
    createdOn: EncodableDate,
    kind: Type.Union([ChildClaimKinds, LogicalClaimKinds]),
    type: ClaimTypeSchema,
    parentId: Nullable(UUID),
    titleContentHash: Type.Optional(Nullable(Type.String())),
    // Citation-extra fields. Optional at the schema level; consumer code
    // populates these on claims with type === "citation".
    url: Type.Optional(Nullable(Type.String())),
    citation: Type.Optional(Nullable(IEEEReferenceSchema)),
    citationContentHash: Type.Optional(Nullable(Type.String())),
})
export type TClaim = Static<typeof ClaimSchema>

export const ClaimWithChildrenSchema = Type.Interface([ClaimSchema], {
    childClaimIds: Type.Array(UUID),
    childCitationIds: Type.Array(UUID),
})
export type TClaimWithChildren = Static<typeof ClaimWithChildrenSchema>
