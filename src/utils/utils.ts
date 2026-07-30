import {
    ErrorResponseSchema,
    type ParsedError,
    type ParsedSuccess,
} from "../schemas/common.js"
import type { JsonObject, JsonValue } from "../schemas/common.js"
import { GrammarViolationsResponseSchema } from "../schemas/api/grammar-violations.js"
import { MutationConflictResponseSchema } from "../schemas/api/mutation-conflict.js"
import type { Static, TSchema } from "typebox"
import { Value } from "typebox/value"

export async function awaitableSleep(timeout: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout)
    })
}

/** WCAG 2.x relative luminance of an `#rrggbb` colour. */
function relativeLuminance(hex: string): number {
    const [r, g, b] = [0, 2, 4]
        .map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * The ink that keeps an arbitrary fill legible.
 *
 * Two properties here look arbitrary and are not:
 *
 * - The inks are **absolute**, never palette tokens. The fill is derived from a
 *   string, not from the colour scheme, so the ink must not vary with the
 *   scheme either — a scheme-dependent ink is exactly the defect this replaces,
 *   just pointing the other way.
 * - The **full** black/white range is load-bearing. The darkest palette ink
 *   (`#0d0e0b`) bottoms out at 4.40:1 against mid-luminance fills, under the
 *   4.5:1 AA floor; pure black/white holds 4.58:1 across the whole colour cube.
 */
function inkFor(fill: string): "#000000" | "#ffffff" {
    // Crossover luminance at which black and white contrast equally against the
    // fill: (L + 0.05)² = 1.05 × 0.05.
    return relativeLuminance(fill) > 0.1791 ? "#000000" : "#ffffff"
}

/**
 * Hash a string into a fill colour, paired with an ink that stays readable on
 * it.
 *
 * The pair is returned together because the fill alone is not usable: it is an
 * arbitrary hash, so a caller that sets only the background leaves the
 * foreground inheriting whatever the surrounding scheme provides, and roughly
 * half of all inputs come out illegible in each scheme.
 */
export function stringToColor(str: string): { fill: string; ink: string } {
    if (str === "?") {
        return { fill: "#bdbdbd", ink: inkFor("#bdbdbd") }
    }

    let hash = 0
    let i

    for (i = 0; i < str.length; i += 1) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }

    let fill = "#"

    for (i = 0; i < 3; i += 1) {
        // Multiply by 2 to make brighter
        const value = ((hash >> (i * 8)) * 2) & 0xff
        fill += `00${value.toString(16)}`.slice(-2)
    }

    return { fill, ink: inkFor(fill) }
}

export async function parseRequest<T extends TSchema>(
    request: Request,
    schema: T
): Promise<Static<T>> {
    const json = (await request.json()) as JsonValue
    // Assert before decoding, and do not use Parse.
    //
    // Decode is required because EncodableDate rehydrates wire strings into
    // `Date` instances in the decode pass, which Parse does not run. But
    // Decode's own pipeline applies each schema's `default` before validating,
    // so on its own it accepts a body with a required key omitted and silently
    // fills the default in — turning a malformed request into a successful one.
    // Asserting first rejects the omitted key, which is what a request body
    // needs: a caller that leaves a field out is making a mistake, not opting
    // into a default.
    //
    // The decoded and encoded static types coincide for every schema here —
    // EncodableDate is the only decoding type and it decodes to the `Date` it
    // already infers as — but TypeScript cannot prove that for an unresolved `T`.
    Value.Assert(schema, json)
    return Value.Decode(schema, json) as Static<T>
}

// Default (2-arg) form: the error half widens to include the
// `GrammarViolationsResponseSchema` envelope. When a callsite hits a server
// endpoint that fails its grammar-tier gate (submit/save in assistive, publish
// in either mode), the server returns HTTP 422 with `{ error: "GRAMMAR_VIOLATIONS",
// tier, violations }` (see `proposit-shared/src/schemas/api/grammar-violations.ts`
// and the 422-envelope research at `docs/research/proposit-server/422-envelope-sketch.md`).
//
// Pre-0.11 behavior parsed all non-`ok` bodies as `TErrorResponse` and threw
// "Error: Parse" on the 422 envelope because its shape diverges from
// `ErrorResponseSchema`. 0.11 detects the 422-with-GRAMMAR_VIOLATIONS body at
// runtime and returns it as `ParsedError<typeof GrammarViolationsResponseSchema>`.
// A 409-with-MUTATION_CONFLICT body is detected the same way and returned as
// `ParsedError<typeof MutationConflictResponseSchema>` (publish/archive conflicts;
// see `proposit-shared/src/schemas/api/mutation-conflict.ts`). Non-matching
// failures continue to parse as `TErrorResponse`, preserving the existing surface.
export async function parseResponse<T extends TSchema>(
    response: Response,
    schema: T
): Promise<
    | ParsedSuccess<T>
    | ParsedError<typeof ErrorResponseSchema>
    | ParsedError<typeof GrammarViolationsResponseSchema>
    | ParsedError<typeof MutationConflictResponseSchema>
>
// Explicit-error-schema (3-arg) form: caller supplies the error schema. This
// overload is unchanged from 0.10 — callers that opt in to a specific error
// shape keep their narrower return type and bypass the GRAMMAR_VIOLATIONS
// auto-detect. If a caller wants both, they can compose `errorSchema` as a
// `Type.Union([ErrorResponseSchema, GrammarViolationsResponseSchema])`.
export async function parseResponse<T extends TSchema, E extends TSchema>(
    response: Response,
    schema: T,
    errorSchema: E
): Promise<ParsedSuccess<T> | ParsedError<E>>
export async function parseResponse<T extends TSchema, E extends TSchema>(
    response: Response,
    schema: T,
    errorSchema?: E
): Promise<
    | ParsedSuccess<T>
    | ParsedError<E | typeof ErrorResponseSchema>
    | ParsedError<typeof GrammarViolationsResponseSchema>
    | ParsedError<typeof MutationConflictResponseSchema>
> {
    const data = (await response.json()) as JsonValue

    if (!response.ok) {
        // Auto-detect the GRAMMAR_VIOLATIONS 422 envelope only when the caller
        // omitted an explicit error schema (default form). Callers that passed
        // their own error schema keep the pre-0.11 single-schema behavior.
        if (
            errorSchema === undefined &&
            response.status === 422 &&
            Value.Check(GrammarViolationsResponseSchema, data)
        ) {
            const parsedViolations = Value.Parse(
                GrammarViolationsResponseSchema,
                data
            )
            return { error: parsedViolations, ok: false }
        }

        // Auto-detect the MUTATION_CONFLICT 409 envelope (publish/archive
        // state conflicts). Same default-form-only gate as grammar-violations:
        // callers with an explicit error schema keep the single-schema behavior.
        if (
            errorSchema === undefined &&
            response.status === 409 &&
            Value.Check(MutationConflictResponseSchema, data)
        ) {
            const parsedConflict = Value.Parse(
                MutationConflictResponseSchema,
                data
            )
            return { error: parsedConflict, ok: false }
        }

        const errSchema = errorSchema ?? ErrorResponseSchema
        const parsedError = Value.Parse(errSchema, data)
        return { error: parsedError, ok: false }
    }

    try {
        // Assert before decoding, for the reason spelled out on parseRequest:
        // Decode applies each schema's `default` before validating, so alone it
        // would accept a response with a required field missing and invent the
        // value. A response that does not match its schema is a server bug, and
        // quietly defaulting it hides that bug from the client.
        Value.Assert(schema, data)
        const parsed = Value.Decode(schema, data) as Static<T>
        return { value: parsed, ok: true }
    } catch (e) {
        console.error("Error parsing response", e, data)
        for (const err of Value.Errors(schema, data)) {
            console.error(err)
        }
        throw e
    }
}

export function createUrlWithParameters<T extends TSchema>(
    urlString: string,
    data: Static<T>,
    schema: T,
    baseUrl?: string
) {
    Value.Assert(schema, data)
    const globalWindow = (
        globalThis as { window?: { location: { origin: string } } }
    ).window
    const url = new URL(urlString, baseUrl ?? globalWindow?.location.origin)
    Object.entries(data as JsonObject).forEach(([key, value]) => {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        url.searchParams.set(key, String(value))
    })
    return url
}

export async function strictFetch<T extends TSchema, R extends TSchema>(
    uri: Parameters<typeof fetch>[0],
    init: Omit<RequestInit, "body">,
    payload: JsonObject | undefined,
    requestSchema: T | undefined,
    responseSchema: R,
    fetchFn = fetch
) {
    if (payload !== undefined) {
        Value.Assert(requestSchema!, payload)
    }
    const resp = await fetchFn(uri, {
        ...init,
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
    })

    return await parseResponse(resp, responseSchema)
}

export function getFirstDayOfNextMonth() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-based (0 = January)

    // If December, increment year and set month to January
    const nextMonth = (month + 1) % 12
    const nextYear = month === 11 ? year + 1 : year

    return new Date(nextYear, nextMonth, 1)
}

type TDefaultValueFactory<K, V> = (key?: K) => V
export class DefaultMap<K, V> extends Map<K, V> {
    private mkDefault: TDefaultValueFactory<K, V>
    private limit: number

    constructor(
        mkDefault: TDefaultValueFactory<K, V>,
        entries?: Iterable<[K, V]>,
        limit = -1
    ) {
        /**
         * mkDefault is a function which (optionally) takes one argument, a value passed as the key,
         * and returns a value which to use if that key is not present in the map. The function may
         * throw an error if the key is invalid or forbidden to limit the scope of values in the map.
         */
        super(entries)
        this.mkDefault = mkDefault
        this.limit = limit
    }

    public get(key: K): V {
        if (!this.has(key)) {
            this.set(key, this.mkDefault(key))
        }
        return super.get(key)!
    }

    public set(key: K, value: V) {
        if (this.limit >= 0 && this.size + 1 >= this.limit) {
            // Remove the oldest entry when the limit is reached
            // This implementation uses the first entry, which is the oldest in insertion order
            const oldestKey = this.keys().next().value
            if (oldestKey !== undefined) this.delete(oldestKey)
        }
        return super.set(key, value)
    }
}
