import type { ProjectChangeset } from "../mutations/types.js"

/**
 * Like the core `mergeChangesets` but tolerates the bucket overlaps that arise
 * when two logically-sequential operations touch the same entity:
 *
 *  - **added ∩ modified** → final state is the modified payload promoted into
 *    `added`. Pattern: mint a derivation premise's consequent expression, then
 *    re-parent it under a freshly-built IMPLIES root.
 *  - **added ∩ removed** → no-op; drop both. Pattern: a mint creates an entity
 *    that a later op removes within the same logical operation.
 *  - **modified ∩ removed** → final state is `removed`; drop the modified entry.
 *    Pattern: clearing a derivation antecedent promotes Q to root (Q shows up in
 *    the clear diff as `modified` with `parentId=null`), then repopulating from
 *    citations removes Q to rebuild the antecedent tree (Q shows up as `removed`
 *    in the populate diff). The merged net effect is that Q is removed.
 *
 * All other invariants of the core merge are preserved.
 */
export function mergeWithAddedModifiedReconciliation(
    a: ProjectChangeset,
    b: ProjectChangeset
): ProjectChangeset {
    const merged: ProjectChangeset = {}
    for (const category of ["expressions", "variables", "premises"] as const) {
        const aCat = a[category]
        const bCat = b[category]
        if (!aCat && !bCat) continue
        const addedMap = new Map<string, { id: string }>()
        for (const e of aCat?.added ?? []) addedMap.set(e.id, e)
        for (const e of bCat?.added ?? []) addedMap.set(e.id, e)
        const modifiedMap = new Map<string, { id: string }>()
        for (const e of aCat?.modified ?? []) modifiedMap.set(e.id, e)
        for (const e of bCat?.modified ?? []) modifiedMap.set(e.id, e)
        const removedMap = new Map<string, { id: string }>()
        for (const e of aCat?.removed ?? []) removedMap.set(e.id, e)
        for (const e of bCat?.removed ?? []) removedMap.set(e.id, e)
        // Collapse added∩modified: a modify on a freshly-added entity in the
        // same logical operation is the entity's final state; carry it into
        // `added` and drop the `modified` entry.
        for (const id of [...addedMap.keys()]) {
            const modifiedEntry = modifiedMap.get(id)
            if (modifiedEntry) {
                addedMap.set(id, modifiedEntry)
                modifiedMap.delete(id)
            }
        }
        // Collapse added∩removed: an add followed by a remove cancels out.
        // Drop both entries.
        for (const id of [...addedMap.keys()]) {
            if (removedMap.has(id)) {
                addedMap.delete(id)
                removedMap.delete(id)
            }
        }
        // Collapse modified∩removed: a modify followed by a remove is
        // ultimately a remove. Drop the `modified` entry.
        for (const id of [...modifiedMap.keys()]) {
            if (removedMap.has(id)) {
                modifiedMap.delete(id)
            }
        }
        const added = [...addedMap.values()]
        const modified = [...modifiedMap.values()]
        const removed = [...removedMap.values()]
        if (added.length === 0 && modified.length === 0 && removed.length === 0)
            continue
            // Type assertion: we're rebuilding the same shape the core merge does —
            // narrow back to the category-specific bucket type without changing
            // entity payloads.
        ;(merged as unknown as Record<string, unknown>)[category] = {
            added,
            modified,
            removed,
        }
    }
    if (b.roles !== undefined) {
        merged.roles = b.roles
    } else if (a.roles !== undefined) {
        merged.roles = a.roles
    }
    if (b.argument !== undefined) {
        merged.argument = b.argument
    } else if (a.argument !== undefined) {
        merged.argument = a.argument
    }
    return merged
}
