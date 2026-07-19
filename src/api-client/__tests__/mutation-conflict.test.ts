import { describe, expect, test } from "vitest"
import { Value } from "typebox/value"

import { isMutationConflictError } from "../mutation-conflict.js"
import {
    MutationConflictResponseSchema,
    type TMutationConflictResponse,
} from "../../schemas/api/mutation-conflict.js"

describe("isMutationConflictError", () => {
    test("narrows a real MutationConflictResponse", () => {
        const body: TMutationConflictResponse = {
            error: "MUTATION_CONFLICT",
            code: "ALREADY_PUBLISHED",
            message: "Argument is already published, cannot publish again",
        }

        // Sanity-check the fixture against the schema before asserting the
        // guard — a future schema change should fail the schema check first,
        // not silently invalidate the guard's positive case.
        expect(Value.Check(MutationConflictResponseSchema, body)).toBe(true)
        expect(isMutationConflictError(body)).toBe(true)
    })

    test("rejects a TErrorResponse-shaped object (different discriminator)", () => {
        const errorResponse = {
            errorID: -1,
            errorMessage: "conflict",
            statusCode: 409,
        }
        expect(isMutationConflictError(errorResponse)).toBe(false)
    })

    test("rejects the grammar-violations envelope (different discriminator)", () => {
        expect(isMutationConflictError({ error: "GRAMMAR_VIOLATIONS" })).toBe(
            false
        )
    })

    test("rejects an object whose `error` is a different string", () => {
        expect(isMutationConflictError({ error: "SOMETHING_ELSE" })).toBe(false)
    })

    test("rejects an object with no `error` key", () => {
        expect(isMutationConflictError({ code: "ALREADY_PUBLISHED" })).toBe(
            false
        )
    })

    test("rejects null", () => {
        expect(isMutationConflictError(null)).toBe(false)
    })

    test("rejects undefined", () => {
        expect(isMutationConflictError(undefined)).toBe(false)
    })

    test("rejects primitives", () => {
        expect(isMutationConflictError("MUTATION_CONFLICT")).toBe(false)
        expect(isMutationConflictError(42)).toBe(false)
        expect(isMutationConflictError(true)).toBe(false)
    })

    test("rejects arrays (typeof 'object' but discriminator absent)", () => {
        expect(isMutationConflictError([])).toBe(false)
        expect(isMutationConflictError(["MUTATION_CONFLICT"])).toBe(false)
    })
})
