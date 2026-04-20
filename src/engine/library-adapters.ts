import type { TClaimLookup, TSourceLookup } from "@proposit/proposit-core"
import {
    createLookup,
    EMPTY_CLAIM_LOOKUP,
    EMPTY_SOURCE_LOOKUP,
    EMPTY_CLAIM_SOURCE_LOOKUP,
} from "@proposit/proposit-core"

export function createClaimLookup(
    claims: { id: string; version: number }[]
): TClaimLookup {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return createLookup(claims, (c) => `${c.id}:${c.version}`) as any
}

export function createSourceLookup(
    sources: { id: string; version?: number }[]
): TSourceLookup {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
    return createLookup(sources, (s) => `${s.id}:${s.version ?? 1}`) as any
}

export { EMPTY_CLAIM_LOOKUP, EMPTY_SOURCE_LOOKUP, EMPTY_CLAIM_SOURCE_LOOKUP }
