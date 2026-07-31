import { describe, test, expect } from "vitest"
import { buildTextTree } from "../text-tree.js"
import {
    counterargumentPremiseIds,
    attackTargetsByClaimId,
    wrappedOperatorExpressionIds,
    citationsByClaimId,
    loneRebuttalTargets,
    partitionItemsByTab,
    findLoneConclusion,
    REPAIRABLE_CODES,
    detectRepairs,
    getClaimProofState,
} from "../derive/index.js"
import {
    buildArgumentFormula,
    serializeArgumentToMarkdown,
    serializeArgumentText,
    humanizeCitationType,
    humanizeCitationTypeMap,
    getInlineSourceLabel,
    describeSource,
    parseByline,
} from "../render/index.js"
import {
    mergeWithAddedModifiedReconciliation,
    nextVariableSymbol,
} from "../algebra/index.js"
import {
    buildAtvEditableItems,
    applySkeletonOverlay,
    nextSkeletonOperator,
} from "../overlay/index.js"
import {
    goldenSnapshot,
    emptyOriginGoldenSnapshot,
    originGoldenSnapshot,
    unanchoredOriginGoldenSnapshot,
} from "./derived-view-goldens.js"

const snapshot = goldenSnapshot()
const items = buildTextTree(snapshot)

describe("engine/derive", () => {
    test("counterargumentPremiseIds — only the ¬R premise", () => {
        expect([...counterargumentPremiseIds(snapshot)]).toEqual(["counter"])
    })

    test("attackTargetsByClaimId — R is attacked by the counter premise", () => {
        const map = attackTargetsByClaimId(snapshot)
        expect(map.get("cR")).toEqual({
            premiseId: "counter",
            consequentExpressionId: "counter#e1",
        })
        expect(map.has("cP")).toBe(false)
    })

    test("wrappedOperatorExpressionIds — none (¬R wraps a variable, not an operator)", () => {
        expect([...wrappedOperatorExpressionIds(snapshot)]).toEqual([])
    })

    test("citationsByClaimId — cQ cites src1", () => {
        const map = citationsByClaimId(snapshot)
        expect(map.get("cQ")?.map((e) => e.supportingClaimId)).toEqual(["src1"])
    })

    test("loneRebuttalTargets — the counter premise is a lone ¬R", () => {
        expect(loneRebuttalTargets(snapshot)).toEqual([
            { premiseId: "counter", targetExpressionId: "counter#e0" },
        ])
    })

    test("partitionItemsByTab — original excludes the counter premise, counter tab holds only it", () => {
        const counter = counterargumentPremiseIds(snapshot)
        const original = partitionItemsByTab(items, counter, "original")
        const counterTab = partitionItemsByTab(
            items,
            counter,
            "counterargument"
        )
        const headers = (rows: typeof items) =>
            rows
                .filter((r) => r.type === "premise-header")
                .map((r) => (r as { premiseId: string }).premiseId)
        expect(headers(original)).not.toContain("counter")
        expect(headers(counterTab)).toEqual(["counter"])
    })

    test("findLoneConclusion — conclusion P→Q is NOT lone (has an operator)", () => {
        expect(findLoneConclusion(items)).toBeNull()
    })

    test("REPAIRABLE_CODES — the two client-detectable codes", () => {
        expect([...REPAIRABLE_CODES].sort()).toEqual([
            "EXPR_CHILD_COUNT_INVALID",
            "PREMISE_ROOT_MISMATCH",
        ])
    })

    test("detectRepairs — keeps only the client-detectable issue", () => {
        expect(detectRepairs(snapshot)).toEqual([
            {
                code: "EXPR_CHILD_COUNT_INVALID",
                premiseId: "concl",
                expressionId: "concl#e0",
            },
        ])
    })

    test("getClaimProofState — cQ is citation-backed, cP empty", () => {
        expect(getClaimProofState("cQ", snapshot)).toBe("citation-backed")
        expect(getClaimProofState("cP", snapshot)).toBe("empty")
    })
})

describe("engine/render", () => {
    test("buildArgumentFormula — infix formulas + legend", () => {
        expect(buildArgumentFormula(snapshot)).toMatchInlineSnapshot(`
          {
            "legend": [
              {
                "label": "P is true",
                "symbol": "P",
              },
              {
                "label": "Q follows",
                "symbol": "Q",
              },
              {
                "label": "R the rebutted",
                "symbol": "R",
              },
            ],
            "premises": [
              {
                "formula": "P → Q",
                "premiseId": "concl",
                "role": "conclusion",
                "title": null,
              },
              {
                "formula": "P",
                "premiseId": "supp",
                "role": "supporting",
                "title": "Ground",
              },
              {
                "formula": "¬R",
                "premiseId": "counter",
                "role": "supporting",
                "title": "Objection",
              },
            ],
          }
        `)
    })

    test("serializeArgumentToMarkdown — full markdown export", () => {
        expect(serializeArgumentToMarkdown(snapshot)).toMatchInlineSnapshot(`
          "# The golden argument

          A worked example.

          > Version 3 — Published on 2026-01-15

          ## Logic

          ### Conclusion

          - Q follows
          - *is true if*
          - P is true

          ### Supporting premise — Ground

          - P is true

          ### Supporting premise — Objection

          - NOT R the rebutted

          ## Claims
          - **P is true** _(claim)_ — because reasons
          - **Q follows** _(claim)_
          - **R the rebutted** _(claim)_ — a countered claim

          ## Sources
          - Smith 2020 — cited by: Q follows
          "
        `)
    })

    test("serializeArgumentToMarkdown — an argument with no source text is unchanged", () => {
        expect(serializeArgumentToMarkdown(emptyOriginGoldenSnapshot())).toBe(
            serializeArgumentToMarkdown(snapshot)
        )
    })

    test("serializeArgumentToMarkdown — anchored content quotes its passage", () => {
        expect(serializeArgumentToMarkdown(originGoldenSnapshot()))
            .toMatchInlineSnapshot(`
              "# The golden argument

              A worked example.

              > Version 3 — Published on 2026-01-15
              > Based on origin text "All men are mortal." — The Republic

              ## Logic

              ### Conclusion

              - Q follows
                - Based on origin text "Therefore Socrates is mortal."
              - *is true if*
              - P is true

              ### Supporting premise — Ground

              Based on origin text "Socrates is a man."

              - P is true

              ### Supporting premise — Objection

              - NOT R the rebutted

              ## Claims
              - **P is true** _(claim)_ — because reasons
              - **Q follows** _(claim)_
              - **R the rebutted** _(claim)_ — a countered claim

              ## Sources
              - Smith 2020 — cited by: Q follows
              "
            `)
    })

    test("serializeArgumentToMarkdown — passages quote text, never offsets", () => {
        const originLines = serializeArgumentToMarkdown(originGoldenSnapshot())
            .split("\n")
            .filter((line) => line.includes("Based on origin text"))
        expect(originLines).toHaveLength(3)
        for (const line of originLines) expect(line).not.toMatch(/\d/)
    })

    test("serializeArgumentToMarkdown — a source with no whole-argument passage still names itself", () => {
        const header = serializeArgumentToMarkdown(
            unanchoredOriginGoldenSnapshot()
        ).split("\n\n")[2]
        expect(header).toBe(
            "> Version 3 — Published on 2026-01-15\n> Based on origin text — The Republic"
        )
    })

    test("serializeArgumentText — plain-text export", () => {
        const header = {
            title: snapshot.argument.title,
            description: snapshot.argument.description ?? null,
        }
        expect(serializeArgumentText(header, items)).toMatchInlineSnapshot(`
          "The golden argument

          A worked example.

          CONCLUSION
          Q follows
          is true if
          P is true
          because reasons

          SUPPORTING
          Ground
          P is true
          because reasons

          SUPPORTING
          Objection
          NOT R the rebutted
          a countered claim"
        `)
    })

    test("humanizeCitationType — map lookup + raw fallback", () => {
        expect(humanizeCitationType("JournalArticle")).toBe("Journal Article")
        expect(humanizeCitationType("unknown")).toBe("Unknown")
        expect(humanizeCitationTypeMap.CourtCase).toBe("Court Case")
    })

    test("getInlineSourceLabel — per-type discriminative field", () => {
        expect(
            getInlineSourceLabel({
                type: "JournalArticle",
                title: "On Foo",
                journalTitle: "J. Foo",
            } as never)
        ).toBe("On Foo (J. Foo)")
        expect(
            getInlineSourceLabel({
                type: "unparsed",
                text: "Smith 2020",
                citationTypeGuess: "Book",
            } as never)
        ).toBe("Smith 2020 ⚠ unparsed")
        expect(getInlineSourceLabel(null)).toBe("Citation")
    })

    test("describeSource — defensive per-field read", () => {
        expect(
            describeSource(
                {
                    type: "JournalArticle",
                    title: "On Foo",
                    year: "2020",
                    authors: [{ givenNames: "Jane", familyName: "Doe" }],
                },
                null
            )
        ).toEqual({
            typeLabel: "Journal Article",
            title: "On Foo",
            authors: "Jane Doe",
            year: "2020",
            url: null,
        })
        expect(describeSource(null, null)).toBeNull()
    })

    test("parseByline — explicit separators beat commas", () => {
        expect(parseByline("Jane Doe and John Roe")).toEqual([
            { givenNames: "Jane", familyName: "Doe" },
            { givenNames: "John", familyName: "Roe" },
        ])
        expect(parseByline("Doe, John")).toEqual([
            { givenNames: "", familyName: "Doe" },
            { givenNames: "", familyName: "John" },
        ])
    })
})

describe("engine/algebra", () => {
    test("nextVariableSymbol — P..O rotation then X-fallback", () => {
        expect(nextVariableSymbol({})).toBe("P")
        expect(nextVariableSymbol({ v: { symbol: "P" } })).toBe("Q")
        const allTaken = Object.fromEntries(
            [..."PQRSTUVWXYZABCDEFGHIJKLMNO"].map((s, i) => [
                `v${i}`,
                { symbol: s },
            ])
        )
        expect(nextVariableSymbol(allTaken)).toBe("X1")
    })

    test("mergeWithAddedModifiedReconciliation — bucket collapses", () => {
        const a = {
            expressions: {
                added: [{ id: "x1" }],
                modified: [{ id: "x2" }],
                removed: [],
            },
        } as never
        const b = {
            expressions: {
                added: [],
                modified: [{ id: "x1" }],
                removed: [{ id: "x2" }],
            },
        } as never
        // x1: added∩modified → promoted into added. x2: modified∩removed → removed.
        expect(mergeWithAddedModifiedReconciliation(a, b)).toEqual({
            expressions: {
                added: [{ id: "x1" }],
                modified: [],
                removed: [{ id: "x2" }],
            },
        })
    })

    test("mergeWithAddedModifiedReconciliation — added∩removed cancels", () => {
        const a = {
            variables: { added: [{ id: "v1" }], modified: [], removed: [] },
        } as never
        const b = {
            variables: { added: [], modified: [], removed: [{ id: "v1" }] },
        } as never
        expect(mergeWithAddedModifiedReconciliation(a, b)).toEqual({})
    })
})

describe("engine/overlay", () => {
    test("buildAtvEditableItems — slot anchors around the item stream", () => {
        const atv = buildAtvEditableItems(items, snapshot)
        // A trailing premise-list slot with beforePremiseId null closes the list.
        expect(atv[atv.length - 1]).toEqual({
            type: "slot",
            kind: "premise-list",
            beforePremiseId: null,
        })
        // Every premise header is preceded by a premise-list slot.
        for (let i = 0; i < atv.length; i++) {
            if (atv[i]?.type === "premise-header") {
                expect(atv[i - 1]).toMatchObject({
                    type: "slot",
                    kind: "premise-list",
                })
            }
        }
    })

    test("applySkeletonOverlay — empty premise gets a skeleton inference", () => {
        const emptySnap = goldenSnapshot()
        emptySnap.premises.supp = {
            premise: {
                id: "supp",
                type: "freeform",
                title: "Ground",
            } as never,
            rootExpressionId: undefined,
            expressions: {},
        } as never
        const emptyItems = buildTextTree(emptySnap)
        const atv = buildAtvEditableItems(emptyItems, emptySnap)
        const overlay = applySkeletonOverlay(atv, emptySnap, {
            selectedExpressionId: null,
        })
        const kinds = overlay.map((o) => o.type)
        expect(kinds).toContain("skeleton-formula-open")
        expect(kinds).toContain("skeleton-operator")
        expect(kinds).toContain("skeleton-formula-close")
    })

    test("nextSkeletonOperator — root inference cycle and sibling cycle", () => {
        expect(nextSkeletonOperator("implies", true, false)).toBe("iff")
        expect(nextSkeletonOperator("iff", true, false)).toBe("implies")
        expect(nextSkeletonOperator("iff", true, true)).toBe("and")
        expect(nextSkeletonOperator("and", false, false)).toBe("or")
    })
})
