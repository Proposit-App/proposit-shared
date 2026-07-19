import { describe, expect, test } from "vitest"
import { Value } from "typebox/value"

import {
    MutationConflictResponseSchema,
    type TMutationConflictResponse,
} from "../mutation-conflict.js"

describe("MutationConflictResponseSchema", () => {
    test("accepts each conflict code", () => {
        for (const code of [
            "ALREADY_PUBLISHED",
            "PUBLISHED_VERSION_NOT_ARCHIVABLE",
            "PUBLISH_VERSION_CONFLICT",
        ] as const) {
            const body: TMutationConflictResponse = {
                error: "MUTATION_CONFLICT",
                code,
                message: "some human-readable message",
            }
            expect(Value.Check(MutationConflictResponseSchema, body)).toBe(true)
        }
    })

    test("rejects a wrong discriminator", () => {
        expect(
            Value.Check(MutationConflictResponseSchema, {
                error: "GRAMMAR_VIOLATIONS",
                code: "ALREADY_PUBLISHED",
                message: "x",
            })
        ).toBe(false)
    })

    test("rejects an unknown code", () => {
        expect(
            Value.Check(MutationConflictResponseSchema, {
                error: "MUTATION_CONFLICT",
                code: "SOMETHING_ELSE",
                message: "x",
            })
        ).toBe(false)
    })

    test("rejects a missing message", () => {
        expect(
            Value.Check(MutationConflictResponseSchema, {
                error: "MUTATION_CONFLICT",
                code: "ALREADY_PUBLISHED",
            })
        ).toBe(false)
    })
})
