import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import { MobileSessionRequest } from "../index.js"

describe("MobileSessionRequest", () => {
    it("accepts a valid google request with nonce", () => {
        const input = { provider: "google", idToken: "eyJ.xxx.yyy", nonce: "n-abc" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(true)
    })

    it("accepts a valid apple request without nonce (wire-schema optional)", () => {
        const input = { provider: "apple", idToken: "eyJ.xxx.yyy" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(true)
    })

    it("rejects an unsupported provider", () => {
        const input = { provider: "twitter", idToken: "eyJ.xxx.yyy" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("rejects a missing idToken", () => {
        const input = { provider: "google" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })
})
