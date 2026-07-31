import Type, { type Static } from "typebox"
import {
    OriginAnchorSchema,
    OriginDocumentSchema,
    OriginLinkSchema,
    OriginStanceSchema,
} from "../../model/origin.js"
import {
    IEEEReferenceSchema,
    UnparsedCitationSchema,
} from "../../model/references.js"

/**
 * Response body for `GET /api/v1/argument/[argumentId]/[version]/origin`.
 *
 * Feeds `PropositArgumentEngine.fromServerData`'s fourth parameter directly —
 * that parameter accepts `null` as well as absence precisely so this body
 * needs no reshaping. `document` and `link` are `null` on an argument with no
 * source text, because JSON cannot carry `undefined`; the snapshot's `origin`
 * slice only ever exposes `undefined`.
 */
export const GetOriginResponseSchema = Type.Object({
    document: Type.Union([OriginDocumentSchema, Type.Null()]),
    link: Type.Union([OriginLinkSchema, Type.Null()]),
    anchors: Type.Array(OriginAnchorSchema),
})
export type TGetOriginResponse = Static<typeof GetOriginResponseSchema>

/**
 * Request body for `POST /api/v1/argument/[argumentId]/[version]/origin` —
 * attaching a source text.
 *
 * The client sends the raw pasted `text`; the server normalizes it, digests
 * the result, and enforces the tier's `maxSourceTextChars` /
 * `maxStoredSourceTextChars` on the normalized form. Neither the digest nor
 * the normalized text travels on the request, because a client-supplied
 * digest is a claim the server would have to re-derive anyway.
 *
 * `stance` defaults to `seed` server-side: `representation` is a fidelity
 * claim about someone else's text and is never assumed.
 */
export const AttachOriginDocumentRequestSchema = Type.Object({
    text: Type.String(),
    stance: Type.Optional(OriginStanceSchema),
    reference: Type.Optional(
        Type.Union([IEEEReferenceSchema, UnparsedCitationSchema])
    ),
})
export type TAttachOriginDocumentRequest = Static<
    typeof AttachOriginDocumentRequestSchema
>

/**
 * Request body for `PATCH /api/v1/argument/[argumentId]/[version]/origin`.
 *
 * Stance and attribution share one endpoint because they are two single-field
 * edits to the same document/link pair; splitting them is where two surfaces
 * onto one resource drift. An omitted key leaves that field untouched; a
 * `reference` of `null` clears the attribution.
 */
export const UpdateOriginRequestSchema = Type.Object({
    stance: Type.Optional(OriginStanceSchema),
    reference: Type.Optional(
        Type.Union([IEEEReferenceSchema, UnparsedCitationSchema, Type.Null()])
    ),
})
export type TUpdateOriginRequest = Static<typeof UpdateOriginRequestSchema>

/**
 * Request body for
 * `POST /api/v1/argument/[argumentId]/[version]/origin/anchors`.
 *
 * A human-drawn anchor: the reader selected a range, so the **positions are
 * authoritative** and the server derives `exact` (and any surrounding
 * context) by slicing the document at those code-point offsets. The
 * pipeline-produced direction is the reverse and does not travel this route.
 *
 * **The server must reject `endCodePoint <= startCodePoint`, and any span
 * that runs past the end of the document.** Neither is expressible here:
 * JSON Schema has no cross-field comparison, and the document length is not
 * in the request at all. `Type.Refine` looks like it would carry the first
 * one, but in typebox 1.3.8 a `~refine` predicate is ignored by `Value.Check`,
 * `Value.Parse`, and `Value.Assert` alike — encoding the rule that way would
 * assert a constraint that runs nowhere, which is worse than stating it here.
 * `endCodePoint` carries `minimum: 1` because a zero-length span is degenerate
 * regardless of where it starts, and that much a schema can say.
 */
export const CreateOriginAnchorRequestSchema = Type.Object({
    targetType: Type.Index(OriginAnchorSchema, Type.Literal("targetType")),
    targetId: Type.String(),
    startCodePoint: Type.Integer({ minimum: 0 }),
    endCodePoint: Type.Integer({ minimum: 1 }),
})
export type TCreateOriginAnchorRequest = Static<
    typeof CreateOriginAnchorRequestSchema
>

/**
 * Request body for the two enthymeme routes —
 * `PATCH …/premise/[premiseId]/enthymeme` and
 * `PATCH …/expression/[expressionId]/enthymeme`.
 *
 * `marked: false` **deletes** the field rather than storing `false`. A present
 * `enthymeme` key changes the entity's checksum, so the unmarked state must be
 * the absence of the key, never a falsy value in it.
 */
export const MarkEnthymemeRequestSchema = Type.Object({
    marked: Type.Boolean(),
})
export type TMarkEnthymemeRequest = Static<typeof MarkEnthymemeRequestSchema>

/**
 * Response body for `DELETE …/origin`.
 *
 * A body rather than a bare 204 so the client can route the response through
 * `parseResponse` and see a 401/403/404/409 instead of mistaking it for
 * success. `detachedAnchorIds` names the anchors that went with the document —
 * a detach always takes them, and a UI rolling back an optimistic removal
 * needs to know which highlights disappeared.
 */
export const DetachOriginResponseSchema = Type.Object({
    detachedDocumentId: Type.Union([Type.String(), Type.Null()]),
    detachedAnchorIds: Type.Array(Type.String()),
})
export type TDetachOriginResponse = Static<typeof DetachOriginResponseSchema>

/** Response body for `DELETE …/origin/anchors/[anchorId]`. */
export const DeleteOriginAnchorResponseSchema = Type.Object({
    deletedAnchorId: Type.String(),
})
export type TDeleteOriginAnchorResponse = Static<
    typeof DeleteOriginAnchorResponseSchema
>
