import Type, { type Static } from "typebox"
import {
    CoreOriginAnchorSchema,
    CoreOriginDocumentSchema,
    CoreOriginLinkSchema,
    OriginAnchorTargetTypeSchema,
    OriginSegmentSchema,
    OriginStanceSchema,
} from "@proposit/proposit-core"
import { EncodableDate, UUID } from "../common.js"
import { IEEEReferenceSchema, UnparsedCitationSchema } from "./references.js"

// The stance, target-type, and segment schemas are re-exported unchanged so a
// consumer has one import path for the whole origin wire format, the same way
// `schemas/grammar` re-exports core's grammar wire format.
export { OriginAnchorTargetTypeSchema, OriginSegmentSchema, OriginStanceSchema }
export type TOriginStance = Static<typeof OriginStanceSchema>
export type TOriginAnchorTargetType = Static<
    typeof OriginAnchorTargetTypeSchema
>
export type TOriginSegment = Static<typeof OriginSegmentSchema>

/**
 * A source text an argument was built from.
 *
 * `creatorId` carries the owner, without which neither same-owner
 * deduplication nor the per-user aggregate storage limit is computable.
 * `reference` is the optional attribution to a real, publicly reachable
 * document — the same structured reference a citation claim carries. Setting
 * it leaves the document's entity checksum unchanged, because that checksum
 * covers the content `digest` rather than the open properties.
 */
export const OriginDocumentSchema = Type.Intersect([
    CoreOriginDocumentSchema,
    Type.Object({
        creatorId: UUID,
        createdOn: EncodableDate,
        reference: Type.Optional(
            Type.Union([IEEEReferenceSchema, UnparsedCitationSchema])
        ),
    }),
])
export type TOriginDocument = Static<typeof OriginDocumentSchema>

/**
 * Attaches one document to one argument version, carrying the stance that
 * decides whether the *absence* of provenance is meaningful.
 */
export const OriginLinkSchema = Type.Intersect([
    CoreOriginLinkSchema,
    Type.Object({
        createdOn: EncodableDate,
    }),
])
export type TOriginLink = Static<typeof OriginLinkSchema>

/**
 * The span of a document one argument part derives from. Positions are
 * Unicode code-point offsets into the document's normalized text — slice them
 * with core's `sliceByCodePoints`, never `String.prototype.slice`.
 */
export const OriginAnchorSchema = Type.Intersect([
    CoreOriginAnchorSchema,
    Type.Object({
        createdOn: EncodableDate,
    }),
])
export type TOriginAnchor = Static<typeof OriginAnchorSchema>
