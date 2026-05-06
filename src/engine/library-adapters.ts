import type { TClaimLookup } from "@proposit/proposit-core"
import {
    createLookup,
    EMPTY_CLAIM_LOOKUP,
    EMPTY_CLAIM_CITATION_LOOKUP,
} from "@proposit/proposit-core"

export function createClaimLookup(
    claims: { id: string; version: number }[]
): TClaimLookup {
    const inner = createLookup(claims, (c) => `${c.id}:${c.version}`)
    const latestById = new Map<string, { id: string; version: number }>()
    for (const c of claims) {
        const existing = latestById.get(c.id)
        if (!existing || c.version > existing.version) {
            latestById.set(c.id, c)
        }
    }
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        get: (id, version) => inner.get(id, version) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        getCurrent: (id) => latestById.get(id) as any,
    }
}

export { EMPTY_CLAIM_LOOKUP, EMPTY_CLAIM_CITATION_LOOKUP }
