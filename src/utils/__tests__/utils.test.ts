import { describe, test, expect, vi } from "vitest"
import { Type } from "typebox"

import { parseResponse, stringToColor } from "../utils.js"
import { GrammarViolationsResponseSchema } from "../../schemas/api/grammar-violations.js"
import type { TGrammarViolationsResponse } from "../../schemas/api/grammar-violations.js"
import { isMutationConflictError } from "../../api-client/mutation-conflict.js"
import type { TMutationConflictResponse } from "../../schemas/api/mutation-conflict.js"

// Test fixtures
const SuccessSchema = Type.Object({
    id: Type.String(),
    value: Type.Number(),
})

function mockResponse(
    body: unknown,
    init: { status?: number; statusText?: string } = {}
): Response {
    const status = init.status ?? 200
    return new Response(JSON.stringify(body), {
        status,
        statusText: init.statusText ?? "",
        headers: { "Content-Type": "application/json" },
    })
}

describe("parseResponse — default form (2-arg)", () => {
    test("returns the success value on 200 + matching body (existing behavior)", async () => {
        const resp = mockResponse({ id: "abc", value: 42 }, { status: 200 })
        const result = await parseResponse(resp, SuccessSchema)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toEqual({ id: "abc", value: 42 })
        }
    })

    test("returns TGrammarViolationsResponse envelope on 422 + GRAMMAR_VIOLATIONS body (new in 0.11)", async () => {
        const violationsBody: TGrammarViolationsResponse = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "derivable",
            violations: [
                {
                    tier: "derivable",
                    code: "D-3",
                    message: "Mixed-grounding antecedent",
                    argumentId: "00000000-0000-0000-0000-000000000001",
                    premiseId: "p1",
                    expressionId: "e1",
                },
            ],
        }
        const resp = mockResponse(violationsBody, { status: 422 })
        const result = await parseResponse(resp, SuccessSchema)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            // The error half is the typed envelope, not TErrorResponse.
            expect(result.error).toEqual(violationsBody)
            // Discriminator survives so downstream callers can narrow via
            // `isGrammarViolationsError` or in-place `'error' in x` checks.
            expect((result.error as { error?: string }).error).toBe(
                "GRAMMAR_VIOLATIONS"
            )
        }
    })

    test("returns TGrammarViolationsResponse envelope on 422 publish-gate empty-violations body", async () => {
        const body: TGrammarViolationsResponse = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "presentable",
            violations: [],
        }
        const resp = mockResponse(body, { status: 422 })
        const result = await parseResponse(resp, SuccessSchema)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toEqual(body)
        }
    })

    test("returns TMutationConflictResponse envelope on 409 + MUTATION_CONFLICT body", async () => {
        const conflictBody: TMutationConflictResponse = {
            error: "MUTATION_CONFLICT",
            code: "PUBLISH_VERSION_CONFLICT",
            message: "Version was superseded by a concurrent write",
        }
        const resp = mockResponse(conflictBody, { status: 409 })
        const result = await parseResponse(resp, SuccessSchema)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            // The error half is the typed conflict envelope, not TErrorResponse.
            expect(result.error).toEqual(conflictBody)
            // The guard narrows the surfaced value and `.code` is preserved.
            expect(isMutationConflictError(result.error)).toBe(true)
            if (isMutationConflictError(result.error)) {
                expect(result.error.code).toBe("PUBLISH_VERSION_CONFLICT")
            }
        }
    })

    test("falls back to TErrorResponse on 409 with non-conflict-envelope body", async () => {
        // A 409 that did NOT come from the publish/archive conflict path — a
        // conventional TErrorResponse-shaped 409. The auto-detect must not
        // mis-parse this as a conflict envelope.
        const errorBody = {
            errorID: 12,
            errorMessage: "Some other conflict",
            statusCode: 409,
        }
        const resp = mockResponse(errorBody, { status: 409 })
        const result = await parseResponse(resp, SuccessSchema)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toEqual(errorBody)
            expect(isMutationConflictError(result.error)).toBe(false)
        }
    })

    test("falls back to TErrorResponse on 422 with non-grammar-envelope body (preserves existing behavior)", async () => {
        // A 422 that did NOT come from the grammar-tier gate — e.g. a future
        // semantic-rejection endpoint that uses the conventional TErrorResponse
        // shape. The auto-detect must not mis-parse this as a grammar envelope.
        const errorBody = {
            errorID: 999,
            errorMessage: "Some other 422",
            statusCode: 422,
        }
        const resp = mockResponse(errorBody, { status: 422 })
        const result = await parseResponse(resp, SuccessSchema)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toEqual(errorBody)
        }
    })

    test("falls back to TErrorResponse on 401/403/404/409/500 non-422 failures", async () => {
        const errorBody = {
            errorID: 1,
            errorMessage: "Unauthorized",
            statusCode: 401,
        }
        const resp = mockResponse(errorBody, { status: 401 })
        const result = await parseResponse(resp, SuccessSchema)

        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toEqual(errorBody)
        }
    })

    test("throws when the success body fails the success schema (existing behavior)", async () => {
        const resp = mockResponse({ id: "abc" /* missing value */ })
        // Suppress the deliberate console.error from parseResponse's catch path.
        const consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {
                /* silence parseResponse's deliberate catch-path log */
            })
        try {
            await expect(parseResponse(resp, SuccessSchema)).rejects.toThrow()
        } finally {
            consoleErrorSpy.mockRestore()
        }
    })
})

describe("parseResponse — explicit-error-schema form (3-arg, backwards-compat)", () => {
    test("uses the supplied error schema and bypasses GRAMMAR_VIOLATIONS auto-detect", async () => {
        // Caller passes an explicit error schema; the 422 GRAMMAR_VIOLATIONS
        // auto-detect must NOT fire (preserves the pre-0.11 contract that the
        // 3-arg form parses the body through the caller-supplied schema).
        const violationsBody: TGrammarViolationsResponse = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "derivable",
            violations: [],
        }
        const resp = mockResponse(violationsBody, { status: 422 })
        const result = await parseResponse(
            resp,
            SuccessSchema,
            GrammarViolationsResponseSchema
        )

        expect(result.ok).toBe(false)
        if (!result.ok) {
            // Caller's explicit schema parses the body — same value, same shape,
            // but the path through the function did not invoke the auto-detect.
            expect(result.error).toEqual(violationsBody)
        }
    })

    test("succeeds on 200 with explicit error schema unused", async () => {
        const resp = mockResponse({ id: "abc", value: 42 }, { status: 200 })
        const result = await parseResponse(
            resp,
            SuccessSchema,
            GrammarViolationsResponseSchema
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toEqual({ id: "abc", value: 42 })
        }
    })
})

describe("stringToColor", () => {
    /** WCAG 2.x relative luminance of an `#rrggbb` colour. */
    function relativeLuminance(hex: string): number {
        const [r, g, b] = [0, 2, 4]
            .map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
            .map((c) =>
                c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
            )
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    /** WCAG 2.x contrast ratio between two `#rrggbb` colours (1:1 … 21:1). */
    function contrastRatio(a: string, b: string): number {
        const [lighter, darker] = [
            relativeLuminance(a),
            relativeLuminance(b),
        ].sort((x, y) => y - x)
        return (lighter + 0.05) / (darker + 0.05)
    }

    const AA_BODY_TEXT = 4.5

    test("the contrast helper matches known WCAG values", () => {
        // The sweep below is only as trustworthy as this helper, which is a
        // second copy of the formula the source uses. Pinning it to published
        // values is what stops a shared typo passing both.
        expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5)
        expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5)
        expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.478, 2)
        expect(relativeLuminance("#ff0000")).toBeCloseTo(0.2126, 4)
    })

    test("pairs every hashed fill with an ink that clears AA on it", () => {
        // The guarantee is "every hash", not "these samples" — the fill is an
        // arbitrary 24-bit value, so a couple of spot checks would prove
        // nothing. `qa_manual` and `f` are the two names a manual QA session
        // caught rendering illegibly before the ink was paired.
        const names = [
            "qa_manual",
            "f",
            "a",
            "Brian",
            "",
            // Display names are user-supplied, so the hash has to survive
            // non-ASCII, surrogate pairs, and unbounded length.
            "Ünïcödé",
            "日本語のなまえ",
            "🙂🙂",
            "x".repeat(10_000),
            ...Array.from({ length: 4000 }, (_, i) => `user${i}`),
        ]

        for (const name of names) {
            const { fill, ink } = stringToColor(name)
            expect(fill, name).toMatch(/^#[0-9a-f]{6}$/)
            expect(
                contrastRatio(fill, ink),
                `${name}: ink ${ink} on fill ${fill}`
            ).toBeGreaterThanOrEqual(AA_BODY_TEXT)
        }
    })

    test("is stable for a given input", () => {
        expect(stringToColor("qa_manual")).toEqual(stringToColor("qa_manual"))
        expect(stringToColor("a").fill).not.toBe(stringToColor("b").fill)
    })

    test("keeps the neutral placeholder for '?'", () => {
        expect(stringToColor("?").fill).toBe("#bdbdbd")
        expect(stringToColor("?").ink).toBe("#000000")
    })
})
