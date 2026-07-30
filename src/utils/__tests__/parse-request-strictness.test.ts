import { describe, test, expect } from "vitest"
import { Type } from "typebox"
import { parseRequest } from "../utils.js"
import { EncodableDate } from "../../schemas/common.js"

/**
 * `parseRequest` must reject a body with a required key missing, even when the
 * schema declares a `default` for it.
 *
 * This is not hypothetical. `Value.Decode` applies defaults before it
 * validates, so decoding alone turns `{}` into a fully-populated object and
 * reports success. Every request schema with a defaulted field — user tier,
 * system role, visibility flags — would then accept a partial body and invent
 * the missing value rather than returning a 400.
 */
describe("parseRequest strictness", () => {
    const Schema = Type.Object({
        tier: Type.Integer({ default: 1 }),
        role: Type.String({ default: "Normal" }),
    })

    const requestOf = (body: unknown) =>
        new Request("http://localhost/test", {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "content-type": "application/json" },
        })

    test("rejects a body with a defaulted key omitted", async () => {
        await expect(
            parseRequest(requestOf({ tier: 1 }), Schema)
        ).rejects.toThrow()
    })

    test("accepts a complete body", async () => {
        await expect(
            parseRequest(requestOf({ tier: 1, role: "Normal" }), Schema)
        ).resolves.toEqual({ tier: 1, role: "Normal" })
    })

    test("still coerces stringly-typed wire values", async () => {
        // The conversion pass callers depend on. It has to run before the
        // assert, or a coercible value would be rejected outright.
        const Coercible = Type.Object({
            flag: Type.Boolean(),
            count: Type.Number(),
        })

        await expect(
            parseRequest(requestOf({ flag: "true", count: "42" }), Coercible)
        ).resolves.toEqual({ flag: true, count: 42 })
    })

    test("still rehydrates a wire date string into a Date", async () => {
        // The reason parseRequest decodes at all. Asserting first must not cost
        // us this.
        const WithDate = Type.Object({ createdOn: EncodableDate })
        const parsed = await parseRequest(
            requestOf({ createdOn: "2026-07-30T12:00:00.000Z" }),
            WithDate
        )

        expect(parsed.createdOn).toBeInstanceOf(Date)
        expect(parsed.createdOn.toISOString()).toBe("2026-07-30T12:00:00.000Z")
    })
})
