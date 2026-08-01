import type { TProjectReactiveSnapshot } from "../engine.js"
import { buildTextTree, type TTextTreeItem } from "../text-tree.js"
import type { TClaim } from "../../schemas/model/claims.js"
import type { TOriginAnchor } from "../../schemas/model/origin.js"
import { getInlineSourceLabel } from "./citation.js"

/**
 * Serialize an argument's full contents — metadata, the premise/claim logic
 * tree, the claim glossary, and cited sources — into a single human-readable
 * markdown string suitable for copying to the clipboard.
 *
 * Pure and runtime-agnostic: it reads only the reactive snapshot the client
 * already holds, so the same function can run in a browser handler or a test. It
 * reuses `buildTextTree(snapshot)` so the rendered logic matches the text view
 * exactly (derivation premises are filtered out there, conclusion first).
 */
export function serializeArgumentToMarkdown(
    snapshot: TProjectReactiveSnapshot
): string {
    const sections: string[] = []

    sections.push(renderHeader(snapshot))

    const logic = renderLogic(snapshot)
    if (logic) sections.push(logic)

    const claims = renderClaimGlossary(snapshot)
    if (claims) sections.push(claims)

    const sources = renderSources(snapshot)
    if (sources) sections.push(sources)

    return sections.join("\n\n") + "\n"
}

const ORIGIN_LEAD = "Based on origin text"

/**
 * The author's public claim that the argument reproduces its source text
 * faithfully, stated for the reader who was handed the document and cannot
 * otherwise tell a representation from a loose jumping-off point.
 *
 * "sets out to" because this is a claim, not a verified fact. Nothing is
 * emitted for the other stance: an argument that merely used a text as a
 * starting point is the unremarkable default, and a line disclaiming fidelity
 * would be noise on the overwhelming majority of exports.
 */
const REPRESENTATION_CLAIM =
    "This argument sets out to represent that text faithfully."

/**
 * The passage an anchored part of the argument was written from. Quoted rather
 * than located: a reader holding the exported document can find the passage by
 * searching the source text for it, whereas the anchor's code-point offsets
 * would be unusable outside the app.
 *
 * Whitespace is collapsed because a passage may span lines in the source text
 * and this renders as a single line.
 */
export function originPassage(anchor: Pick<TOriginAnchor, "exact">): string {
    return `${ORIGIN_LEAD} "${anchor.exact.replace(/\s+/g, " ").trim()}"`
}

/**
 * The passages one target of the argument was written from — an expression id,
 * a premise id, or the argument id. Empty whenever there is no origin data,
 * which is the ordinary state of an argument written from scratch rather than
 * an error.
 *
 * Exported so every reading surface renders a passage the same way the export
 * does. `origin` is optional-chained at both hops because a snapshot rehydrated
 * from wire data written before origin data existed omits the slice entirely,
 * and a caller that gets that wrong crashes on it.
 */
export function originPassagesFor(
    snapshot: Pick<TProjectReactiveSnapshot, "origin"> | undefined,
    targetId: string
): string[] {
    const anchors = snapshot?.origin?.anchors?.[targetId] ?? []
    return anchors.map(originPassage)
}

function renderHeader(snapshot: TProjectReactiveSnapshot): string {
    const { argument } = snapshot
    const lines: string[] = [`# ${argument.title}`]

    if (argument.description && argument.description.trim().length > 0) {
        lines.push("", argument.description.trim())
    }

    const status = argument.published
        ? `Published${argument.publishedOn ? ` on ${formatDate(argument.publishedOn)}` : ""}`
        : "Draft"
    lines.push("", `> Version ${argument.version} — ${status}`)

    // Provenance for the argument as a whole rides in the same blockquote as
    // the version line — it describes the document, not any one logic item.
    const originDocument = snapshot.origin?.document
    if (originDocument) {
        const attribution = originDocument.reference
            ? ` — ${getInlineSourceLabel(originDocument.reference)}`
            : ""
        const passages = originPassagesFor(snapshot, argument.id)
        for (const passage of passages) {
            lines.push(`> ${passage}${attribution}`)
        }
        // With no whole-argument passage, still name the source, so passages
        // quoted further down are attributed to something.
        if (passages.length === 0 && originDocument.reference) {
            lines.push(`> ${ORIGIN_LEAD}${attribution}`)
        }
        // Guarded by the document, not just the link: a fidelity claim about a
        // source text the export never names would say nothing to a reader.
        if (snapshot.origin?.link?.stance === "representation") {
            lines.push(`> ${REPRESENTATION_CLAIM}`)
        }
    }

    return lines.join("\n")
}

function renderLogic(snapshot: TProjectReactiveSnapshot): string {
    const items = buildTextTree(snapshot)
    if (items.length === 0) return ""

    const lines: string[] = ["## Logic"]

    for (const item of items) {
        if (item.type === "premise-header") {
            const role =
                item.role === "conclusion" ? "Conclusion" : "Supporting premise"
            const heading = item.title ? `${role} — ${item.title}` : role
            lines.push("", `### ${heading}`, "")
            for (const passage of originPassagesFor(snapshot, item.premiseId)) {
                lines.push(passage, "")
            }
        } else if (item.type === "claim") {
            const indent = "  ".repeat(item.depth)
            const prefix = item.negated ? "NOT " : ""
            lines.push(`${indent}- ${prefix}${claimLabel(item, snapshot)}`)
            // A nested bullet, not a bare line: a line following a list item is
            // folded into that item's paragraph by markdown renderers.
            for (const passage of originPassagesFor(
                snapshot,
                item.expressionId
            )) {
                lines.push(`${indent}  - ${passage}`)
            }
        } else if (item.type === "operator") {
            const indent = "  ".repeat(item.depth)
            lines.push(`${indent}- *${item.label}*`)
        } else if (item.type === "empty-premise") {
            lines.push("_(no claims in this premise)_")
        }
    }

    return lines.join("\n")
}

/**
 * Resolve the displayable text for a citation claim. Prefers the citation's own
 * text (an `unparsed` citation's extracted `text`), then its url, then a neutral
 * label — so a url-less citation never renders blank. `url` is nullable on the
 * citation claim, so it can no longer be returned bare. The `citation` field is
 * statically non-nullable, but this serializer may read a snapshot rehydrated
 * from older wire data, so it defends against a missing object.
 */
function citationClaimLabel(
    claim: Extract<TClaim, { type: "citation" }>
): string {
    const citation = claim.citation as TClaim["citation"] | null | undefined
    if (citation?.type === "unparsed" && citation.text.trim().length > 0) {
        return citation.text
    }
    if (claim.url && claim.url.trim().length > 0) return claim.url
    return "(source)"
}

/**
 * Resolve the displayable text for a claim node. Normal claims carry a title;
 * citation/axiomatic-bound variables have no user-authored title, so fall back
 * to the citation text/url or the axiom kind from the claim record.
 */
function claimLabel(
    item: Extract<TTextTreeItem, { type: "claim" }>,
    snapshot: TProjectReactiveSnapshot
): string {
    if (item.claimTitle.trim().length > 0) return item.claimTitle
    const claim = item.claimId ? snapshot.claims[item.claimId] : undefined
    if (claim?.type === "citation") return citationClaimLabel(claim)
    if (claim?.type === "axiomatic") return `Axiom (${claim.axiom})`
    return "(unbound claim)"
}

function renderClaimGlossary(snapshot: TProjectReactiveSnapshot): string {
    const entries = Object.values(snapshot.claims)
        .filter((claim): claim is Extract<TClaim, { type: "normal" }> => {
            return claim.type === "normal"
        })
        .sort((a, b) => a.title.localeCompare(b.title))

    if (entries.length === 0) return ""

    const lines: string[] = ["## Claims"]
    for (const claim of entries) {
        const body =
            claim.body && claim.body.trim().length > 0
                ? ` — ${claim.body.trim()}`
                : ""
        lines.push(`- **${claim.title}** _(${claim.kind})_${body}`)
    }

    return lines.join("\n")
}

function renderSources(snapshot: TProjectReactiveSnapshot): string {
    // Map each cited source claim to the set of claims that cite it, so the
    // export can list every distinct source once with its citers.
    const sourceToCiters = new Map<string, Set<string>>()
    for (const [citingClaimId, edges] of Object.entries(snapshot.citations)) {
        for (const edge of edges) {
            const citers =
                sourceToCiters.get(edge.supportingClaimId) ?? new Set<string>()
            citers.add(citingClaimId)
            sourceToCiters.set(edge.supportingClaimId, citers)
        }
    }

    if (sourceToCiters.size === 0) return ""

    const lines: string[] = ["## Sources"]
    const sourceIds = [...sourceToCiters.keys()].sort()
    for (const sourceId of sourceIds) {
        const source = snapshot.claims[sourceId]
        const label =
            source?.type === "citation"
                ? citationClaimLabel(source)
                : "(unknown source)"
        const citerTitles = [...(sourceToCiters.get(sourceId) ?? [])]
            .map((claimId) => citingClaimTitle(claimId, snapshot))
            .filter((title): title is string => title !== null)
            .sort()
        const citedBy =
            citerTitles.length > 0
                ? ` — cited by: ${citerTitles.join("; ")}`
                : ""
        lines.push(`- ${label}${citedBy}`)
    }

    return lines.join("\n")
}

function citingClaimTitle(
    claimId: string,
    snapshot: TProjectReactiveSnapshot
): string | null {
    const claim = snapshot.claims[claimId]
    if (claim?.type === "normal" && claim.title.trim().length > 0) {
        return claim.title
    }
    return null
}

// `publishedOn` is statically a `Date`, but a snapshot rehydrated from the wire
// may still carry the ISO string form, so accept both runtime shapes.
function formatDate(value: Date | string | number): string {
    try {
        return new Date(value).toISOString().slice(0, 10)
    } catch {
        return String(value)
    }
}
