import type { UUID } from "../../schemas/common.js"
import type {
    TReviewState,
    TClaimAssignment,
    TOperatorAssignment,
    TReviewResult,
} from "../../schemas/review.js"
import {
    ClaimReasonCodeSchema,
    OperatorReasonCodeSchema,
    ReviewStateSchema,
} from "../../schemas/review.js"
import { Value } from "typebox/value"

// Browser-global access via `globalThis`. `lib: ["ES2022"]` (enforced by the
// shared package) does not include DOM types, but this file needs to call
// browser APIs at runtime — `LocalStorageReviewStore` is browser-only and is
// feature-gated on `typeof window !== "undefined"`. The shape below is the
// narrow surface we actually touch.
interface TBrowserGlobals {
    window?: unknown
    localStorage?: {
        getItem: (key: string) => string | null
        setItem: (key: string, value: string) => void
        removeItem: (key: string) => void
    }
}
const browserGlobals = globalThis as TBrowserGlobals

interface TDOMExceptionLike {
    readonly name: string
    readonly message?: string
}
const isQuotaExceeded = (err: unknown): err is TDOMExceptionLike =>
    typeof err === "object" &&
    err !== null &&
    (err as { name?: unknown }).name === "QuotaExceededError"

export interface TReviewKey {
    argumentId: UUID
    argumentVersion: number
    userId?: UUID
}

export interface TReviewStore {
    load(key: TReviewKey): Promise<TReviewState | undefined>
    save(key: TReviewKey, state: TReviewState): Promise<void>
    upsertClaimAssignment(key: TReviewKey, a: TClaimAssignment): Promise<void>
    upsertOperatorAssignment(
        key: TReviewKey,
        a: TOperatorAssignment
    ): Promise<void>
    saveResult(key: TReviewKey, r: TReviewResult): Promise<void>
    clear(key: TReviewKey): Promise<void>
    /** Public key-derivation helper used by the React provider's cross-tab filter. */
    keyFor(key: TReviewKey): string
}

export class ReviewStorageQuotaError extends Error {
    constructor(message = "localStorage quota exceeded") {
        super(message)
        this.name = "ReviewStorageQuotaError"
    }
}
export class ReviewStorageUnavailableError extends Error {
    constructor(message = "localStorage unavailable") {
        super(message)
        this.name = "ReviewStorageUnavailableError"
    }
}

/**
 * Migrate a raw localStorage payload to the current schema shape.
 * Returns `{ state, migrated }`; caller should re-persist when migrated === true.
 * Silently strips unknown reason codes.
 */
export function migrateReviewState(raw: unknown): {
    state: unknown
    migrated: boolean
} {
    if (!raw || typeof raw !== "object" || !("draft" in raw)) {
        return { state: raw, migrated: false }
    }
    const s = raw as {
        draft: {
            schemaVersion?: number
            claimAssignments?: Record<string, { reasonCode?: string }>
            operatorAssignments?: { reasonCode?: string }[]
        }
    }
    let migrated = false
    for (const a of Object.values(s.draft.claimAssignments ?? {})) {
        if (a.reasonCode && !Value.Check(ClaimReasonCodeSchema, a.reasonCode)) {
            delete a.reasonCode
            migrated = true
        }
    }
    for (const a of s.draft.operatorAssignments ?? []) {
        if (
            a.reasonCode &&
            !Value.Check(OperatorReasonCodeSchema, a.reasonCode)
        ) {
            delete a.reasonCode
            migrated = true
        }
    }
    return { state: raw, migrated }
}

const STORAGE_PREFIX = "proposit.review"

export class LocalStorageReviewStore implements TReviewStore {
    keyFor(k: TReviewKey): string {
        const userSegment = k.userId ?? "anon"
        return `${STORAGE_PREFIX}.${userSegment}.${k.argumentId}.${k.argumentVersion}`
    }

    async load(key: TReviewKey): Promise<TReviewState | undefined> {
        const ls = browserGlobals.localStorage
        if (browserGlobals.window === undefined || !ls) return undefined
        let raw: string | null
        try {
            raw = ls.getItem(this.keyFor(key))
        } catch {
            throw new ReviewStorageUnavailableError()
        }
        if (!raw) return undefined
        try {
            const parsed: unknown = JSON.parse(raw)
            const { state: migrated, migrated: didMigrate } =
                migrateReviewState(parsed)
            // Convert before Parse: EncodableDate's Convert rehydrates ISO strings
            // into Date instances (precedent: src/utils/shared/utils.ts::parseResponse).
            const converted = Value.Convert(ReviewStateSchema, migrated)
            const state = Value.Parse(ReviewStateSchema, converted)
            if (didMigrate) await this.save(key, state)
            return state
        } catch (err) {
            // Corrupted blob: drop it and let caller re-initialize.
            console.warn("review-store: dropping corrupted review state", err)
            await this.clear(key)
            return undefined
        }
    }

    save(key: TReviewKey, state: TReviewState): Promise<void> {
        const ls = browserGlobals.localStorage
        if (browserGlobals.window === undefined || !ls)
            return Promise.reject(new ReviewStorageUnavailableError("SSR"))
        const serialized = Value.Encode(ReviewStateSchema, state)
        try {
            ls.setItem(this.keyFor(key), JSON.stringify(serialized))
            return Promise.resolve()
        } catch (err) {
            if (isQuotaExceeded(err)) {
                return Promise.reject(new ReviewStorageQuotaError())
            }
            return Promise.reject(
                err instanceof Error ? err : new Error(String(err))
            )
        }
    }

    private opKey(a: TOperatorAssignment): string {
        return a.scope === "premise"
            ? a.premiseId
            : `${a.premiseId}:${a.expressionId ?? ""}`
    }

    async upsertClaimAssignment(
        key: TReviewKey,
        a: TClaimAssignment
    ): Promise<void> {
        const state = await this.load(key)
        if (!state)
            throw new ReviewStorageUnavailableError(
                "upsertClaimAssignment: no existing state"
            )
        state.draft.claimAssignments[a.claimId] = a
        state.draft.updatedAt = new Date()
        await this.save(key, state)
    }

    async upsertOperatorAssignment(
        key: TReviewKey,
        a: TOperatorAssignment
    ): Promise<void> {
        const state = await this.load(key)
        if (!state)
            throw new ReviewStorageUnavailableError(
                "upsertOperatorAssignment: no existing state"
            )
        const idx = state.draft.operatorAssignments.findIndex(
            (x) => this.opKey(x) === this.opKey(a)
        )
        if (idx >= 0) state.draft.operatorAssignments[idx] = a
        else state.draft.operatorAssignments.push(a)
        state.draft.updatedAt = new Date()
        await this.save(key, state)
    }

    async saveResult(key: TReviewKey, r: TReviewResult): Promise<void> {
        const state = await this.load(key)
        if (!state)
            throw new ReviewStorageUnavailableError(
                "saveResult: no existing state"
            )
        state.lastResult = r
        await this.save(key, state)
    }

    clear(key: TReviewKey): Promise<void> {
        const ls = browserGlobals.localStorage
        if (browserGlobals.window !== undefined && ls) {
            ls.removeItem(this.keyFor(key))
        }
        return Promise.resolve()
    }
}

/**
 * In-memory `TReviewStore` used by readonly review viewers.
 *
 * `load` and `save` round-trip state through a per-instance memory slot (so
 * `ReviewEngine.runEvaluation`'s post-notify persist call succeeds without
 * touching localStorage). The upsert methods (`upsertClaimAssignment`,
 * `upsertOperatorAssignment`, `saveResult`) are true no-ops; they do NOT
 * merge into the in-memory slot. Do NOT use this store with an editable
 * engine — individual assignment upserts would be silently dropped.
 */
export class InMemoryReviewStore implements TReviewStore {
    private data: TReviewState | undefined
    keyFor(k: TReviewKey): string {
        return `memory:${k.argumentId}:${k.argumentVersion}:${k.userId ?? "anon"}`
    }
    load(_key: TReviewKey): Promise<TReviewState | undefined> {
        return Promise.resolve(this.data)
    }
    save(_key: TReviewKey, state: TReviewState): Promise<void> {
        this.data = state
        return Promise.resolve()
    }
    upsertClaimAssignment(): Promise<void> {
        return Promise.resolve()
    }
    upsertOperatorAssignment(): Promise<void> {
        return Promise.resolve()
    }
    saveResult(): Promise<void> {
        return Promise.resolve()
    }
    clear(_key: TReviewKey): Promise<void> {
        this.data = undefined
        return Promise.resolve()
    }
}
