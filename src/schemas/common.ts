// Inherited from proposit-server. Legacy names (DateType, ParsedSuccess,
// ParsedError, ParsedReply, JsonPrimitive, JsonValue, JsonObject, JsonArray,
// UUID) predate the brain-style naming rules; renaming cascades through every
// server consumer. Tracked as tech debt for a dedicated follow-up.
/* eslint-disable @typescript-eslint/naming-convention */
import { type Static, type TSchema } from "typebox"
import { Type } from "typebox"

// Re-export schemas that produce standard JSON schema objects (safe across TypeBox instances)
export { Nullable } from "@proposit/proposit-core"
import { UUID as _UUID } from "@proposit/proposit-core"
export const UUID = _UUID

// Custom TypeBox types must be defined locally because TypeBox resolves a
// type's identity structurally against the copy of the library that built it,
// so a type imported across separate pnpm copies fails Value.Check/Parse.

/**
 * Normalizes a `Date` or its serialized form to a `Date`.
 *
 * Only date strings are treated as a serialized date — the form
 * `JSON.stringify` produces. Numbers are rejected so that a numeric field
 * mistakenly supplied where a date belongs still fails validation.
 */
function toDate(value: unknown): Date | undefined {
    if (value instanceof Date) return value
    if (typeof value !== "string") return undefined
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * Creates a new {@link TDateType} schema instance.
 *
 * The schema admits a `Date` or its serialized date string. `Value.Decode`
 * normalizes either into a `Date`; `Value.Encode` leaves `Date` instances in
 * place so `JSON.stringify` renders them as ISO strings.
 */
export function DateType() {
    return Type.Codec(
        Type.Refine(
            Type.Unsafe<Date>({}),
            (value: unknown) => toDate(value) !== undefined,
            () => "Invalid date"
        )
    )
        .Decode((value: unknown): Date => {
            const date = toDate(value)
            if (date === undefined)
                throw new Error("Cannot convert value to Date")
            return date
        })
        .Encode((value: Date) => value)
}
/** TypeBox type that validates and decodes `Date` values. */
export type TDateType = ReturnType<typeof DateType>
export const EncodableDate = DateType()

// These schemas embed EncodableDate so must also be defined locally
export const JsonPrimitiveSchema = Type.Union([
    Type.String(),
    Type.Number(),
    Type.Boolean(),
    Type.Null(),
    EncodableDate,
])
export const JsonValueSchema = Type.Cyclic(
    {
        JsonValueSchema: Type.Union([
            Type.Record(Type.String(), Type.Ref("JsonValueSchema")),
            Type.Array(Type.Ref("JsonValueSchema")),
            Type.String(),
            Type.Number(),
            Type.Boolean(),
            Type.Null(),
            EncodableDate,
        ]),
    },
    "JsonValueSchema"
)
export const JsonObjectSchema = Type.Record(Type.String(), Type.Any())
export const JsonArraySchema = Type.Array(JsonValueSchema)

export const ErrorResponseSchema = Type.Object({
    errorID: Type.Number({
        description: "A unique identifier for the error.",
    }),
    errorMessage: Type.String({
        description: "A message describing the error that occurred.",
    }),
    statusCode: Type.Number(),
    errorCode: Type.Optional(
        Type.String({
            description:
                "Optional machine-readable error code (e.g. a retry-refusal " +
                "reason) so clients can branch on a stable discriminant " +
                "instead of parsing errorMessage. Additive/optional: a " +
                "response that omits it stays valid.",
        })
    ),
})
export type TErrorResponse = Static<typeof ErrorResponseSchema>

export interface ParsedSuccess<T extends TSchema> {
    ok: true
    value: Static<T>
}
export interface ParsedError<E extends TSchema> {
    ok: false
    error: Static<E>
}
export type ParsedReply<
    T extends TSchema,
    E extends TSchema = typeof ErrorResponseSchema,
> = ParsedSuccess<T> | ParsedError<E>

export const RedirectParamsSchema = Type.Object({
    event: Type.String(),
    returnTo: Type.String(),
})
export type TRedirectParams = Static<typeof RedirectParamsSchema>

// Manual implementation workaround for TypeBox cyclic Static issue
// see: https://github.com/sinclairzx81/typebox/issues/1356
export type JsonPrimitive = Static<typeof JsonPrimitiveSchema>
export type JsonValue =
    | JsonPrimitive
    | { [key: string]: JsonValue }
    | JsonValue[]
export type JsonObject = Record<string, JsonValue>
export type JsonArray = JsonValue[]
export type UUID = Static<typeof _UUID>
