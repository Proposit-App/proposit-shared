import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import { composeArgumentDiff } from "../diff.js"
import {
    PropositionalPremiseSchema,
    PropositionalVariableSchema,
} from "../../schemas/logic.js"
import type { TClaimCitation } from "../../schemas/model/citations.js"

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
        expect(
            Value.Check(PropositionalPremiseSchema, coreModifiedPremise)
        ).toBe(false)

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

    it("throws when a core-referenced premise is missing from the supplied arrays", () => {
        const coreWithAdded = {
            ...emptyCore,
            premises: {
                added: [{ id: "pX", type: "freeform" }],
                removed: [],
                modified: [],
            },
        }
        expect(() =>
            composeArgumentDiff({
                coreDiff: coreWithAdded as never,
                claimsBefore: [],
                claimsAfter: [],
                citationsBefore: [],
                citationsAfter: [],
                derivationPremiseIds: new Set(),
                premisesBefore: [],
                premisesAfter: [], // pX absent — must fail loud, not emit invalid output
            })
        ).toThrow(/pX/)
    })

    it("passes core variables through as schema-valid app-level variables", () => {
        // Unlike premises (core strips `role`), the engine returns stored
        // variable objects whole — so a caller supplying app-level variables
        // yields a schema-valid composed `variables` with no re-sourcing.
        const appVariable = {
            id: "v1",
            argumentId: "a1",
            argumentVersion: 1,
            symbol: "P",
            checksum: "cs",
            claimId: "cl1",
            claimVersion: 0,
            createdOn: new Date(),
            creatorId: "u1",
            descendantChecksum: null,
            combinedChecksum: "cs",
        }
        const coreWithVar = {
            ...emptyCore,
            variables: {
                added: [],
                removed: [],
                modified: [
                    {
                        before: appVariable,
                        after: appVariable,
                        changes: [{ field: "symbol", before: "P", after: "P" }],
                        state: "modified-own",
                    },
                ],
            },
        }
        const out = composeArgumentDiff({
            coreDiff: coreWithVar as never,
            claimsBefore: [],
            claimsAfter: [],
            citationsBefore: [],
            citationsAfter: [],
            derivationPremiseIds: new Set(),
            premisesBefore: [],
            premisesAfter: [],
        })
        expect(
            Value.Check(
                PropositionalVariableSchema,
                out.variables.modified[0].after
            )
        ).toBe(true)
    })
})

const premise = (id: string, title?: string | null) =>
    ({
        id,
        argumentId: "a1",
        argumentVersion: 1,
        checksum: "cs",
        descendantChecksum: null,
        combinedChecksum: "cs",
        type: "freeform",
        role: "supporting",
        ...(title === undefined ? {} : { title }),
    }) as unknown as Parameters<
        typeof composeArgumentDiff
    >[0]["premisesAfter"][number]

describe("composeArgumentDiff — premise titles", () => {
    const titleBase = {
        coreDiff: emptyCore as never,
        claimsBefore: [],
        claimsAfter: [],
        citationsBefore: [],
        citationsAfter: [],
        derivationPremiseIds: new Set<string>(),
    }

    it("reports a title-only edit as the premise's own change", () => {
        // The premise checksum excludes display text, so core sees nothing —
        // without the app-level comparison the version would read as unchanged.
        const out = composeArgumentDiff({
            ...titleBase,
            premisesBefore: [premise("p1", "Old title")],
            premisesAfter: [premise("p1", "New title")],
        })
        expect(out.premises.modified).toHaveLength(1)
        expect(out.premises.modified[0].after.id).toBe("p1")
        expect(out.premises.modified[0].state).toBe("modified-own")
        expect(out.premises.modified[0].changes).toEqual([
            { field: "title", before: "Old title", after: "New title" },
        ])
        expect(out.premises.modified[0].expressions).toEqual({
            added: [],
            removed: [],
            modified: [],
        })
    })

    it("leaves a premise whose title is unchanged out of the diff", () => {
        const out = composeArgumentDiff({
            ...titleBase,
            premisesBefore: [premise("p1", "Same title")],
            premisesAfter: [premise("p1", "Same title")],
        })
        expect(out.premises).toEqual({
            added: [],
            removed: [],
            modified: [],
        })
    })

    it("treats absent, null and empty-string titles as the same value", () => {
        for (const [before, after] of [
            [null, ""],
            ["", null],
            [undefined, null],
            [undefined, ""],
        ] as (string | null | undefined)[][]) {
            const out = composeArgumentDiff({
                ...titleBase,
                premisesBefore: [premise("p1", before)],
                premisesAfter: [premise("p1", after)],
            })
            expect(out.premises.modified).toEqual([])
        }
        // …while gaining or losing real text is a change.
        const gained = composeArgumentDiff({
            ...titleBase,
            premisesBefore: [premise("p1", null)],
            premisesAfter: [premise("p1", "A title")],
        })
        expect(gained.premises.modified).toHaveLength(1)
        expect(gained.premises.modified[0].state).toBe("modified-own")
    })

    it("merges a title change into the structural entry for the same premise", () => {
        const before = premise("p1", "Old title")
        const after = premise("p1", "New title")
        const coreWithModified = {
            ...emptyCore,
            premises: {
                added: [],
                removed: [],
                modified: [
                    {
                        before,
                        after,
                        changes: [
                            { field: "checksum", before: "cs", after: "cs2" },
                        ],
                        state: "modified-own",
                        expressions: { added: [], removed: [], modified: [] },
                    },
                ],
            },
        }
        const out = composeArgumentDiff({
            ...titleBase,
            coreDiff: coreWithModified as never,
            premisesBefore: [before],
            premisesAfter: [after],
        })
        expect(out.premises.modified).toHaveLength(1)
        expect(out.premises.modified[0].changes).toEqual([
            { field: "checksum", before: "cs", after: "cs2" },
            { field: "title", before: "Old title", after: "New title" },
        ])
    })

    it("promotes a modified-within premise to modified-own when its title changed", () => {
        const before = premise("p1", "Old title")
        const after = premise("p1", "New title")
        const coreWithModified = {
            ...emptyCore,
            premises: {
                added: [],
                removed: [],
                modified: [
                    {
                        before,
                        after,
                        changes: [],
                        state: "modified-within",
                        expressions: { added: [], removed: [], modified: [] },
                    },
                ],
            },
        }
        const out = composeArgumentDiff({
            ...titleBase,
            coreDiff: coreWithModified as never,
            premisesBefore: [before],
            premisesAfter: [after],
        })
        expect(out.premises.modified).toHaveLength(1)
        expect(out.premises.modified[0].state).toBe("modified-own")
    })

    it("ignores a title change on a derivation premise", () => {
        const out = composeArgumentDiff({
            ...titleBase,
            derivationPremiseIds: new Set(["dp"]),
            premisesBefore: [premise("dp", "Old title")],
            premisesAfter: [premise("dp", "New title")],
        })
        expect(out.premises.modified).toEqual([])
    })

    it("does not report a title on a premise that only exists on one side", () => {
        const out = composeArgumentDiff({
            ...titleBase,
            premisesBefore: [],
            premisesAfter: [premise("p1", "A title")],
        })
        expect(out.premises.modified).toEqual([])
    })
})

const cite = (
    claimId: string,
    supportingClaimId: string,
    supportingClaimVersion: number,
    checksum = "k",
    claimVersion = 0
): TClaimCitation =>
    ({
        id: `row-${Math.random()}`, // deliberately unstable — must NOT be identity
        claimId,
        claimVersion,
        supportingClaimId,
        supportingClaimVersion,
        checksum,
        argumentId: "a1",
        createdOn: new Date().toISOString(),
    }) as unknown as TClaimCitation

const citationBase = {
    coreDiff: {
        argument: {
            before: {},
            after: {},
            changes: [],
            state: "modified-within",
        },
        variables: { added: [], removed: [], modified: [] },
        premises: { added: [], removed: [], modified: [] },
        roles: { conclusion: { before: null, after: null } },
    } as never,
    claimsBefore: [],
    claimsAfter: [],
    derivationPremiseIds: new Set<string>(),
    premisesBefore: [],
    premisesAfter: [],
}

describe("composeArgumentDiff — citations", () => {
    it("new endpoint pair is added; dropped pair is removed", () => {
        const out = composeArgumentDiff({
            ...citationBase,
            citationsBefore: [cite("c1", "s1", 0)],
            citationsAfter: [cite("c1", "s2", 0)],
        })
        expect(out.citations.added.map((c) => c.supportingClaimId)).toEqual([
            "s2",
        ])
        expect(out.citations.removed.map((c) => c.supportingClaimId)).toEqual([
            "s1",
        ])
        expect(out.citations.modified).toEqual([])
    })

    it("same endpoint pair with a bumped supporting version is modified-within", () => {
        const out = composeArgumentDiff({
            ...citationBase,
            citationsBefore: [cite("c1", "s1", 0)],
            citationsAfter: [cite("c1", "s1", 1)],
        })
        expect(out.citations.added).toEqual([])
        expect(out.citations.removed).toEqual([])
        expect(out.citations.modified).toHaveLength(1)
        expect(out.citations.modified[0].state).toBe("modified-within")
        expect(out.citations.modified[0].after.supportingClaimVersion).toBe(1)
    })

    it("a citing-side claimVersion bump alone is NOT a citation change", () => {
        // Only the referent's own change (supportingClaimVersion / checksum)
        // propagates. The citing claim's own head-bump must not flip its edges.
        const out = composeArgumentDiff({
            ...citationBase,
            citationsBefore: [cite("c1", "s1", 0, "same", 0)],
            citationsAfter: [cite("c1", "s1", 0, "same", 5)],
        })
        expect(out.citations).toEqual({ added: [], removed: [], modified: [] })
    })

    it("identical citation sets produce no citation diff (stability)", () => {
        const out = composeArgumentDiff({
            ...citationBase,
            citationsBefore: [cite("c1", "s1", 0, "same")],
            citationsAfter: [cite("c1", "s1", 0, "same")],
        })
        expect(out.citations).toEqual({ added: [], removed: [], modified: [] })
    })

    it("a claim citing an edited claim is modified-within", () => {
        const c1Before = claim("c1", "d")
        const c1After = claim("c1", "d") // c1's own content is unchanged
        const s1Before = claim("s1", "OLD")
        const s1After = claim("s1", "NEW") // the cited claim was edited
        const out = composeArgumentDiff({
            ...citationBase,
            claimsBefore: [c1Before, s1Before],
            claimsAfter: [c1After, s1After],
            // c1 cites s1; the pin advances as s1 edits
            citationsBefore: [cite("c1", "s1", 0)],
            citationsAfter: [cite("c1", "s1", 1)],
        })
        const s1 = out.claims.modified.find((m) => m.after.id === "s1")
        const c1 = out.claims.modified.find((m) => m.after.id === "c1")
        expect(s1?.state).toBe("modified-own")
        expect(c1?.state).toBe("modified-within")
    })
})
