import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    AttachOriginDocumentRequestSchema,
    CreateOriginAnchorRequestSchema,
    GetOriginResponseSchema,
    MarkEnthymemeRequestSchema,
    UpdateOriginRequestSchema,
} from "../api/argument/index.js"

describe("origin API bodies", () => {
    it("accepts an attach request with only the pasted text", () => {
        expect(
            Value.Check(AttachOriginDocumentRequestSchema, {
                text: "All men are mortal.",
            })
        ).toBe(true)
    })

    it("rejects a stance outside the union", () => {
        expect(
            Value.Check(AttachOriginDocumentRequestSchema, {
                text: "x",
                stance: "paraphrase",
            })
        ).toBe(false)
    })

    it("accepts a null reference on the update body, to clear an attribution", () => {
        expect(
            Value.Check(UpdateOriginRequestSchema, { reference: null })
        ).toBe(true)
    })

    it("constrains an anchor's target type to the three argument-scoped kinds", () => {
        const base = {
            targetId: "premise-1",
            startCodePoint: 0,
            endCodePoint: 4,
        }
        expect(
            Value.Check(CreateOriginAnchorRequestSchema, {
                ...base,
                targetType: "premise",
            })
        ).toBe(true)
        expect(
            Value.Check(CreateOriginAnchorRequestSchema, {
                ...base,
                targetType: "claim",
            })
        ).toBe(false)
    })

    it("rejects a negative code-point offset", () => {
        expect(
            Value.Check(CreateOriginAnchorRequestSchema, {
                targetType: "premise",
                targetId: "premise-1",
                startCodePoint: -1,
                endCodePoint: 4,
            })
        ).toBe(false)
    })

    it("models an unattached argument as nulls on the read response", () => {
        expect(
            Value.Check(GetOriginResponseSchema, {
                document: null,
                link: null,
                anchors: [],
            })
        ).toBe(true)
    })

    it("requires the enthymeme mark to be a boolean", () => {
        expect(Value.Check(MarkEnthymemeRequestSchema, { marked: true })).toBe(
            true
        )
        expect(Value.Check(MarkEnthymemeRequestSchema, { marked: "yes" })).toBe(
            false
        )
    })
})
