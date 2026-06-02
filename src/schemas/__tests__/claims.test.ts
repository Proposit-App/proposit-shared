import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    AxiomaticClaimSchema,
    CitationClaimSchema,
    ClaimSchema,
    ClaimWithChildrenSchema,
    isAxiomaticClaim,
    isCitationClaim,
    isNormalClaim,
    NormalClaimSchema,
    type TAxiomaticClaim,
    type TCitationClaim,
    type TNormalClaim,
} from "../model/claims.js"

const ID = "11111111-1111-1111-1111-111111111111"
const ARG_ID = "22222222-2222-2222-2222-222222222222"
const CREATOR_ID = "33333333-3333-3333-3333-333333333333"
const NOW = new Date("2026-05-06T00:00:00Z")

const normalBase = {
    id: ID,
    argumentId: ARG_ID,
    version: 1,
    claimForkId: null,
    creatorId: CREATOR_ID,
    createdOn: NOW,
    parentId: null,
    digest: "digest-normal",
    type: "normal" as const,
    kind: "claim" as const,
    title: "Cats are mammals",
    body: "All cats are mammals.",
    titleContentHash: "hash-of-title",
    url: null,
    citation: null,
    citationContentHash: null,
    axiom: null,
}

const citationBase = {
    id: ID,
    argumentId: ARG_ID,
    version: 1,
    claimForkId: null,
    creatorId: CREATOR_ID,
    createdOn: NOW,
    parentId: null,
    digest: "digest-citation",
    type: "citation" as const,
    kind: null,
    title: null,
    body: null,
    titleContentHash: null,
    url: "https://example.com/paper",
    // Schema-valid IEEE shape; not a complete reference. If IEEEReferenceSchema
    // changes shape, update this fixture.
    citation: {
        type: "JournalArticle",
        authors: [{ givenNames: "A", familyName: "Author" }],
        year: "2024",
        title: "An IEEE-style title",
        journalTitle: "Journal of Examples",
    },
    citationContentHash: "hash-of-citation",
    axiom: null,
}

const axiomaticBase = {
    id: ID,
    argumentId: ARG_ID,
    version: 1,
    claimForkId: null,
    creatorId: CREATOR_ID,
    createdOn: NOW,
    parentId: null,
    digest: "digest-axiomatic",
    type: "axiomatic" as const,
    kind: null,
    title: null,
    body: null,
    titleContentHash: null,
    url: null,
    citation: null,
    citationContentHash: null,
    axiom: "definition" as const,
}

describe("NormalClaimSchema", () => {
    it("accepts a well-formed normal claim", () => {
        expect(Value.Check(NormalClaimSchema, normalBase)).toBe(true)
    })

    it("rejects a normal claim with a non-null citation field", () => {
        const bad = { ...normalBase, url: "https://wrong.example.com" }
        expect(Value.Check(NormalClaimSchema, bad)).toBe(false)
    })

    it("rejects a normal claim with a non-null axiom field", () => {
        const bad = { ...normalBase, axiom: "definition" }
        expect(Value.Check(NormalClaimSchema, bad)).toBe(false)
    })

    it("rejects a normal claim with null titleContentHash", () => {
        const bad = { ...normalBase, titleContentHash: null }
        expect(Value.Check(NormalClaimSchema, bad)).toBe(false)
    })

    it("rejects a normal claim with null title", () => {
        const bad = { ...normalBase, title: null }
        expect(Value.Check(NormalClaimSchema, bad)).toBe(false)
    })

    it("rejects a normal claim with null body", () => {
        const bad = { ...normalBase, body: null }
        expect(Value.Check(NormalClaimSchema, bad)).toBe(false)
    })
})

describe("CitationClaimSchema", () => {
    it("accepts a well-formed citation claim", () => {
        expect(Value.Check(CitationClaimSchema, citationBase)).toBe(true)
    })

    it("rejects a citation claim whose title is non-null", () => {
        const bad = { ...citationBase, title: "Some title" }
        expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
    })

    it("rejects a citation claim whose kind is non-null", () => {
        const bad = { ...citationBase, kind: "claim" }
        expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
    })

    it("rejects a citation claim missing the URL", () => {
        const bad = { ...citationBase, url: null }
        expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
    })

    it("rejects a citation claim with a non-null axiom field", () => {
        const bad = { ...citationBase, axiom: "definition" }
        expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
    })

    // v2 ingestion produces url-only citation claims: a `url` is present but no
    // structured IEEE reference was extracted, so `citation` is null. This is a
    // legitimate, validatable shape — the entire-argument response 500'd before
    // the citation field was widened to nullable.
    it("accepts a url-only citation claim (null citation)", () => {
        const urlOnly = { ...citationBase, citation: null }
        expect(Value.Check(CitationClaimSchema, urlOnly)).toBe(true)
    })

    it("rejects a citation claim missing the citation field entirely", () => {
        const { citation: _omit, ...bad } = citationBase
        expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
    })
})

describe("AxiomaticClaimSchema", () => {
    it("accepts a well-formed axiomatic claim for each axiom kind", () => {
        const kinds = [
            "definition",
            "stipulation",
            "logical-principle",
            "mathematical-principle",
            "domain-rule",
            "background-assumption",
        ] as const
        for (const axiom of kinds) {
            expect(
                Value.Check(AxiomaticClaimSchema, { ...axiomaticBase, axiom })
            ).toBe(true)
        }
    })

    it("rejects an axiomatic claim with a non-null title", () => {
        const bad = { ...axiomaticBase, title: "Some title" }
        expect(Value.Check(AxiomaticClaimSchema, bad)).toBe(false)
    })

    it("rejects an axiomatic claim with a non-null citation field", () => {
        const bad = { ...axiomaticBase, url: "https://example.com" }
        expect(Value.Check(AxiomaticClaimSchema, bad)).toBe(false)
    })

    it("rejects an axiomatic claim whose axiom is null", () => {
        const bad = { ...axiomaticBase, axiom: null }
        expect(Value.Check(AxiomaticClaimSchema, bad)).toBe(false)
    })

    it("rejects an axiomatic claim whose axiom is an unrecognised literal", () => {
        const bad = { ...axiomaticBase, axiom: "made-up-kind" }
        expect(Value.Check(AxiomaticClaimSchema, bad)).toBe(false)
    })
})

describe("ClaimSchema (union)", () => {
    it("accepts a normal-variant claim", () => {
        expect(Value.Check(ClaimSchema, normalBase)).toBe(true)
    })

    it("accepts a citation-variant claim", () => {
        expect(Value.Check(ClaimSchema, citationBase)).toBe(true)
    })

    // Regression guard for the entire-argument response 500: the claims array in
    // FullArgumentSchema is Type.Array(ClaimSchema). A url-only citation claim
    // (citation: null) coming back from the server's getCitations read path must
    // resolve to the citation branch of the union, not fail every branch.
    it("accepts a url-only citation-variant claim (null citation)", () => {
        const urlOnly = { ...citationBase, citation: null }
        expect(Value.Check(ClaimSchema, urlOnly)).toBe(true)
    })

    it("accepts an axiomatic-variant claim", () => {
        expect(Value.Check(ClaimSchema, axiomaticBase)).toBe(true)
    })

    it("rejects an object whose type is not one of the three literals", () => {
        const bad = { ...normalBase, type: "unknown" }
        expect(Value.Check(ClaimSchema, bad)).toBe(false)
    })
})

describe("ClaimWithChildrenSchema", () => {
    // Widened from NormalClaim-only to
    // NormalClaim | AxiomaticClaim. The server's getClaims() no longer
    // filters by type='normal' before populating childClaimIds / childCitationIds
    // (the server removed that filter), so axiomatic claims now flow
    // through this surface and must validate.
    const withChildrenExtras = {
        childClaimIds: [],
        childCitationIds: [],
    }

    it("accepts a normal claim with children-id arrays", () => {
        const payload = { ...normalBase, ...withChildrenExtras }
        expect(Value.Check(ClaimWithChildrenSchema, payload)).toBe(true)
    })

    it("accepts an axiomatic claim with children-id arrays", () => {
        const payload = { ...axiomaticBase, ...withChildrenExtras }
        expect(Value.Check(ClaimWithChildrenSchema, payload)).toBe(true)
    })

    it("rejects a citation claim (citations don't carry children)", () => {
        const payload = { ...citationBase, ...withChildrenExtras }
        expect(Value.Check(ClaimWithChildrenSchema, payload)).toBe(false)
    })

    it("rejects a claim missing the children-id arrays", () => {
        expect(Value.Check(ClaimWithChildrenSchema, normalBase)).toBe(false)
    })
})

describe("Claim type guards", () => {
    it("isNormalClaim narrows correctly", () => {
        const c = normalBase as TNormalClaim
        expect(isNormalClaim(c)).toBe(true)
        expect(isCitationClaim(c)).toBe(false)
        expect(isAxiomaticClaim(c)).toBe(false)
    })

    it("isCitationClaim narrows correctly", () => {
        const c = citationBase as TCitationClaim
        expect(isCitationClaim(c)).toBe(true)
        expect(isNormalClaim(c)).toBe(false)
        expect(isAxiomaticClaim(c)).toBe(false)
    })

    it("isAxiomaticClaim narrows correctly", () => {
        const c = axiomaticBase as TAxiomaticClaim
        expect(isAxiomaticClaim(c)).toBe(true)
        expect(isNormalClaim(c)).toBe(false)
        expect(isCitationClaim(c)).toBe(false)
    })
})
