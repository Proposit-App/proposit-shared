/**
 * Pick a propositional-variable symbol not already in use: prefer the single
 * letters P..O (a rotation that starts at P so fresh arguments read P, Q, R, …),
 * then fall back to X1, X2, … when all 26 letters are taken.
 */
export function nextVariableSymbol(
    variables: Record<string, { symbol?: string }>
): string {
    const used = new Set(
        Object.values(variables)
            .map((v) => v.symbol)
            .filter((s): s is string => !!s)
    )
    for (const code of [..."PQRSTUVWXYZABCDEFGHIJKLMNO"]) {
        if (!used.has(code)) return code
    }
    let n = 1
    while (used.has(`X${n}`)) n++
    return `X${n}`
}
