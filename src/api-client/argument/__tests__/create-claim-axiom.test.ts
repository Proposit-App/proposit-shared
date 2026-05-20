import { describe, expect, test } from "vitest"

import { createApiClient } from "../../index.js"
import type { TAxiomKind } from "../../../schemas/model/claims.js"

/**
 * Helper: build a minimal axiomatic-claim response body that round-trips
 * cleanly through AxiomAssignmentResponseSchema. The api-client method
 * exists to validate this on its way out so callers see a typed error
 * when the server's response shape drifts.
 */
function makeAxiomAssignmentResponseBody() {
    return {
        axiomClaim: {
            id: "ax-1",
            argumentId: "arg-1",
            version: 1,
            creatorId: "user-1",
            createdOn: new Date("2026-05-19").toISOString(),
            digest: "ax-1-digest",
            claimForkId: null,
            parentId: null,
            type: "axiomatic",
            kind: null,
            title: null,
            body: null,
            titleContentHash: null,
            url: null,
            citation: null,
            citationContentHash: null,
            axiom: "logical-principle",
        },
        derivationPremise: {
            id: "p-1",
            argumentId: "arg-1",
            argumentVersion: 1,
            creatorId: "user-1",
            createdOn: new Date("2026-05-19").toISOString(),
            title: null,
            role: "supporting",
            type: "derivation",
            derivedClaimId: "claim-q",
            checksum: "premise-checksum",
            descendantChecksum: "premise-descendant-checksum",
            combinedChecksum: "premise-combined-checksum",
        },
    }
}

function makeJsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    })
}

function urlToString(input: Parameters<typeof fetch>[0]): string {
    if (typeof input === "string") return input
    if (input instanceof URL) return input.href
    return input.url
}

describe("apiClient.createClaimAxiom", () => {
    test("POSTs to /api/v1/argument/[id]/[v]/claims/[claimId]/axiom with the axiom kind body", async () => {
        const calls: Array<{
            url: string
            method?: string
            body?: unknown
        }> = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body:
                    typeof init?.body === "string"
                        ? JSON.parse(init.body)
                        : init?.body,
            })
            return Promise.resolve(
                makeJsonResponse(201, makeAxiomAssignmentResponseBody())
            )
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const axiom: TAxiomKind = "logical-principle"
        const result = await apiClient.createClaimAxiom({
            argumentId: "arg-1",
            version: 1,
            claimId: "claim-q",
            axiom,
        })

        expect(calls).toHaveLength(1)
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/1/claims/claim-q/axiom"
        )
        expect(calls[0].method).toBe("POST")
        expect(calls[0].body).toEqual({ axiom: "logical-principle" })

        // strictFetch wraps the parsed body in a parseResponse discriminated
        // union ({ ok, value } on success, { ok: false, error } on failure).
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok=true")
        expect(result.value.axiomClaim.id).toBe("ax-1")
        expect(result.value.axiomClaim.type).toBe("axiomatic")
        expect(result.value.axiomClaim.axiom).toBe("logical-principle")
        expect(result.value.derivationPremise.type).toBe("derivation")
        expect(
            (result.value.derivationPremise as { derivedClaimId?: string })
                .derivedClaimId
        ).toBe("claim-q")
    })

    test("rejects malformed response bodies through strictFetch's schema validator", async () => {
        // Drop a required field from the response so the schema check
        // surfaces a parse rejection (rather than the api-client method
        // silently passing through a malformed payload).
        const malformed = makeAxiomAssignmentResponseBody() as Record<
            string,
            unknown
        >
        delete malformed.derivationPremise
        const fetchImpl: typeof fetch = () =>
            Promise.resolve(makeJsonResponse(201, malformed))
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await expect(
            apiClient.createClaimAxiom({
                argumentId: "arg-1",
                version: 1,
                claimId: "claim-q",
                axiom: "logical-principle",
            })
        ).rejects.toThrowError()
    })
})
