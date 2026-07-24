import { describe, expect, it } from "vitest"
import { buildArgumentVersionHistory } from "../version-history.js"
import type { TArgument } from "../../../model/arguments.js"

// The projection only reads `id`, `version`, `published`, and `publishedOn`, so
// a partial fixture cast to TArgument keeps the tests focused on ordering,
// de-duplication, and immutability rather than full schema shape.
const arg = (
    id: string,
    version: number,
    extra: Partial<TArgument> = {}
): TArgument =>
    ({
        id,
        version,
        published: true,
        publishedOn: null,
        ...extra,
    }) as TArgument

const tuple = (r: { argument: TArgument }) =>
    `${r.argument.id}@${r.argument.version}`

describe("buildArgumentVersionHistory", () => {
    it("inserts the viewed version when it is absent from history", () => {
        const viewed = arg("a", 3)
        const rows = buildArgumentVersionHistory({
            argument: viewed,
            argumentHistory: [arg("a", 1), arg("a", 2)],
            originalArgument: null,
        })
        expect(rows.map(tuple)).toEqual(["a@3", "a@2", "a@1"])
        expect(rows.find((r) => r.argument.version === 3)?.isActive).toBe(true)
    })

    it("does not duplicate the viewed version already present in history", () => {
        const viewed = arg("a", 2)
        const rows = buildArgumentVersionHistory({
            argument: viewed,
            argumentHistory: [arg("a", 1), arg("a", 2), arg("a", 3)],
            originalArgument: null,
        })
        expect(rows.map(tuple)).toEqual(["a@3", "a@2", "a@1"])
        expect(rows.filter((r) => tuple(r) === "a@2")).toHaveLength(1)
    })

    it("collapses duplicate source tuples deterministically", () => {
        const rows = buildArgumentVersionHistory({
            argument: arg("a", 1),
            argumentHistory: [arg("a", 1), arg("a", 1)],
            originalArgument: null,
        })
        expect(rows.map(tuple)).toEqual(["a@1"])
    })

    it("orders current-lineage versions newest-first regardless of input order", () => {
        const rows = buildArgumentVersionHistory({
            argument: arg("a", 2),
            argumentHistory: [arg("a", 4), arg("a", 1), arg("a", 3)],
            originalArgument: null,
        })
        expect(rows.map((r) => r.argument.version)).toEqual([4, 3, 2, 1])
    })

    it("appends the fork source last and marks it distinguishable", () => {
        const rows = buildArgumentVersionHistory({
            argument: arg("a", 2),
            argumentHistory: [arg("a", 1)],
            originalArgument: arg("b", 5),
        })
        expect(rows.map(tuple)).toEqual(["a@2", "a@1", "b@5"])
        const forkRows = rows.filter((r) => r.isForkSource)
        expect(forkRows.map(tuple)).toEqual(["b@5"])
        expect(rows.at(-1)?.isForkSource).toBe(true)
        // Current-lineage rows are never marked as the fork source.
        expect(rows.slice(0, 2).every((r) => !r.isForkSource)).toBe(true)
    })

    it("produces no fork-source row when originalArgument is null", () => {
        const rows = buildArgumentVersionHistory({
            argument: arg("a", 2),
            argumentHistory: [arg("a", 1)],
            originalArgument: null,
        })
        expect(rows.some((r) => r.isForkSource)).toBe(false)
    })

    it("marks exactly the viewed version active", () => {
        const rows = buildArgumentVersionHistory({
            argument: arg("a", 2),
            argumentHistory: [arg("a", 1), arg("a", 3)],
            originalArgument: arg("b", 5),
        })
        expect(rows.filter((r) => r.isActive).map(tuple)).toEqual(["a@2"])
    })

    it("does not mutate the input objects or arrays", () => {
        const viewed = Object.freeze(arg("a", 2))
        const history = Object.freeze([
            Object.freeze(arg("a", 3)),
            Object.freeze(arg("a", 1)),
        ]) as unknown as TArgument[]
        const original = Object.freeze(arg("b", 5))

        expect(() =>
            buildArgumentVersionHistory({
                argument: viewed,
                argumentHistory: history,
                originalArgument: original,
            })
        ).not.toThrow()

        expect(history.map((a) => a.version)).toEqual([3, 1])
    })
})
