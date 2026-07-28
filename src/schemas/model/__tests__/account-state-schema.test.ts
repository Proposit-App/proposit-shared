import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { AccountStates, AllAccountStates, UserSchema } from "../users.js"

const activeUser = {
    id: "00000000-0000-4000-8000-000000000000",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: null,
    image: null,
    username: "ada",
    curationId: null,
    tier: 1,
    accountState: AccountStates.ACTIVE,
    tokensUsed: 0,
    lifetimeTokensUsed: 0,
    tokenResetOn: new Date(),
    deleted: false,
    registrationDate: new Date(),
    preferences: { advancedMode: false },
}

describe("AllAccountStates", () => {
    it("accepts every defined state", () => {
        for (const state of Object.values(AccountStates)) {
            expect(Value.Check(AllAccountStates, state)).toBe(true)
        }
    })

    it("rejects an unknown state", () => {
        expect(Value.Check(AllAccountStates, "suspended")).toBe(false)
    })

    it("rejects the numeric encoding tiers use", () => {
        expect(Value.Check(AllAccountStates, 101)).toBe(false)
    })
})

describe("UserSchema", () => {
    it("accepts a user carrying an account state", () => {
        expect(Value.Check(UserSchema, activeUser)).toBe(true)
    })

    it("requires accountState", () => {
        const { accountState: _omitted, ...withoutState } = activeUser
        expect(Value.Check(UserSchema, withoutState)).toBe(false)
    })

    it("rejects a tier value that moved to the account-state axis", () => {
        expect(Value.Check(UserSchema, { ...activeUser, tier: 101 })).toBe(
            false
        )
    })
})
