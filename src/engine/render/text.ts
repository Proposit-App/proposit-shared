import type { TTextTreeItem } from "../text-tree.js"

// Minimal header shape the plain-text export reads: an argument's title and its
// optional description. Consumers pass their richer header object; only these
// two fields are consulted.
export type TArgumentHeader = {
    title: string
    description: string | null
}

const INDENT = "    "

// Serialize a loaded argument to plain text for the clipboard, mirroring the
// on-screen prose: title, optional description, then the flat text-tree walk —
// premise role tags, indented claims (Citation:/NOT prefixes, body under the
// title) and operator labels.
export function serializeArgumentText(
    header: TArgumentHeader,
    items: TTextTreeItem[]
): string {
    const lines: string[] = [header.title]
    if (header.description && header.description.length > 0) {
        lines.push("", header.description)
    }

    for (const item of items) {
        switch (item.type) {
            case "premise-header": {
                lines.push("")
                lines.push(
                    item.role === "conclusion" ? "CONCLUSION" : "SUPPORTING"
                )
                if (item.title && item.title.length > 0) lines.push(item.title)
                break
            }
            case "claim": {
                const pad = INDENT.repeat(item.depth)
                const prefix =
                    (item.claimType === "citation" ? "Citation: " : "") +
                    (item.negated ? "NOT " : "")
                lines.push(`${pad}${prefix}${item.claimTitle}`)
                if (item.claimBody.length > 0) {
                    lines.push(`${pad}${item.claimBody}`)
                }
                break
            }
            case "operator": {
                lines.push(`${INDENT.repeat(item.depth)}${item.label}`)
                break
            }
            case "empty-premise": {
                lines.push("(empty)")
                break
            }
        }
    }

    return lines.join("\n")
}
