import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { UserTiers } from "../../schemas/model/index.js"
import { UserTierLimitsSchema } from "../../schemas/model/users.js"
import { UserTierLimits, UserTierNames } from "../index.js"

const tierValues = Object.values(UserTiers).map(String).sort()

describe("UserTiers", () => {
    it("holds entitlements only — no account state", () => {
        expect(Object.keys(UserTiers).sort()).toEqual([
            "ENTERPRISE",
            "FREE",
            "NO_ASSIST",
            "PREMIUM",
            "UNVERIFIED",
        ])
    })

    it("keeps NO_ASSIST at 103", () => {
        // The numbers are persisted server-side. Closing the gap left by the
        // two values that moved to the account-state axis would silently
        // re-map every existing row.
        expect(UserTiers.NO_ASSIST).toBe(103)
    })
})

describe("UserTierLimits", () => {
    it("has an entry for every tier and no entry for anything else", () => {
        expect(Object.keys(UserTierLimits).sort()).toEqual(tierValues)
    })

    it("every entry satisfies the schema", () => {
        for (const limits of Object.values(UserTierLimits)) {
            expect(Value.Check(UserTierLimitsSchema, limits)).toBe(true)
        }
    })

    it("gives an unverified account no source-text storage at all", () => {
        const unverified = UserTierLimits[UserTiers.UNVERIFIED]
        expect(unverified.maxSourceTextChars).toBe(0)
        expect(unverified.maxStoredSourceTextChars).toBe(0)
    })

    it("never lets one document exceed a tier's aggregate storage", () => {
        for (const limits of Object.values(UserTierLimits)) {
            // The schema fields are optional for wire compatibility with a
            // server that predates them; this constant always supplies both.
            expect(limits.maxSourceTextChars).toBeDefined()
            expect(limits.maxStoredSourceTextChars).toBeDefined()
            expect(limits.maxSourceTextChars!).toBeLessThanOrEqual(
                limits.maxStoredSourceTextChars!
            )
        }
    })

    it("parses a tier-limits body from a server that predates the source-text fields", () => {
        const { maxSourceTextChars, maxStoredSourceTextChars, ...older } =
            UserTierLimits[UserTiers.FREE]
        void maxSourceTextChars
        void maxStoredSourceTextChars

        expect(Value.Check(UserTierLimitsSchema, older)).toBe(true)
    })
})

describe("UserTierNames", () => {
    it("has an entry for every tier and no entry for anything else", () => {
        expect(Object.keys(UserTierNames).sort()).toEqual(tierValues)
    })
})
