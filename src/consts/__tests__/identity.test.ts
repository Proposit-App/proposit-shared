import { describe, expect, it } from "vitest"
import { UsernameValidationRe, isReservedUsername } from "../index.js"

// The accept cases carry as much weight as the refuse cases: they pin the
// exact-vs-substring asymmetry, so a later "tidy-up" that makes `admin` a
// substring rule (or `proposit` an exact one) fails here rather than silently
// refusing ordinary names.
describe("isReservedUsername", () => {
    describe("the brand is reserved as a substring", () => {
        for (const name of [
            "proposit",
            "Proposit",
            "PROPOSIT",
            "xpropositx",
            "proposit_staff",
            "the-proposit-team",
        ]) {
            it(`refuses ${name}`, () => {
                expect(isReservedUsername(name)).toBe(true)
            })
        }
    })

    describe("admin is reserved only as the whole name", () => {
        for (const name of ["admin", "Admin", "ADMIN", " admin "]) {
            it(`refuses ${name}`, () => {
                expect(isReservedUsername(name)).toBe(true)
            })
        }

        for (const name of [
            "administrator_fan",
            "sysadmin",
            "admins",
            "admin-of-nothing",
        ]) {
            it(`accepts ${name}`, () => {
                expect(isReservedUsername(name)).toBe(false)
            })
        }
    })

    describe("ordinary names are untouched", () => {
        for (const name of ["brian", "a_reader", "logician-42", "Prop", ""]) {
            it(`accepts ${JSON.stringify(name)}`, () => {
                expect(isReservedUsername(name)).toBe(false)
            })
        }
    })

    // The two rules are independent: a reserved name may be perfectly
    // well-formed, which is exactly why the format regex cannot express this.
    it("is orthogonal to the format rule", () => {
        expect(UsernameValidationRe.test("proposit_staff")).toBe(true)
        expect(isReservedUsername("proposit_staff")).toBe(true)
    })
})
