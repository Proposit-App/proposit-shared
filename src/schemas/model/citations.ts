import Type, { type Static } from "typebox"
import { CoreClaimConnectionSchema } from "@proposit/proposit-core"
import { EncodableDate, UUID } from "../common.js"

export const ClaimCitationSchema = Type.Intersect([
    CoreClaimConnectionSchema,
    Type.Object({
        argumentId: UUID,
        createdOn: EncodableDate,
    }),
])
export type TClaimCitation = Static<typeof ClaimCitationSchema>
