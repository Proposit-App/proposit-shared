// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import {
    LocalStorageReviewStore,
    ReviewStorageQuotaError,
} from "../../review/review-store.js"
import type { TReviewState } from "../../../schemas/review.js"

// Node 22+ ships a native localStorage shim that's exposed to jsdom as an empty object
// when no file is configured. Install a proper Map-backed Storage stub so tests run
// consistently regardless of the runtime's localStorage support.
class MemoryStorage {
    private store = new Map<string, string>()
    get length(): number {
        return this.store.size
    }
    key(i: number): string | null {
        return Array.from(this.store.keys())[i] ?? null
    }
    getItem(k: string): string | null {
        return this.store.get(k) ?? null
    }
    setItem(k: string, v: string): void {
        this.store.set(k, String(v))
    }
    removeItem(k: string): void {
        this.store.delete(k)
    }
    clear(): void {
        this.store.clear()
    }
}
Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
})
Object.defineProperty(globalThis, "Storage", {
    value: MemoryStorage,
    writable: true,
    configurable: true,
})

function makeState(
    overrides: Partial<TReviewState["draft"]> = {}
): TReviewState {
    return {
        draft: {
            schemaVersion: 1,
            reviewId: "00000000-0000-0000-0000-000000000010",
            argumentId: "00000000-0000-0000-0000-000000000011",
            argumentVersion: 1,
            userId: undefined,
            createdAt: new Date("2026-04-14"),
            updatedAt: new Date("2026-04-14"),
            phase: "claims",
            currentStepIndex: 0,
            claimAssignments: {},
            operatorAssignments: [],
            ...overrides,
        },
        lastResult: undefined,
    }
}

describe("LocalStorageReviewStore", () => {
    beforeEach(() => localStorage.clear())

    it("round-trips state with Date fields restored via Convert → Parse", async () => {
        const store = new LocalStorageReviewStore()
        const key = {
            argumentId: "00000000-0000-0000-0000-000000000011",
            argumentVersion: 1,
        }
        await store.save(key, makeState())
        const loaded = await store.load(key)
        expect(loaded?.draft.createdAt instanceof Date).toBe(true)
    })

    it("isolates anon vs userId keys", async () => {
        const store = new LocalStorageReviewStore()
        const base = {
            argumentId: "00000000-0000-0000-0000-000000000011",
            argumentVersion: 1,
        }
        await store.save(base, makeState())
        await store.save(
            { ...base, userId: "00000000-0000-0000-0000-000000000099" },
            makeState({ reviewId: "00000000-0000-0000-0000-000000000020" })
        )
        const anon = await store.load(base)
        const u1 = await store.load({
            ...base,
            userId: "00000000-0000-0000-0000-000000000099",
        })
        expect(anon?.draft.reviewId).not.toBe(u1?.draft.reviewId)
    })

    it("drops a corrupted blob on load and clears the key", async () => {
        const store = new LocalStorageReviewStore()
        const key = {
            argumentId: "00000000-0000-0000-0000-000000000011",
            argumentVersion: 1,
        }
        localStorage.setItem(store.keyFor(key), "not json")
        expect(await store.load(key)).toBeUndefined()
        expect(localStorage.getItem(store.keyFor(key))).toBeNull()
    })

    it("wraps QuotaExceededError in ReviewStorageQuotaError", async () => {
        const store = new LocalStorageReviewStore()
        const spy = vi
            .spyOn(Storage.prototype, "setItem")
            .mockImplementation(() => {
                throw new DOMException("quota", "QuotaExceededError")
            })
        await expect(
            store.save(
                {
                    argumentId: "00000000-0000-0000-0000-000000000011",
                    argumentVersion: 1,
                },
                makeState()
            )
        ).rejects.toBeInstanceOf(ReviewStorageQuotaError)
        spy.mockRestore()
    })

    it("upsertClaimAssignment merges without clobbering existing claim entries", async () => {
        const store = new LocalStorageReviewStore()
        const key = {
            argumentId: "00000000-0000-0000-0000-000000000011",
            argumentVersion: 1,
        }
        await store.save(
            key,
            makeState({
                claimAssignments: {
                    "00000000-0000-0000-0000-000000000030": {
                        assignmentId: "00000000-0000-0000-0000-000000000031",
                        claimId: "00000000-0000-0000-0000-000000000030",
                        value: true,
                        skipped: false,
                        decidedAt: new Date(),
                    },
                },
            })
        )
        await store.upsertClaimAssignment(key, {
            assignmentId: "00000000-0000-0000-0000-000000000041",
            claimId: "00000000-0000-0000-0000-000000000040",
            value: false,
            skipped: false,
            decidedAt: new Date(),
        })
        const loaded = await store.load(key)
        expect(Object.keys(loaded!.draft.claimAssignments).length).toBe(2)
        expect(loaded!.draft.updatedAt.getTime()).toBeGreaterThanOrEqual(
            loaded!.draft.createdAt.getTime()
        )
    })

    it("upsertOperatorAssignment replaces existing premise-scope entry, keeps others", async () => {
        const store = new LocalStorageReviewStore()
        const key = {
            argumentId: "00000000-0000-0000-0000-000000000011",
            argumentVersion: 1,
        }
        const pA = "00000000-0000-0000-0000-00000000aaa1"
        const pB = "00000000-0000-0000-0000-00000000aaa2"
        await store.save(
            key,
            makeState({
                operatorAssignments: [
                    {
                        assignmentId: "00000000-0000-0000-0000-00000000bb01",
                        premiseId: pA,
                        scope: "premise",
                        decision: "accepted",
                        decidedAt: new Date(),
                    },
                ],
            })
        )
        await store.upsertOperatorAssignment(key, {
            assignmentId: "00000000-0000-0000-0000-00000000bb02",
            premiseId: pA,
            scope: "premise",
            decision: "rejected",
            decidedAt: new Date(),
        })
        await store.upsertOperatorAssignment(key, {
            assignmentId: "00000000-0000-0000-0000-00000000bb03",
            premiseId: pB,
            scope: "premise",
            decision: "accepted",
            decidedAt: new Date(),
        })
        const loaded = await store.load(key)
        const ops = loaded!.draft.operatorAssignments
        expect(ops).toHaveLength(2)
        const forA = ops.find((o) => o.premiseId === pA)!
        expect(forA.decision).toBe("rejected")
    })
})

describe("LocalStorageReviewStore — what survives a bad read", () => {
    const key = {
        argumentId: "00000000-0000-0000-0000-000000000011",
        argumentVersion: 1,
    }

    beforeEach(() => localStorage.clear())

    it("keeps the draft when only the result mirror fails to decode", async () => {
        const store = new LocalStorageReviewStore()
        await store.save(key, makeState())
        const raw = JSON.parse(localStorage.getItem(store.keyFor(key))!) as {
            lastResult?: unknown
        }
        // A result shape this build's mirror does not admit — a review written
        // by a newer version, say. The draft beside it is the reader's own
        // irreplaceable work and is not what failed.
        raw.lastResult = { schemaVersion: 1, nonsense: true }
        localStorage.setItem(store.keyFor(key), JSON.stringify(raw))
        const loaded = await store.load(key)
        expect(loaded?.draft.reviewId).toBe(
            "00000000-0000-0000-0000-000000000010"
        )
        expect(loaded?.lastResult).toBeUndefined()
    })

    it("does not delete a review that decoded, when re-saving it fails", async () => {
        const store = new LocalStorageReviewStore()
        // A retired reason code, so the load path migrates and then re-saves.
        await store.save(key, makeState())
        const raw = JSON.parse(localStorage.getItem(store.keyFor(key))!) as {
            draft: { claimAssignments: Record<string, unknown> }
        }
        raw.draft.claimAssignments["00000000-0000-0000-0000-000000000012"] = {
            assignmentId: "00000000-0000-0000-0000-000000000012",
            claimId: "00000000-0000-0000-0000-000000000012",
            value: true,
            reasonCode: "a-code-this-build-retired",
            skipped: false,
            decidedAt: "2026-04-14T00:00:00.000Z",
        }
        localStorage.setItem(store.keyFor(key), JSON.stringify(raw))
        const stored = localStorage.getItem(store.keyFor(key))!
        const setItem = vi
            .spyOn(Storage.prototype, "setItem")
            .mockImplementation(() => {
                throw new Error("QuotaExceededError")
            })
        try {
            await store.load(key).catch(() => undefined)
        } finally {
            setItem.mockRestore()
        }
        expect(localStorage.getItem(store.keyFor(key))).toBe(stored)
    })
})
