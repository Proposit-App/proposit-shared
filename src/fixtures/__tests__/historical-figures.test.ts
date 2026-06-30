import { describe, expect, test } from "vitest"
import {
    historicalFigures,
    figureAboutByCurationId,
    documentMarkdownByCurationId,
    documentAboutByCurationId,
} from "../historical-figures/index.js"

describe("historicalFigures", () => {
    test("has two figures", () => {
        expect(historicalFigures).toHaveLength(2)
    })

    test("contains no removed copyrighted figure", () => {
        for (const figure of historicalFigures) {
            expect(figure.name).not.toMatch(/king/i)
        }
    })

    test("each figure has a name, username, curationId, and one argument", () => {
        for (const figure of historicalFigures) {
            expect(figure.name).toBeTruthy()
            expect(figure.username).toBeTruthy()
            expect(figure.curationId).toBeTruthy()
            expect(figure.arguments.length).toBeGreaterThanOrEqual(1)
        }
    })

    test("each argument has claims, premises, and a documentCurationId", () => {
        for (const figure of historicalFigures) {
            for (const argument of figure.arguments) {
                expect(argument.documentCurationId).toBeTruthy()
                expect(argument.claims.length).toBeGreaterThanOrEqual(1)
                expect(argument.premises.length).toBeGreaterThanOrEqual(1)
            }
        }
    })

    test("each argument has exactly one conclusion-role premise", () => {
        for (const figure of historicalFigures) {
            for (const argument of figure.arguments) {
                const conclusions = argument.premises.filter(
                    (premise) => premise.role === "conclusion"
                )
                expect(conclusions).toHaveLength(1)
            }
        }
    })

    test("every figure curationId has bundled about content", () => {
        for (const figure of historicalFigures) {
            expect(figureAboutByCurationId[figure.curationId]).toBeTruthy()
        }
    })

    test("every documentCurationId has bundled markdown and about content", () => {
        for (const figure of historicalFigures) {
            for (const argument of figure.arguments) {
                const id = argument.documentCurationId
                expect(documentMarkdownByCurationId[id]).toBeTruthy()
                expect(documentAboutByCurationId[id]).toBeTruthy()
            }
        }
    })
})
