import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import { composeArgumentDiff } from "../diff.js"
import { PropositionalPremiseSchema } from "../../schemas/logic.js"

// minimal TCoreArgumentDiff-shaped fixture (unchanged structural diff)
const emptyCore = {
    argument: { before: {}, after: {}, changes: [], state: "modified-within" },
    variables: { added: [], removed: [], modified: [] },
    premises: { added: [], removed: [], modified: [] },
    roles: { conclusion: { before: "p1", after: "p1" } },
} as const

const claim = (id: string, digest: string) =>
    ({ id, digest, type: "normal" }) as unknown as Parameters<
        typeof composeArgumentDiff
    >[0]["claimsAfter"][number]

describe("composeArgumentDiff", () => {
    it("unchanged inputs produce an empty diff (diff-stability)", () => {
        const c = claim("c1", "d1")
        const out = composeArgumentDiff({
            coreDiff: emptyCore as never,
            claimsBefore: [c],
            claimsAfter: [c],
            citationsBefore: [],
            citationsAfter: [],
            derivationPremiseIds: new Set(),
            premisesBefore: [],
            premisesAfter: [],
        })
        expect(out.claims).toEqual({ added: [], removed: [], modified: [] })
        expect(out.roles.conclusion).toEqual({ before: "p1", after: "p1" })
    })

    it("a claim digest change is exactly one modified-own origin", () => {
        const out = composeArgumentDiff({
            coreDiff: emptyCore as never,
            claimsBefore: [claim("c1", "OLD")],
            claimsAfter: [claim("c1", "NEW")],
            citationsBefore: [],
            citationsAfter: [],
            derivationPremiseIds: new Set(),
            premisesBefore: [],
            premisesAfter: [],
        })
        expect(out.claims.added).toEqual([])
        expect(out.claims.removed).toEqual([])
        expect(out.claims.modified).toHaveLength(1)
        expect(out.claims.modified[0].state).toBe("modified-own")
        expect(out.claims.modified[0].after.id).toBe("c1")
    })

    it("filters derivation-premise entries", () => {
        const coreWithDeriv = {
            ...emptyCore,
            premises: {
                added: [{ id: "dp", type: "derivation", role: "supporting" }],
                removed: [],
                modified: [],
            },
        }
        const out = composeArgumentDiff({
            coreDiff: coreWithDeriv as never,
            claimsBefore: [],
            claimsAfter: [],
            citationsBefore: [],
            citationsAfter: [],
            derivationPremiseIds: new Set(["dp"]),
            premisesBefore: [],
            premisesAfter: [],
        })
        expect(out.premises.added).toEqual([])
    })

    it("re-attaches role so a role-less core premise becomes schema-valid", () => {
        // The core diff carries a modified premise WITHOUT `role` — mirrors what
        // core.diffArguments emits (role is a property of the argument/premise
        // pairing, not the premise entity).
        const coreModifiedPremise = {
            id: "p1",
            argumentId: "a1",
            argumentVersion: 1,
            checksum: "cs",
            descendantChecksum: null,
            combinedChecksum: "cs",
            type: "freeform",
        }
        // Control: the raw core premise is NOT valid on its own (role required).
        expect(Value.Check(PropositionalPremiseSchema, coreModifiedPremise)).toBe(
            false
        )

        const appPremise = { ...coreModifiedPremise, role: "supporting" }
        const coreWithModified = {
            ...emptyCore,
            premises: {
                added: [],
                removed: [],
                modified: [
                    {
                        before: coreModifiedPremise,
                        after: coreModifiedPremise,
                        changes: [],
                        state: "modified-within",
                        expressions: { added: [], removed: [], modified: [] },
                    },
                ],
            },
        }
        const out = composeArgumentDiff({
            coreDiff: coreWithModified as never,
            claimsBefore: [],
            claimsAfter: [],
            citationsBefore: [],
            citationsAfter: [],
            derivationPremiseIds: new Set(),
            premisesBefore: [appPremise as never],
            premisesAfter: [appPremise as never],
        })
        expect(out.premises.modified).toHaveLength(1)
        expect(
            Value.Check(
                PropositionalPremiseSchema,
                out.premises.modified[0].after
            )
        ).toBe(true)
        expect(
            Value.Check(
                PropositionalPremiseSchema,
                out.premises.modified[0].before
            )
        ).toBe(true)
    })
})
