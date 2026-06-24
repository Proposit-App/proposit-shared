import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    AxiomaticClaimSchema,
    CitationClaimSchema,
    ClaimForkSchema,
    ClaimSchema,
    ClaimWithChildrenSchema,
    isAxiomaticClaim,
    isCitationClaim,
    isNormalClaim,
    NormalClaimSchema,
    type TAxiomaticClaim,
    type TCitationClaim,
    type TClaimFork,
    type TNormalClaim,
} from "../model/claims.js"

const ID = "11111111-1111-1111-1111-111111111111"
const ARG_ID = "22222222-2222-2222-2222-222222222222"
const CREATOR_ID = "33333333-3333-3333-3333-333333333333"
const NOW = new Date("2026-05-06T00:00:00Z")

const normalBase = {
    id: ID,
    originArgumentId: ARG_ID,
    version: 1,
    published: false,
    publishedOn: null,
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
    originArgumentId: ARG_ID,
    version: 1,
    published: false,
    publishedOn: null,
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

// Same citation claim, but carrying an ingestion-extracted unparsed citation
// (raw text + a guessed reference type + optional locator) instead of a
// structured IEEE reference. Discriminated from the IEEE branch by
// `citation.type === "unparsed"`.
const unparsedCitationBase = {
    ...citationBase,
    digest: "digest-citation-unparsed",
    citation: {
        type: "unparsed",
        text: "Mill, On Liberty (the Pooley case)",
        citationTypeGuess: "Book",
        url: "https://example.com/on-liberty",
    },
}

const axiomaticBase = {
    id: ID,
    originArgumentId: ARG_ID,
    version: 1,
    published: false,
    publishedOn: null,
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

    // The citation field is a Nullable(IEEE | Unparsed) union. Ingestion-
    // extracted citations that have not been structured into IEEE attach here
    // as `{ type: "unparsed", text, citationTypeGuess, url? }`.
    it("accepts a citation claim carrying an unparsed citation", () => {
        expect(Value.Check(CitationClaimSchema, unparsedCitationBase)).toBe(
            true
        )
    })

    it("accepts an unparsed citation with no url and an unknown guess", () => {
        const noUrl = {
            ...unparsedCitationBase,
            citation: {
                type: "unparsed",
                text: "the Apologia",
                citationTypeGuess: "unknown",
            },
        }
        expect(Value.Check(CitationClaimSchema, noUrl)).toBe(true)
    })

    it("rejects a citation whose citation.type is neither an IEEE type nor unparsed", () => {
        const bad = {
            ...citationBase,
            citation: {
                type: "Nonsense",
                text: "x",
                citationTypeGuess: "unknown",
            },
        }
        expect(Value.Check(CitationClaimSchema, bad)).toBe(false)
    })

    it("discriminates the citation union on citation.type", () => {
        // IEEE branch (the 33 literals)
        expect(Value.Check(CitationClaimSchema, citationBase)).toBe(true)
        // unparsed branch
        expect(Value.Check(CitationClaimSchema, unparsedCitationBase)).toBe(
            true
        )
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

    it("accepts a citation-variant claim carrying an unparsed citation", () => {
        expect(Value.Check(ClaimSchema, unparsedCitationBase)).toBe(true)
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

// Decoupling: a claim is its own independently-versioned entity. `version` is
// the claim's own trunk version; `originArgumentId` is nullable provenance (the
// argument the claim was first created in), not ownership; `published` /
// `publishedOn` carry per-claim-version publish state. These fields live on the
// shared base, so the same checks hold across all three variants — normalBase
// exercises the base.
describe("Claim identity & publish fields (decoupled from argument)", () => {
    it("accepts a claim with a null originArgumentId (no single origin)", () => {
        const orphan = { ...normalBase, originArgumentId: null }
        expect(Value.Check(ClaimSchema, orphan)).toBe(true)
    })

    it("rejects a claim missing originArgumentId (required field)", () => {
        const { originArgumentId: _omit, ...bad } = normalBase
        expect(Value.Check(ClaimSchema, bad)).toBe(false)
    })

    it("rejects a claim carrying the legacy argumentId without originArgumentId", () => {
        const { originArgumentId: _omit, ...rest } = normalBase
        const legacy = { ...rest, argumentId: ARG_ID }
        expect(Value.Check(ClaimSchema, legacy)).toBe(false)
    })

    it("accepts a published claim with a publishedOn timestamp", () => {
        const published = { ...normalBase, published: true, publishedOn: NOW }
        expect(Value.Check(ClaimSchema, published)).toBe(true)
    })

    it("rejects a non-boolean published", () => {
        const bad = { ...normalBase, published: "true" }
        expect(Value.Check(ClaimSchema, bad)).toBe(false)
    })

    it("rejects a claim missing published (required field)", () => {
        const { published: _omit, ...bad } = normalBase
        expect(Value.Check(ClaimSchema, bad)).toBe(false)
    })

    it("rejects a claim missing publishedOn (required, but nullable)", () => {
        const { publishedOn: _omit, ...bad } = normalBase
        expect(Value.Check(ClaimSchema, bad)).toBe(false)
    })

    it("rejects a non-date, non-null publishedOn", () => {
        const bad = { ...normalBase, publishedOn: 12345 }
        expect(Value.Check(ClaimSchema, bad)).toBe(false)
    })
})

describe("ClaimForkSchema (re-exported from the package index)", () => {
    const claimFork = {
        entityId: ID,
        forkedFromEntityId: ARG_ID,
        forkedFromArgumentId: ARG_ID,
        forkedFromArgumentVersion: 1,
        forkId: ID,
        forkedFromEntityVersion: 2,
        sourceUserId: CREATOR_ID,
        forkedByUserId: CREATOR_ID,
    }

    it("validates a well-formed claim-fork provenance record", () => {
        expect(Value.Check(ClaimForkSchema, claimFork)).toBe(true)
    })

    it("accepts null forkedFromEntityVersion (source version may be unknown)", () => {
        const noVersion = { ...claimFork, forkedFromEntityVersion: null }
        expect(Value.Check(ClaimForkSchema, noVersion)).toBe(true)
    })

    it("rejects a record missing the user attribution", () => {
        const { sourceUserId: _omit, ...bad } = claimFork
        expect(Value.Check(ClaimForkSchema, bad)).toBe(false)
    })

    it("the derived TClaimFork type carries the fork fields", () => {
        const typed: TClaimFork = claimFork
        expect(typed.forkedByUserId).toBe(CREATOR_ID)
    })
})
