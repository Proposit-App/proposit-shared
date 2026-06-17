import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    UnparsedCitationSchema,
    type TUnparsedCitation,
} from "../model/references.js"

describe("references re-export of the unparsed citation surface", () => {
    it("re-exports UnparsedCitationSchema and validates an unparsed citation", () => {
        const citation: TUnparsedCitation = {
            type: "unparsed",
            text: "Mill, On Liberty (Pooley case)",
            citationTypeGuess: "Book",
            url: "https://example.com/on-liberty",
        }
        expect(Value.Check(UnparsedCitationSchema, citation)).toBe(true)
    })

    it("validates an unparsed citation with no url and an unknown guess", () => {
        const citation: TUnparsedCitation = {
            type: "unparsed",
            text: "the Apologia",
            citationTypeGuess: "unknown",
        }
        expect(Value.Check(UnparsedCitationSchema, citation)).toBe(true)
    })
})
