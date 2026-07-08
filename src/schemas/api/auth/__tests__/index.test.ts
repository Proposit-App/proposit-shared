import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import {
    MobileRefreshRequest,
    MobileRefreshResponse,
    MobileSessionRequest,
    MobileSessionResponse,
} from "../index.js"

describe("MobileSessionRequest", () => {
    it("accepts a valid google request with nonce", () => {
        const input = {
            provider: "google",
            idToken: "eyJ.xxx.yyy",
            nonce: "n-abc",
        }
        expect(Value.Check(MobileSessionRequest, input)).toBe(true)
    })

    it("accepts a valid apple request without nonce (wire-schema optional)", () => {
        const input = { provider: "apple", idToken: "eyJ.xxx.yyy" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(true)
    })

    it("accepts a valid x request with an accessToken", () => {
        const input = { provider: "x", accessToken: "x-oauth2-access-token" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(true)
    })

    it("rejects an x request missing accessToken", () => {
        const input = { provider: "x" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("rejects the stored provider identity 'twitter' as a wire discriminator", () => {
        const input = {
            provider: "twitter",
            accessToken: "x-oauth2-access-token",
        }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("rejects a missing idToken", () => {
        const input = { provider: "google" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })
})

describe("MobileSessionResponse", () => {
    const valid = {
        accessToken: "access.jwt.here",
        accessTokenExpiresAt: "2026-04-22T00:15:00.000Z",
        refreshToken: "refresh-opaque-token",
        refreshTokenExpiresAt: "2026-05-22T00:00:00.000Z",
        userId: "00000000-0000-0000-0000-000000000001",
    }

    it("accepts a valid response", () => {
        expect(Value.Check(MobileSessionResponse, valid)).toBe(true)
    })

    it("rejects a missing refreshToken", () => {
        const { refreshToken: _omitted, ...rest } = valid
        expect(Value.Check(MobileSessionResponse, rest)).toBe(false)
    })

    it("rejects a missing accessTokenExpiresAt", () => {
        const { accessTokenExpiresAt: _omitted, ...rest } = valid
        expect(Value.Check(MobileSessionResponse, rest)).toBe(false)
    })

    it("rejects a wrong-type userId", () => {
        expect(
            Value.Check(MobileSessionResponse, { ...valid, userId: 123 })
        ).toBe(false)
    })
})

describe("MobileRefreshRequest", () => {
    it("accepts a valid refresh request", () => {
        expect(
            Value.Check(MobileRefreshRequest, {
                refreshToken: "refresh-opaque-token",
            })
        ).toBe(true)
    })

    it("rejects a missing refreshToken", () => {
        expect(Value.Check(MobileRefreshRequest, {})).toBe(false)
    })

    it("rejects a non-string refreshToken", () => {
        expect(Value.Check(MobileRefreshRequest, { refreshToken: 42 })).toBe(
            false
        )
    })
})

describe("MobileRefreshResponse", () => {
    const valid = {
        accessToken: "new-access.jwt",
        accessTokenExpiresAt: "2026-04-22T00:15:00.000Z",
        refreshToken: "new-refresh-opaque-token",
        refreshTokenExpiresAt: "2026-05-22T00:00:00.000Z",
    }

    it("accepts a valid refresh response", () => {
        expect(Value.Check(MobileRefreshResponse, valid)).toBe(true)
    })

    it("rejects a missing refreshToken", () => {
        const { refreshToken: _omitted, ...rest } = valid
        expect(Value.Check(MobileRefreshResponse, rest)).toBe(false)
    })

    it("rejects a missing accessToken", () => {
        const { accessToken: _omitted, ...rest } = valid
        expect(Value.Check(MobileRefreshResponse, rest)).toBe(false)
    })
})
