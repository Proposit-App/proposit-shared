import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"

import { BudgetExceededErrorBodySchema } from "../api/errors.js"

// Verifies the canonical 402 body shape at
// `@proposit/shared/schemas/api/errors`. Every LLM-bearing entry route emits
// this body when the caller's per-user token budget is exhausted: discriminated by
// `code: "TOKEN_BUDGET_EXCEEDED"`, carrying `usage` so the client can surface
// used / limit / resetOn to the user.

const validBody = {
    code: "TOKEN_BUDGET_EXCEEDED",
    message: "Your monthly token budget is exhausted.",
    usage: {
        used: 100_000,
        limit: 100_000,
        resetOn: "2026-06-01T00:00:00.000Z",
    },
}

describe("BudgetExceededErrorBodySchema", () => {
    it("validates a well-formed budget-exceeded body", () => {
        expect(Value.Check(BudgetExceededErrorBodySchema, validBody)).toBe(true)
    })

    it("rejects a body missing usage", () => {
        const { usage: _omitted, ...without } = validBody
        expect(Value.Check(BudgetExceededErrorBodySchema, without)).toBe(false)
    })

    it("rejects a body whose usage.used is a string", () => {
        const bad = {
            ...validBody,
            usage: { ...validBody.usage, used: "100000" },
        }
        expect(Value.Check(BudgetExceededErrorBodySchema, bad)).toBe(false)
    })

    it("rejects a body with a non-literal code", () => {
        const bad = { ...validBody, code: "OTHER" }
        expect(Value.Check(BudgetExceededErrorBodySchema, bad)).toBe(false)
    })

    it("rejects a non-integer usage.used", () => {
        const bad = {
            ...validBody,
            usage: { ...validBody.usage, used: 1.5 },
        }
        expect(Value.Check(BudgetExceededErrorBodySchema, bad)).toBe(false)
    })

    it("rejects a negative usage.limit", () => {
        const bad = {
            ...validBody,
            usage: { ...validBody.usage, limit: -1 },
        }
        expect(Value.Check(BudgetExceededErrorBodySchema, bad)).toBe(false)
    })

    it("rejects a resetOn that is not a date-time", () => {
        // Parse — not Check — enforces format. Check only validates type.
        const bad = {
            ...validBody,
            usage: { ...validBody.usage, resetOn: "not-a-date" },
        }
        expect(() => Value.Parse(BudgetExceededErrorBodySchema, bad)).toThrow()
    })
})
