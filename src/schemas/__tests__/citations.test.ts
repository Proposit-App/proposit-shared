import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { ClaimCitationSchema } from "../model/citations.js"

describe("ClaimCitationSchema", () => {
    it("accepts an edge with all core + app-level fields", () => {
        const edge = {
            // core fields:
            id: "edge-uuid-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            claimId: "claim-uuid-aa-aaaa-aaaa-aaaaaaaaaaaa",
            claimVersion: 1,
            supportingClaimId: "supporting-uuid-aa-aaaa-aaaa-aaaaaaaaaaaa",
            supportingClaimVersion: 1,
            checksum: "sha256-edge-checksum",
            // app-level fields:
            argumentId: "arg-uuid-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            createdOn: new Date("2026-05-06T00:00:00Z"),
        }
        expect(Value.Check(ClaimCitationSchema, edge)).toBe(true)
    })

    it("does not require a top-level version field", () => {
        // Citation edges carry claimVersion + supportingClaimVersion (both
        // inherited from CoreClaimCitationSchema); they do NOT have a
        // standalone top-level `version`. The server's citations table
        // similarly has no `version` column. Validation must succeed when
        // the field is absent.
        const edge = {
            id: "edge-uuid-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            claimId: "claim-uuid-bb-bbbb-bbbb-bbbbbbbbbbbb",
            claimVersion: 1,
            supportingClaimId: "supporting-uuid-bb-bbbb-bbbb-bbbbbbbbbbbb",
            supportingClaimVersion: 1,
            checksum: "sha256-edge-checksum-2",
            argumentId: "arg-uuid-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            createdOn: new Date("2026-05-06T00:00:00Z"),
        }
        expect(Value.Check(ClaimCitationSchema, edge)).toBe(true)
    })

    it("rejects an edge missing claimId", () => {
        const edge = {
            id: "edge-uuid-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            claimVersion: 1,
            supportingClaimId: "supporting-uuid-aa-aaaa-aaaa-aaaaaaaaaaaa",
            supportingClaimVersion: 1,
            checksum: "sha256-edge-checksum",
            argumentId: "arg-uuid-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            version: 1,
            createdOn: new Date("2026-05-06T00:00:00Z"),
        }
        expect(Value.Check(ClaimCitationSchema, edge)).toBe(false)
    })
})
