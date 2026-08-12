import { describe, test, expect } from "vitest"
import type { TProjectReactiveSnapshot } from "../engine.js"
import type {
    TOriginAnchor,
    TOriginDocument,
} from "../../schemas/model/origin.js"
import {
    allAnchorsForTarget,
    describeTarget,
    isAttributionEditable,
    isMarkableExpression,
    isMarkedUnspoken,
    selectionToCodePointSpan,
    utf16ToCodePoint,
} from "../origin-authoring.js"

/**
 * The origin slice by hand, as in `../render/__tests__/origin-runs.test.ts` and
 * for the same reason: none of these functions has any use for a real engine,
 * and `./origin-fixtures.ts` stands one up. This one additionally carries
 * premises and variables, which the markability and naming decisions read.
 */

const DOC_ID = "doc-1"

function anchor(
    id: string,
    targetId: string,
    startCodePoint: number,
    endCodePoint: number,
    exact: string
): TOriginAnchor {
    return {
        id,
        argumentId: "arg-1",
        argumentVersion: 0,
        documentId: DOC_ID,
        targetType: "expression",
        targetId,
        exact,
        startCodePoint,
        endCodePoint,
        createdOn: new Date(0),
        checksum: `ck-${id}`,
    } as unknown as TOriginAnchor
}

function snapshotWith(input: {
    text?: string
    anchors?: TOriginAnchor[]
    withDocument?: boolean
    premises?: Record<string, unknown>
    variables?: Record<string, unknown>
}): TProjectReactiveSnapshot {
    const anchorsByTarget: Record<string, TOriginAnchor[]> = {}
    for (const a of input.anchors ?? []) {
        anchorsByTarget[a.targetId] = [
            ...(anchorsByTarget[a.targetId] ?? []),
            a,
        ]
    }
    const withDocument = input.withDocument ?? true
    return {
        premises: input.premises ?? {},
        roles: { conclusionPremiseId: null },
        variables: input.variables ?? {},
        claims: {},
        citations: {},
        validationIssues: [],
        origin: {
            document: withDocument
                ? {
                      id: DOC_ID,
                      text: input.text ?? "",
                      digest: "d",
                      checksum: "c",
                      creatorId: "u-1",
                      createdOn: new Date(0),
                  }
                : undefined,
            link: withDocument
                ? {
                      argumentId: "arg-1",
                      argumentVersion: 0,
                      documentId: DOC_ID,
                      stance: "seed",
                      checksum: "c",
                      createdOn: new Date(0),
                  }
                : undefined,
            anchors: anchorsByTarget,
        },
    } as unknown as TProjectReactiveSnapshot
}

/**
 * One premise holding one variable expression, with the variable bound to a
 * claim or to the premise. That binding is what decides whether content may be
 * declared unspoken, so the difference has to be expressible here.
 */
function premiseWithVariable(input: {
    premiseId: string
    expressionId: string
    variableId: string
    /** A claim-bound variable carries `claimId`; a premise-bound one does not. */
    claimId?: string
    premiseTitle?: string | null
    premiseEnthymeme?: boolean
    expressionEnthymeme?: boolean
}): {
    premises: Record<string, unknown>
    variables: Record<string, unknown>
} {
    return {
        premises: {
            [input.premiseId]: {
                premise: {
                    id: input.premiseId,
                    title:
                        input.premiseTitle === undefined
                            ? "A premise"
                            : input.premiseTitle,
                    ...(input.premiseEnthymeme ? { enthymeme: true } : {}),
                },
                expressions: {
                    [input.expressionId]: {
                        id: input.expressionId,
                        type: "variable",
                        variableId: input.variableId,
                        ...(input.expressionEnthymeme
                            ? { enthymeme: true }
                            : {}),
                    },
                },
            },
        },
        variables: {
            [input.variableId]: {
                id: input.variableId,
                ...(input.claimId
                    ? { claimId: input.claimId, claimVersion: 1 }
                    : { premiseId: input.premiseId }),
            },
        },
    }
}

// Two astral-plane characters, each two UTF-16 code units and one code point.
const ASTRAL = "🜁 fire 🜃 earth"

describe("utf16ToCodePoint", () => {
    test("is the identity on plain ASCII", () => {
        const text = "All men are mortal."
        expect(utf16ToCodePoint(text, 0)).toBe(0)
        expect(utf16ToCodePoint(text, 8)).toBe(8)
        expect(utf16ToCodePoint(text, text.length)).toBe(text.length)
    })

    test("counts an astral character once, not twice", () => {
        // "🜁 fire " is 7 code points but 8 UTF-16 code units — a bare
        // `String.prototype.slice` on the stored document at 8 would land a
        // character late, which is the whole reason this exists.
        expect(utf16ToCodePoint(ASTRAL, 8)).toBe(7)
        expect(utf16ToCodePoint(ASTRAL, ASTRAL.length)).toBe([...ASTRAL].length)
    })
})

describe("selectionToCodePointSpan", () => {
    test("converts a forward selection to code-point offsets", () => {
        // Selecting "fire" — UTF-16 [2, 6) — is code points [1, 5).
        expect(selectionToCodePointSpan(ASTRAL, 2, 6)).toEqual({
            startCodePoint: 1,
            endCodePoint: 5,
        })
    })

    test("reports an empty selection as nothing rather than throwing", () => {
        // The request schema's `Type.Refine` rejects `end <= start` inside
        // `strictFetch`'s pre-send assert. A caret with no selection has to be
        // a UI state, so it never reaches that assert.
        expect(selectionToCodePointSpan(ASTRAL, 4, 4)).toBeNull()
    })

    test("reports a backwards selection as nothing", () => {
        expect(selectionToCodePointSpan(ASTRAL, 6, 2)).toBeNull()
    })

    test("reports a selection of only a lone astral character", () => {
        expect(selectionToCodePointSpan(ASTRAL, 0, 2)).toEqual({
            startCodePoint: 0,
            endCodePoint: 1,
        })
    })
})

describe("isMarkableExpression", () => {
    test("accepts a claim-bound variable expression", () => {
        const parts = premiseWithVariable({
            premiseId: "p-1",
            expressionId: "e-1",
            variableId: "v-1",
            claimId: "c-1",
        })
        expect(isMarkableExpression(snapshotWith(parts), "e-1")).toBe(true)
    })

    test("refuses a premise-bound variable expression", () => {
        // Its truth is derived from another premise's evaluation rather than
        // asserted, so core reports a mark on one as a violation — the route
        // throws, and the affordance must not be offered.
        const parts = premiseWithVariable({
            premiseId: "p-1",
            expressionId: "e-1",
            variableId: "v-1",
        })
        expect(isMarkableExpression(snapshotWith(parts), "e-1")).toBe(false)
    })

    test("refuses an operator expression", () => {
        const snapshot = snapshotWith({
            premises: {
                "p-1": {
                    premise: { id: "p-1", title: "A premise" },
                    expressions: {
                        "e-op": {
                            id: "e-op",
                            type: "operator",
                            operator: "and",
                        },
                    },
                },
            },
        })
        expect(isMarkableExpression(snapshot, "e-op")).toBe(false)
    })

    test("refuses an expression that is not in the snapshot at all", () => {
        expect(isMarkableExpression(snapshotWith({}), "nope")).toBe(false)
    })
})

describe("isMarkedUnspoken", () => {
    test("reads the mark off a premise", () => {
        const parts = premiseWithVariable({
            premiseId: "p-1",
            expressionId: "e-1",
            variableId: "v-1",
            claimId: "c-1",
            premiseEnthymeme: true,
        })
        const snapshot = snapshotWith(parts)
        expect(isMarkedUnspoken(snapshot, "p-1")).toBe(true)
        expect(isMarkedUnspoken(snapshot, "e-1")).toBe(false)
    })

    test("reads the mark off a claim expression", () => {
        const parts = premiseWithVariable({
            premiseId: "p-1",
            expressionId: "e-1",
            variableId: "v-1",
            claimId: "c-1",
            expressionEnthymeme: true,
        })
        expect(isMarkedUnspoken(snapshotWith(parts), "e-1")).toBe(true)
    })

    test("is true with no source text attached", () => {
        // An enthymeme is a statement about the natural-language original,
        // meaningful whether or not that original is stored here.
        const parts = premiseWithVariable({
            premiseId: "p-1",
            expressionId: "e-1",
            variableId: "v-1",
            claimId: "c-1",
            premiseEnthymeme: true,
        })
        const snapshot = snapshotWith({ ...parts, withDocument: false })
        expect(isMarkedUnspoken(snapshot, "p-1")).toBe(true)
    })
})

describe("describeTarget", () => {
    test("names a premise by its title", () => {
        const parts = premiseWithVariable({
            premiseId: "p-1",
            expressionId: "e-1",
            variableId: "v-1",
            claimId: "c-1",
            premiseTitle: "Mortality",
        })
        expect(describeTarget(snapshotWith(parts), "p-1")).toBe("Mortality")
    })

    test("falls back rather than rendering an empty name", () => {
        const parts = premiseWithVariable({
            premiseId: "p-1",
            expressionId: "e-1",
            variableId: "v-1",
            claimId: "c-1",
            premiseTitle: null,
        })
        expect(describeTarget(snapshotWith(parts), "p-1")).toBe(
            "an untitled premise"
        )
    })

    test("falls back on an empty title, not just a missing one", () => {
        // The distinction that decides `||` versus `??` in the implementation.
        // These columns are nullable and uncapped, and "absent" arrives as `""`
        // at least as often as `null`; a nullish fallback would keep the empty
        // string and render a nameless control.
        const parts = premiseWithVariable({
            premiseId: "p-1",
            expressionId: "e-1",
            variableId: "v-1",
            claimId: "c-1",
            premiseTitle: "",
        })
        expect(describeTarget(snapshotWith(parts), "p-1")).toBe(
            "an untitled premise"
        )
    })

    test("names an unknown target as the argument itself", () => {
        expect(describeTarget(snapshotWith({}), "nope")).toBe("this argument")
    })
})

describe("allAnchorsForTarget", () => {
    test("returns every anchor recorded against a target", () => {
        const snapshot = snapshotWith({
            text: "All men are mortal.",
            anchors: [
                anchor("a-1", "e-1", 0, 3, "All"),
                // Its `exact` no longer matches the span, so the reading half
                // refuses to draw it — and that is precisely the anchor an
                // author needs listed, because it is the one they want removed.
                anchor("a-2", "e-1", 4, 7, "stale"),
                anchor("a-3", "e-2", 8, 11, "are"),
            ],
        })

        expect(allAnchorsForTarget(snapshot, "e-1").map((a) => a.id)).toEqual([
            "a-1",
            "a-2",
        ])
    })

    test("reports a target with no anchors as an empty list", () => {
        expect(allAnchorsForTarget(snapshotWith({}), "e-1")).toEqual([])
    })
})

describe("isAttributionEditable", () => {
    // The client-side reading of the server's `isAttributionProvisional`, which
    // states the rule as `stored == null || stored.type === "unparsed"`. The two
    // live in different repos, so no test can span them; these four inputs pin
    // this side against that rule.
    const unparsed = {
        type: "unparsed",
        text: "Mill, On Liberty",
        citationTypeGuess: "Book",
    } as unknown as TOriginDocument["reference"]

    const parsed = {
        type: "ieee",
        authors: ["J. S. Mill"],
        title: "On Liberty",
        year: 1859,
    } as unknown as TOriginDocument["reference"]

    test("an absent attribution may still be written", () => {
        expect(isAttributionEditable(null)).toBe(true)
        expect(isAttributionEditable(undefined)).toBe(true)
    })

    test("a platform import's prefill may be replaced", () => {
        expect(isAttributionEditable(unparsed)).toBe(true)
    })

    test("a structured reference is set once and refuses a second edit", () => {
        expect(isAttributionEditable(parsed)).toBe(false)
    })
})
