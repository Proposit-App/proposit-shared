import { describe, expect, it } from "vitest"
import { UserTiers } from "../../schemas/model/index.js"
import { PLATFORM_DISABLED_TIERS, isPlatformDisabled } from "../index.js"

// Every member of `UserTiers` is asserted below, one `it` per value. The list is
// re-checked against `UserTiers` itself so that adding a tier fails here until
// someone states which side of the line it falls on.
const COVERED_TIER_NAMES = [
    "UNVERIFIED",
    "FREE",
    "PREMIUM",
    "ENTERPRISE",
    "BANNED",
    "DEACTIVATED",
    "NO_ASSIST",
] as const

describe("PLATFORM_DISABLED_TIERS", () => {
    it("is exactly the banned and deactivated tiers", () => {
        expect(PLATFORM_DISABLED_TIERS).toEqual([
            UserTiers.BANNED,
            UserTiers.DEACTIVATED,
        ])
    })
})

describe("isPlatformDisabled", () => {
    it("covers every tier defined in UserTiers", () => {
        expect([...COVERED_TIER_NAMES].sort()).toEqual(
            Object.keys(UserTiers).sort()
        )
    })

    it("reports BANNED as platform-disabled", () => {
        expect(isPlatformDisabled(UserTiers.BANNED)).toBe(true)
    })

    it("reports DEACTIVATED as platform-disabled", () => {
        expect(isPlatformDisabled(UserTiers.DEACTIVATED)).toBe(true)
    })

    it("does NOT report NO_ASSIST as platform-disabled", () => {
        // The carve-out the shared definition exists for. NO_ASSIST (103) sits
        // directly above DEACTIVATED (102) in the same numeric block, but it is a
        // normal paying tier that only withholds AI assist. A `tier > 100`
        // shortcut would lock these users out of the platform entirely.
        expect(isPlatformDisabled(UserTiers.NO_ASSIST)).toBe(false)
    })

    it("does not report UNVERIFIED as platform-disabled", () => {
        expect(isPlatformDisabled(UserTiers.UNVERIFIED)).toBe(false)
    })

    it("does not report FREE as platform-disabled", () => {
        expect(isPlatformDisabled(UserTiers.FREE)).toBe(false)
    })

    it("does not report PREMIUM as platform-disabled", () => {
        expect(isPlatformDisabled(UserTiers.PREMIUM)).toBe(false)
    })

    it("does not report ENTERPRISE as platform-disabled", () => {
        expect(isPlatformDisabled(UserTiers.ENTERPRISE)).toBe(false)
    })
})
