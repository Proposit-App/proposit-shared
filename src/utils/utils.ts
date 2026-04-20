import {
    ErrorResponseSchema,
    type ParsedError,
    type ParsedSuccess,
} from "../schemas/common.js"
import type { JsonObject, JsonValue } from "../schemas/common.js"
import type { Static, TSchema } from "typebox"
import { Value } from "typebox/value"

export async function awaitableSleep(timeout: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout)
    })
}

export function stringToColor(str: string) {
    if (str === "?") {
        return "#bdbdbd"
    }

    let hash = 0
    let i

    for (i = 0; i < str.length; i += 1) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }

    let color = "#"

    for (i = 0; i < 3; i += 1) {
        // Multiply by 2 to make brighter
        const value = ((hash >> (i * 8)) * 2) & 0xff
        color += `00${value.toString(16)}`.slice(-2)
    }

    return color
}

export async function parseRequest<T extends TSchema>(
    request: Request,
    schema: T
): Promise<Static<T>> {
    const json = (await request.json()) as JsonValue
    const converted = Value.Convert(schema, json)
    return Value.Parse(schema, converted)
}

export async function parseResponse<T extends TSchema>(
    response: Response,
    schema: T
): Promise<ParsedSuccess<T> | ParsedError<typeof ErrorResponseSchema>>
export async function parseResponse<T extends TSchema, E extends TSchema>(
    response: Response,
    schema: T,
    errorSchema: E
): Promise<ParsedSuccess<T> | ParsedError<E>>
export async function parseResponse<T extends TSchema, E extends TSchema>(
    response: Response,
    schema: T,
    errorSchema?: E
): Promise<ParsedSuccess<T> | ParsedError<E | typeof ErrorResponseSchema>> {
    const data = (await response.json()) as JsonValue

    if (!response.ok) {
        const errSchema = errorSchema ?? ErrorResponseSchema
        const parsedError = Value.Parse(errSchema, data)
        return { error: parsedError, ok: false }
    }

    try {
        // Convert first to handle custom Type.Base types (e.g. EncodableDate)
        // whose Convert method is not called by Value.Parse directly
        const converted = Value.Convert(schema, data)
        const parsed = Value.Parse(schema, converted) satisfies Static<T>
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
