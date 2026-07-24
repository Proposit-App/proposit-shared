import type { TArgument } from "../../model/arguments.js"
import type { TFullArgument } from "./index.js"

/**
 * One display-ready row of an argument's version history. Wraps the source
 * {@link TArgument} (so consumers keep exact id/version identity and the
 * publication metadata already on it) and adds the two facts a consumer cannot
 * derive from a single row in isolation:
 *
 * - `isActive`: this row is the version currently being viewed.
 * - `isForkSource`: this row is the immediate argument this lineage was forked
 *   from (a different argument id), not part of the current lineage. Consumers
 *   label it (e.g. "Original argument"); this projection invents no UI strings.
 */
export interface TArgumentVersionRow {
    argument: TArgument
    isActive: boolean
    isForkSource: boolean
}

/** The subset of {@link TFullArgument} the projection reads. */
export type TArgumentVersionHistoryInput = Pick<
    TFullArgument,
    "argument" | "argumentHistory" | "originalArgument"
>

/**
 * Build a display-ready version-history list from an argument response.
 *
 * The result contains every accessible current-lineage version exactly once —
 * including the viewed version whether or not `argumentHistory` already carries
 * it — ordered newest-first. When `originalArgument` is present, its row is
 * appended after the current lineage and marked `isForkSource` so consumers can
 * offer a comparison against a fork's immediate source. Rows are de-duplicated
 * by argument id + version.
 *
 * Pure and non-mutating: the input arrays and objects are never sorted,
 * annotated, or otherwise modified; a new array of new row objects is returned.
 */
export function buildArgumentVersionHistory(
    input: TArgumentVersionHistoryInput
): TArgumentVersionRow[] {
    const { argument, argumentHistory, originalArgument } = input

    const candidates: TArgument[] = [
        argument,
        ...argumentHistory,
        ...(originalArgument ? [originalArgument] : []),
    ]

    const seen = new Set<string>()
    const rows: TArgumentVersionRow[] = []
    for (const arg of candidates) {
        const key = `${arg.id}@${arg.version}`
        if (seen.has(key)) continue
        seen.add(key)
        rows.push({
            argument: arg,
            isActive:
                arg.id === argument.id && arg.version === argument.version,
            isForkSource: arg.id !== argument.id,
        })
    }

    // Current lineage first, fork source(s) after; newest version first within
    // each group. Row tuples are unique, so the ordering is total.
    return rows.sort((a, b) => {
        const aFork = a.isForkSource ? 1 : 0
        const bFork = b.isForkSource ? 1 : 0
        if (aFork !== bFork) return aFork - bFork
        return b.argument.version - a.argument.version
    })
}
