import { describe, expect, test } from "vitest"
import { historicalFigures } from "../historical-figures/index.js"

describe("historicalFigures", () => {
    test("has three figures", () => {
        expect(historicalFigures).toHaveLength(3)
    })

    test("each figure has a username and at least one argument", () => {
        for (const figure of historicalFigures) {
            expect(figure.username).toBeTruthy()
            expect(figure.arguments.length).toBeGreaterThanOrEqual(1)
        }
    })

    test("each argument has a non-empty description, claims, and premises", () => {
        for (const figure of historicalFigures) {
            for (const argument of figure.arguments) {
                expect(argument.description.trim().length).toBeGreaterThan(0)
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
})
