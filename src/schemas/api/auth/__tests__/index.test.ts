import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import {
    EmailCodeRequest,
    EmailCodeResponse,
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

    it("accepts a valid email one-time-code verify request", () => {
        const input = {
            provider: "email",
            email: "reviewer@example.com",
            code: "123456",
        }
        expect(Value.Check(MobileSessionRequest, input)).toBe(true)
    })

    it("rejects an email request missing code", () => {
        const input = { provider: "email", email: "reviewer@example.com" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("rejects an email request missing email", () => {
        const input = { provider: "email", code: "123456" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("accepts a valid testing-and-qa request", () => {
        const input = { provider: "testing-and-qa", identity: "app-reviewer" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(true)
    })

    it("rejects a testing-and-qa request missing identity", () => {
        const input = { provider: "testing-and-qa" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("rejects an email request with an empty email", () => {
        const input = { provider: "email", email: "", code: "123456" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("rejects an email request with an over-254-char email", () => {
        const input = {
            provider: "email",
            email: `${"a".repeat(250)}@x.com`,
            code: "123456",
        }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("rejects an email request with a non-6-digit code", () => {
        const input = {
            provider: "email",
            email: "reviewer@example.com",
            code: "12345",
        }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("rejects an email request with a non-numeric code", () => {
        const input = {
            provider: "email",
            email: "reviewer@example.com",
            code: "12345a",
        }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })

    it("rejects a testing-and-qa request with an empty identity", () => {
        const input = { provider: "testing-and-qa", identity: "" }
        expect(Value.Check(MobileSessionRequest, input)).toBe(false)
    })
})

describe("EmailCodeRequest", () => {
    it("accepts a request with just email", () => {
        expect(
            Value.Check(EmailCodeRequest, { email: "reviewer@example.com" })
        ).toBe(true)
    })

    it("rejects a missing email", () => {
        expect(Value.Check(EmailCodeRequest, {})).toBe(false)
    })

    it("rejects an empty email", () => {
        expect(Value.Check(EmailCodeRequest, { email: "" })).toBe(false)
    })

    it("rejects an over-254-char email", () => {
        expect(
            Value.Check(EmailCodeRequest, {
                email: `${"a".repeat(250)}@x.com`,
            })
        ).toBe(false)
    })

    it("rejects extra properties (no account-existence leakage vectors)", () => {
        expect(
            Value.Check(EmailCodeRequest, {
                email: "reviewer@example.com",
                code: "123456",
            })
        ).toBe(false)
    })
})

describe("EmailCodeResponse", () => {
    it("accepts the constant sent status", () => {
        expect(Value.Check(EmailCodeResponse, { status: "sent" })).toBe(true)
    })

    it("rejects any other status", () => {
        expect(Value.Check(EmailCodeResponse, { status: "delivered" })).toBe(
            false
        )
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
