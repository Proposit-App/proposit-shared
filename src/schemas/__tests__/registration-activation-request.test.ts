import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { RegistrationInviteActivationRequestSchema } from "../model/users.js"

const agreements = {
    agreedToTerms: true,
    agreedToPrivacyPolicy: true,
    agreedToCommunityGuidelines: true,
}

describe("RegistrationInviteActivationRequestSchema", () => {
    it("accepts a code-free registration carrying only a username", () => {
        const body = { isPromoCode: false, username: "ada", ...agreements }
        expect(
            Value.Check(RegistrationInviteActivationRequestSchema, body)
        ).toBe(true)
    })

    it("still accepts a code-bearing request with no username", () => {
        const body = {
            code: "some-invite-code",
            isPromoCode: false,
            ...agreements,
        }
        expect(
            Value.Check(RegistrationInviteActivationRequestSchema, body)
        ).toBe(true)
    })

    it("accepts a captcha token alongside the rest", () => {
        const body = {
            isPromoCode: false,
            username: "ada",
            captchaToken: "turnstile-token",
            ...agreements,
        }
        expect(
            Value.Check(RegistrationInviteActivationRequestSchema, body)
        ).toBe(true)
    })

    // The agreements stay required — proof that widening `code` did not widen
    // the whole object.
    it("rejects a request missing an agreement", () => {
        const body = {
            isPromoCode: false,
            username: "ada",
            agreedToPrivacyPolicy: true,
            agreedToCommunityGuidelines: true,
        }
        expect(
            Value.Check(RegistrationInviteActivationRequestSchema, body)
        ).toBe(false)
    })
})
