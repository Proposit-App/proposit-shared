import Type, { type Static } from "typebox"
import { CoreClaimCitationSchema } from "@proposit/proposit-core"
import { EncodableDate, UUID } from "../common.js"

export const ClaimCitationSchema = Type.Intersect([
    CoreClaimCitationSchema,
    Type.Object({
        argumentId: UUID,
        version: Type.Number(),
        createdOn: EncodableDate,
    }),
])
export type TClaimCitation = Static<typeof ClaimCitationSchema>
