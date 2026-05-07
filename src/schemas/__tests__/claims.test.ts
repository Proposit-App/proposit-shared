import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { ClaimSchema } from "../model/claims.js"

describe("ClaimSchema citation discriminator", () => {
    it("accepts a normal claim without citation extras", () => {
        const claim = {
            id: "11111111-1111-1111-1111-111111111111",
            argumentId: "22222222-2222-2222-2222-222222222222",
            version: 1,
            claimForkId: null,
            creatorId: "33333333-3333-3333-3333-333333333333",
            createdOn: new Date("2026-05-06T00:00:00Z"),
            kind: "claim",
            type: "normal",
            parentId: null,
            title: "Cats are mammals",
            body: "All cats are mammals.",
            digest: "digest-1",
        }
        expect(Value.Check(ClaimSchema, claim)).toBe(true)
    })

    it("accepts a citation-typed claim with URL and IEEE reference extras", () => {
        const claim = {
            id: "11111111-1111-1111-1111-111111111111",
            argumentId: "22222222-2222-2222-2222-222222222222",
            version: 1,
            claimForkId: null,
            creatorId: "33333333-3333-3333-3333-333333333333",
            createdOn: new Date("2026-05-06T00:00:00Z"),
            kind: "claim",
            type: "citation",
            parentId: null,
            title: "Smith 2024",
            body: "Smith, J. 2024. Cat taxonomy. Nature.",
            digest: "digest-2",
            url: "https://example.com/smith-2024",
            citation: {
                type: "JournalArticle",
                title: "Cat taxonomy",
                year: "2024",
                authors: [{ givenNames: "J.", familyName: "Smith" }],
                journalTitle: "Nature",
            },
            citationContentHash: "sha256-abc123",
        }
        expect(Value.Check(ClaimSchema, claim)).toBe(true)
    })

    it("rejects a claim missing the type discriminator (legacy data)", () => {
        const legacyClaim = {
            id: "11111111-1111-1111-1111-111111111111",
            argumentId: "22222222-2222-2222-2222-222222222222",
            version: 1,
            claimForkId: null,
            creatorId: "33333333-3333-3333-3333-333333333333",
            createdOn: new Date("2026-05-06T00:00:00Z"),
            kind: "claim",
            // type omitted
            parentId: null,
            title: "Legacy",
            body: "Legacy claim shape.",
            digest: "digest-3",
        }
        expect(Value.Check(ClaimSchema, legacyClaim)).toBe(false)
    })

    it("accepts a normal claim with citation explicitly set to null", () => {
        // Postgres stores `citation: NULL` for normal-type claims; the
        // wire payload that comes back from the server therefore carries
        // `citation: null`, not an absent field. Schema must accept that.
        const claim = {
            id: "11111111-1111-1111-1111-111111111111",
            argumentId: "22222222-2222-2222-2222-222222222222",
            version: 1,
            claimForkId: null,
            creatorId: "33333333-3333-3333-3333-333333333333",
            createdOn: new Date("2026-05-06T00:00:00Z"),
            kind: "claim",
            type: "normal",
            parentId: null,
            title: "Cats are mammals",
            body: "All cats are mammals.",
            digest: "digest-null-citation",
            url: null,
            citation: null,
            citationContentHash: null,
        }
        expect(Value.Check(ClaimSchema, claim)).toBe(true)
    })

    it("rejects a claim using the old 'type' field for category", () => {
        const oldShape = {
            id: "11111111-1111-1111-1111-111111111111",
            argumentId: "22222222-2222-2222-2222-222222222222",
            version: 1,
            claimForkId: null,
            creatorId: "33333333-3333-3333-3333-333333333333",
            createdOn: new Date("2026-05-06T00:00:00Z"),
            type: "claim", // old shape: category in `type`
            parentId: null,
            title: "Old",
            body: "Old shape.",
            digest: "digest-4",
        }
        expect(Value.Check(ClaimSchema, oldShape)).toBe(false)
    })
})
