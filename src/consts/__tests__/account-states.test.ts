import { describe, expect, it } from "vitest"
import {
    AccountStates,
    LOCKED_OUT_ACCOUNT_STATES,
    isLockedOut,
} from "../index.js"

// Every member of `AccountStates` is asserted below, one `it` per value. The
// list is re-checked against `AccountStates` itself so that adding a state
// fails here until someone states which side of the line it falls on.
const COVERED_STATE_NAMES = [
    "ACTIVE",
    "DEACTIVATED",
    "BANNED",
    "DELETED",
] as const

describe("LOCKED_OUT_ACCOUNT_STATES", () => {
    it("is exactly the banned and deleted states", () => {
        expect(LOCKED_OUT_ACCOUNT_STATES).toEqual([
            AccountStates.BANNED,
            AccountStates.DELETED,
        ])
    })
})

describe("isLockedOut", () => {
    it("covers every state defined in AccountStates", () => {
        expect([...COVERED_STATE_NAMES].sort()).toEqual(
            Object.keys(AccountStates).sort()
        )
    })

    it("reports BANNED as locked out", () => {
        expect(isLockedOut(AccountStates.BANNED)).toBe(true)
    })

    it("reports DELETED as locked out", () => {
        expect(isLockedOut(AccountStates.DELETED)).toBe(true)
    })

    it("does NOT report DEACTIVATED as locked out", () => {
        // The assertion the whole account-state axis turns on. Signing in is
        // how a deactivated account comes back, so authentication must succeed
        // for it. Locking it out would make deactivation irreversible.
        expect(isLockedOut(AccountStates.DEACTIVATED)).toBe(false)
    })

    it("does not report ACTIVE as locked out", () => {
        expect(isLockedOut(AccountStates.ACTIVE)).toBe(false)
    })

    it("does not report an unrecognized state as locked out", () => {
        // Values reach this predicate straight off a database row. Failing
        // closed on an unknown principal is the caller's job, not this one's.
        expect(isLockedOut("nonsense")).toBe(false)
    })
})
