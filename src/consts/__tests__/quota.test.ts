import { describe, expect, it } from "vitest"
import { AI_QUOTA_ABORT_CODE } from "../index.js"

describe("AI_QUOTA_ABORT_CODE", () => {
    it("is the wire-contract literal consumers match against errorData.code", () => {
        // Pinned: this literal is compared at runtime against a run/stage/task
        // errorData.code across server + mobile. Changing it silently breaks
        // their breaker UI, so the exact string is the contract.
        expect(AI_QUOTA_ABORT_CODE).toBe("AI_QUOTA_EXHAUSTED")
    })
})
