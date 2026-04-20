import Type, { type Static } from "typebox"
import { IEEEReferenceSchema } from "./references.js"
import { EncodableDate, JsonObjectSchema, Nullable, UUID } from "../common.js"

export const SourceSchema = Type.Object({
    id: UUID,
    url: Nullable(Type.String()),
    citation: IEEEReferenceSchema,
    createdOn: EncodableDate,
    creatorId: UUID,
    citationContentHash: Type.Optional(Nullable(Type.String())),
})
export type TSource = Static<typeof SourceSchema>

export const SourceSchemaNotStrict = Type.Object({
    id: UUID,
    url: Nullable(Type.String()),
    citation: JsonObjectSchema,
    createdOn: EncodableDate,
    creatorId: UUID,
    citationContentHash: Type.Optional(Nullable(Type.String())),
})
export type TSourceNotStrict = Static<typeof SourceSchemaNotStrict>

export const ClaimSourceSchema = Type.Object({
    claimId: UUID,
    sourceId: UUID,
    argumentId: UUID,
    version: Type.Number(),
    createdOn: EncodableDate,
})
export type TClaimSource = Static<typeof ClaimSourceSchema>
