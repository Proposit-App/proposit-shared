import { describe, it, expect } from "vitest"
import { buildDiffRenderMaps } from "../diff-render.js"

const empty = {
    claims: { added: [], removed: [], modified: [] },
    variables: { added: [], removed: [], modified: [] },
    premises: { added: [], removed: [], modified: [] },
    citations: { added: [], removed: [], modified: [] },
    roles: { conclusion: { before: null, after: null } },
}

describe("buildDiffRenderMaps", () => {
    it("maps modified-own to origin and modified-within to touched", () => {
        const diff = structuredClone(empty) as never as Parameters<
            typeof buildDiffRenderMaps
        >[0]
        diff.premises.modified.push({
            before: { id: "p1", role: "supporting" } as never,
            after: { id: "p1", role: "supporting" } as never,
            changes: [],
            state: "modified-within",
            expressions: {
                added: [],
                removed: [],
                modified: [
                    {
                        before: { id: "e1", type: "operator" } as never,
                        after: { id: "e1", type: "operator" } as never,
                        changes: [
                            { field: "operator", before: "and", after: "or" },
                        ],
                        state: "modified-own",
                    },
                ],
            },
        })
        const maps = buildDiffRenderMaps(diff)
        expect(maps.premiseDiffMap.get("p1")).toBe("touched")
        expect(maps.edgeDiffMap.get("e1")).toBe("origin")
    })

    it("added/removed premises get added/removed cues and removed lookup", () => {
        const diff = structuredClone(empty) as never as Parameters<
            typeof buildDiffRenderMaps
        >[0]
        diff.premises.added.push({ id: "pa", role: "supporting" } as never)
        diff.premises.removed.push({
            id: "pr",
            role: "conclusion",
            title: null,
        } as never)
        const maps = buildDiffRenderMaps(diff)
        expect(maps.premiseDiffMap.get("pa")).toBe("added")
        expect(maps.premiseDiffMap.get("pr")).toBe("removed")
        expect(maps.removedPremises.get("pr")?.role).toBe("conclusion")
    })

    it("keys citation cues on the endpoint pair and groups removed by citing claim", () => {
        const diff = structuredClone(empty) as never as Parameters<
            typeof buildDiffRenderMaps
        >[0]
        diff.citations.added.push({
            claimId: "c1",
            supportingClaimId: "s1",
        } as never)
        diff.citations.modified.push({
            before: { claimId: "c2", supportingClaimId: "s2" } as never,
            after: { claimId: "c2", supportingClaimId: "s2" } as never,
            changes: [],
            state: "modified-within",
        })
        diff.citations.removed.push({
            claimId: "c3",
            supportingClaimId: "s3",
        } as never)
        const maps = buildDiffRenderMaps(diff)
        expect(maps.citationDiffMap.get("c1:s1")).toBe("added")
        expect(maps.citationDiffMap.get("c2:s2")).toBe("touched")
        expect(maps.citationDiffMap.get("c3:s3")).toBe("removed")
        expect(maps.removedCitations.get("c3")).toHaveLength(1)
    })
})
