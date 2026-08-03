import { describe, test, expect } from "vitest"
import type { TProjectReactiveSnapshot } from "../../engine.js"
import type { TOriginAnchor } from "../../../schemas/model/origin.js"
import { anchorsForTarget, buildOriginRuns } from "../origin-runs.js"

/**
 * These two functions read only `snapshot.origin`, so the fixtures are the
 * origin slice by hand. `src/engine/__tests__/origin-fixtures.ts` stands up a
 * real engine, which is machinery neither function has any use for.
 */

const DOC_ID = "doc-1"

function anchor(
    id: string,
    targetId: string,
    startCodePoint: number,
    endCodePoint: number,
    exact: string,
    targetType: "premise" | "expression" | "argument" = "expression"
): TOriginAnchor {
    return {
        id,
        argumentId: "arg-1",
        argumentVersion: 0,
        documentId: DOC_ID,
        targetType,
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
        premises: {},
        roles: { conclusionPremiseId: null },
        variables: {},
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

describe("buildOriginRuns", () => {
    test("returns a single plain run when nothing is anchored", () => {
        const runs = buildOriginRuns(snapshotWith({ text: "abcdef" }))
        expect(runs).toEqual([{ text: "abcdef", anchorIds: [], targetIds: [] }])
    })

    test("returns no runs when there is no document", () => {
        expect(buildOriginRuns(snapshotWith({ withDocument: false }))).toEqual(
            []
        )
    })

    test("returns no runs when the snapshot carries no origin slice at all", () => {
        const bare = {
            premises: {},
            roles: { conclusionPremiseId: null },
            variables: {},
            claims: {},
            citations: {},
            validationIssues: [],
        } as unknown as TProjectReactiveSnapshot
        expect(buildOriginRuns(bare)).toEqual([])
    })

    test("collapses two anchors over identical offsets into one run", () => {
        const runs = buildOriginRuns(
            snapshotWith({
                text: "Socrates is mortal.",
                anchors: [
                    anchor("a1", "e1", 0, 8, "Socrates"),
                    anchor("a2", "e2", 0, 8, "Socrates"),
                ],
            })
        )

        const anchored = runs.filter((r) => r.anchorIds.length > 0)
        expect(anchored).toHaveLength(1)
        expect(anchored[0].text).toBe("Socrates")
        expect([...anchored[0].anchorIds].sort()).toEqual(["a1", "a2"])
        expect([...anchored[0].targetIds].sort()).toEqual(["e1", "e2"])
    })

    test("merges overlapping spans into one run rather than nesting them", () => {
        const runs = buildOriginRuns(
            snapshotWith({
                text: "abcdefghij",
                anchors: [
                    anchor("a1", "e1", 1, 5, "bcde"),
                    anchor("a2", "e2", 3, 8, "defgh"),
                ],
            })
        )

        expect(runs).toEqual([
            { text: "a", anchorIds: [], targetIds: [] },
            {
                text: "bcdefgh",
                anchorIds: ["a1", "a2"],
                targetIds: ["e1", "e2"],
            },
            { text: "ij", anchorIds: [], targetIds: [] },
        ])
    })

    test("reassembles the document exactly, including its first and last code point", () => {
        const text = "abcdefghij"
        const runs = buildOriginRuns(
            snapshotWith({
                text,
                anchors: [
                    anchor("a1", "e1", 0, 2, "ab"),
                    anchor("a2", "e2", 8, 10, "ij"),
                ],
            })
        )

        expect(runs.map((r) => r.text).join("")).toBe(text)
        expect(runs[0].anchorIds).toEqual(["a1"])
        expect(runs[runs.length - 1].anchorIds).toEqual(["a2"])
    })

    test("slices by code points, so an astral character is not split", () => {
        // A lone astral emoji is two UTF-16 units and one code point — a UTF-16
        // slice at offset 1 would emit a lone surrogate.
        const text = "a🙂b"
        const runs = buildOriginRuns(
            snapshotWith({
                text,
                anchors: [anchor("a1", "e1", 1, 2, "🙂")],
            })
        )

        expect(runs.map((r) => r.text).join("")).toBe(text)
        expect(runs.find((r) => r.anchorIds.length > 0)?.text).toBe("🙂")
    })

    test("absorbs a span fully nested inside another into one run", () => {
        const runs = buildOriginRuns(
            snapshotWith({
                text: "abcdefghij",
                anchors: [
                    anchor("outer", "e1", 0, 10, "abcdefghij"),
                    anchor("inner", "e2", 2, 5, "cde"),
                ],
            })
        )

        expect(runs).toEqual([
            {
                text: "abcdefghij",
                anchorIds: ["outer", "inner"],
                targetIds: ["e1", "e2"],
            },
        ])
    })

    test("keeps two adjacent, touching spans as separate runs", () => {
        const runs = buildOriginRuns(
            snapshotWith({
                text: "abcdefghij",
                anchors: [
                    anchor("a1", "e1", 0, 5, "abcde"),
                    anchor("a2", "e2", 5, 10, "fghij"),
                ],
            })
        )

        expect(runs).toEqual([
            { text: "abcde", anchorIds: ["a1"], targetIds: ["e1"] },
            { text: "fghij", anchorIds: ["a2"], targetIds: ["e2"] },
        ])
    })

    test("drops an anchor whose span leaves the document", () => {
        const runs = buildOriginRuns(
            snapshotWith({
                text: "abc",
                anchors: [anchor("a1", "e1", 2, 99, "c")],
            })
        )

        expect(runs.map((r) => r.text).join("")).toBe("abc")
        expect(runs.some((r) => r.anchorIds.length > 0)).toBe(false)
    })
})

describe("anchorsForTarget", () => {
    test("reads the anchors recorded against one target", () => {
        const snapshot = snapshotWith({
            text: "abcdef",
            anchors: [anchor("a1", "e1", 0, 3, "abc")],
        })
        expect(anchorsForTarget(snapshot, "e1").map((a) => a.id)).toEqual([
            "a1",
        ])
        expect(anchorsForTarget(snapshot, "e2")).toEqual([])
    })

    test("returns nothing when the snapshot carries no origin slice", () => {
        const bare = {} as unknown as TProjectReactiveSnapshot
        expect(anchorsForTarget(bare, "e1")).toEqual([])
    })

    // Both ends of the pairing have to agree on what an anchor is. An anchor the
    // pane refuses to draw, but the cue still advertises, is a control that
    // highlights nothing.
    test("drops an anchor whose span leaves the document, as the runs do", () => {
        const snapshot = snapshotWith({
            text: "abc",
            anchors: [anchor("a1", "e1", 2, 99, "c")],
        })
        expect(anchorsForTarget(snapshot, "e1")).toEqual([])
        expect(
            buildOriginRuns(snapshot).some((r) => r.anchorIds.length > 0)
        ).toBe(false)
    })
})
