import { describe, expect, it } from "vitest"
import { UserTiers } from "../../schemas/model/index.js"
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
})

describe("UserTierNames", () => {
    it("has an entry for every tier and no entry for anything else", () => {
        expect(Object.keys(UserTierNames).sort()).toEqual(tierValues)
    })
})
