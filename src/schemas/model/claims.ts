import Type, { type Static } from "typebox"
import { EncodableDate, Nullable, UUID } from "../common.js"

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

export const ClaimTypes = {
    CLAIM: "claim",
    CONCLUSION: "conclusion",
    DEFINITION: "definition",
    CRITERION: "criterion",
} as const

const ChildClaimTypes = Type.Union([
    Type.Literal(ClaimTypes.DEFINITION),
    Type.Literal(ClaimTypes.CRITERION),
])

const LogicalClaimTypes = Type.Union([
    Type.Literal(ClaimTypes.CONCLUSION),
    Type.Literal(ClaimTypes.CLAIM),
])

export const ClaimTypesSchema = Type.Union([ChildClaimTypes, LogicalClaimTypes])
export type TClaimTypesSchema = Static<typeof ClaimTypesSchema>

export const ClaimSchema = Type.Interface([ClaimUpdateRequestSchema], {
    id: UUID,
    argumentId: UUID,
    version: Type.Number(),
    claimForkId: Nullable(UUID),
    creatorId: UUID,
    createdOn: EncodableDate,
    type: Type.Union([ChildClaimTypes, LogicalClaimTypes]),
    parentId: Nullable(UUID),
    titleContentHash: Type.Optional(Nullable(Type.String())),
})
export type TClaim = Static<typeof ClaimSchema>

export const ClaimWithChildrenSchema = Type.Interface([ClaimSchema], {
    childClaimIds: Type.Array(UUID),
    childSourceIds: Type.Array(UUID),
})
export type TClaimWithChildren = Static<typeof ClaimWithChildrenSchema>
