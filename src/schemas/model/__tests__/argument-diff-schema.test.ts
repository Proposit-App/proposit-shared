import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import { ArgumentDiffSchema } from "../arguments.js"

const emptyDiff = {
    claims: { added: [], removed: [], modified: [] },
    variables: { added: [], removed: [], modified: [] },
    premises: { added: [], removed: [], modified: [] },
    citations: { added: [], removed: [], modified: [] },
    roles: { conclusion: { before: null, after: null } },
}

describe("ArgumentDiffSchema", () => {
    it("accepts an empty four-bucket diff", () => {
        expect(Value.Check(ArgumentDiffSchema, emptyDiff)).toBe(true)
    })

    it("requires state on a modified variable entry", () => {
        const bad = structuredClone(emptyDiff)
        // a modified entry missing `state` must be rejected
        ;(bad.variables.modified as unknown[]).push({
            before: {},
            after: {},
            changes: [],
        })
        expect(Value.Check(ArgumentDiffSchema, bad)).toBe(false)
    })

    it("accepts modified-own / modified-within states and nested expression diffs", () => {
        const premise = {
            id: "p1",
            argumentId: "a1",
            argumentVersion: 1,
            checksum: "cs",
            descendantChecksum: null,
            combinedChecksum: "cs",
            type: "freeform",
            role: "supporting",
        }
        const operatorExpr = (operator: string) => ({
            id: "e1",
            argumentId: "a1",
            argumentVersion: 1,
            premiseId: "p1",
            parentId: null,
            position: 0,
            checksum: "cs",
            descendantChecksum: null,
            combinedChecksum: "cs",
            type: "operator",
            operator,
            variableId: null,
            createdOn: new Date(),
            creatorId: "u1",
        })
        const ok = structuredClone(emptyDiff)
        ;(ok.premises.modified as unknown[]).push({
            before: premise,
            after: premise,
            changes: [],
            state: "modified-within",
            expressions: {
                added: [],
                removed: [],
                modified: [
                    {
                        before: operatorExpr("and"),
                        after: operatorExpr("or"),
                        changes: [
                            { field: "operator", before: "and", after: "or" },
                        ],
                        state: "modified-own",
                    },
                ],
            },
        })
        expect(
            Value.Check(ArgumentDiffSchema.properties.premises, ok.premises)
        ).toBe(true)
    })
})
