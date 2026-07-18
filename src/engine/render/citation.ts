/**
 * Citation display projection — a pure formatting layer over the IEEE reference
 * schema. Inline label generation, type humanization, a defensive structured
 * source description, and best-effort byline parsing. Clients keep only their
 * render shells (web MUI component, mobile RN text) and consume this.
 *
 * Schema source of truth: `@proposit/proposit-core` IEEE reference types
 * (re-exported via `@proposit/shared/schemas/model/references`).
 */

import type {
    TIEEEReference,
    TUnparsedCitation,
    TUnparsedCitationTypeGuess,
    TAuthor,
} from "../../schemas/model/references.js"

/**
 * Map a citation's type to a human-readable label. Covers the 33 structured IEEE
 * reference types plus the `"unknown"` type-guess fallback an unparsed citation
 * may carry. For an unparsed citation, callers pass its `citationTypeGuess`.
 * Unrecognized values fall back to the raw string (defensive).
 */
export const humanizeCitationTypeMap: Record<
    TUnparsedCitationTypeGuess,
    string
> = {
    Book: "Book",
    BookChapter: "Book Chapter",
    Website: "Website",
    JournalArticle: "Journal Article",
    MagazineArticle: "Magazine Article",
    NewspaperArticle: "Newspaper Article",
    ConferencePaper: "Conference Paper",
    ConferenceProceedings: "Conference Proceedings",
    TechnicalReport: "Technical Report",
    Thesis: "Thesis",
    Patent: "Patent",
    Standard: "Standard",
    Dictionary: "Dictionary",
    Encyclopedia: "Encyclopedia",
    Dataset: "Dataset",
    Software: "Software",
    OnlineDocument: "Online Document",
    Blog: "Blog",
    SocialMedia: "Social Media",
    Preprint: "Preprint",
    Video: "Video",
    Podcast: "Podcast",
    Course: "Course",
    Presentation: "Presentation",
    Interview: "Interview",
    PersonalCommunication: "Personal Communication",
    Email: "Email",
    Law: "Law",
    CourtCase: "Court Case",
    GovernmentPublication: "Government Publication",
    Datasheet: "Datasheet",
    ProductManual: "Product Manual",
    Handbook: "Handbook",
    unknown: "Unknown",
}

export function humanizeCitationType(type: TUnparsedCitationTypeGuess): string {
    return humanizeCitationTypeMap[type] ?? type
}

/**
 * Build a comma-separated list of author surnames for inline rendering. Used by
 * getInlineSourceLabel for types with an `authors` array.
 */
function formatAuthorsList(authors: TAuthor[] | undefined): string | undefined {
    if (!authors || authors.length === 0) return undefined
    return authors.map((a) => a.familyName).join(", ")
}

/**
 * Build a one-line inline label for a citation in a sources list, rendering
 * meaningful text for every citation type. Prefers a discriminative content
 * field per type; when the citation is null/undefined or all preferred fields
 * are empty, falls back to the human-readable type name. Callers may pass `null`
 * when the source is structurally a non-citation claim.
 */
export function getInlineSourceLabel(
    citation: TIEEEReference | TUnparsedCitation | null | undefined
): string {
    if (!citation) return "Citation"
    const type = citation.type
    switch (type) {
        case "Book": {
            const c = citation
            return (
                c.title ??
                formatAuthorsList(c.authors) ??
                humanizeCitationType(type)
            )
        }
        case "Website": {
            const c = citation
            return c.pageTitle ?? c.url ?? humanizeCitationType(type)
        }
        case "BookChapter": {
            const c = citation
            return c.chapterTitle ?? humanizeCitationType(type)
        }
        case "Handbook": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "TechnicalReport": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Standard": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Thesis": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Patent": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Dictionary": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Encyclopedia": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "JournalArticle": {
            const c = citation
            if (c.journalTitle) {
                return c.title
                    ? `${c.title} (${c.journalTitle})`
                    : c.journalTitle
            }
            return c.title ?? humanizeCitationType(type)
        }
        case "MagazineArticle": {
            const c = citation
            if (c.magazineTitle) {
                return c.title
                    ? `${c.title} (${c.magazineTitle})`
                    : c.magazineTitle
            }
            return c.title ?? humanizeCitationType(type)
        }
        case "NewspaperArticle": {
            const c = citation
            if (c.newspaperTitle) {
                return c.title
                    ? `${c.title} (${c.newspaperTitle})`
                    : c.newspaperTitle
            }
            return c.title ?? humanizeCitationType(type)
        }
        case "ConferencePaper": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "ConferenceProceedings": {
            const c = citation
            return c.conferenceName ?? humanizeCitationType(type)
        }
        case "Dataset": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Software": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "OnlineDocument": {
            const c = citation
            return c.title ?? c.url ?? humanizeCitationType(type)
        }
        case "Blog": {
            const c = citation
            return (
                c.postTitle ?? c.author.familyName ?? humanizeCitationType(type)
            )
        }
        case "SocialMedia": {
            const c = citation
            return c.author.familyName ?? humanizeCitationType(type)
        }
        case "Preprint": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Video": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Podcast": {
            const c = citation
            return c.episodeTitle ?? humanizeCitationType(type)
        }
        case "Course": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Presentation": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Interview": {
            const c = citation
            return c.interviewee.familyName ?? humanizeCitationType(type)
        }
        case "PersonalCommunication": {
            const c = citation
            return c.person.familyName ?? humanizeCitationType(type)
        }
        case "Email": {
            const c = citation
            return c.sender.familyName ?? humanizeCitationType(type)
        }
        case "Law": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "CourtCase": {
            const c = citation
            return c.caseName ?? humanizeCitationType(type)
        }
        case "GovernmentPublication": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "Datasheet": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "ProductManual": {
            const c = citation
            return c.title ?? humanizeCitationType(type)
        }
        case "unparsed": {
            const c = citation
            const base =
                (c.text.length > 0 ? c.text : undefined) ??
                c.url ??
                humanizeCitationType(c.citationTypeGuess)
            return `${base} ⚠ unparsed`
        }
        default: {
            // Exhaustiveness fallback — defensive for future schema additions
            // that land before this helper is updated.
            return humanizeCitationType(type)
        }
    }
}

// Structured, best-effort view of a cited source, read defensively from the
// citation reference object (a large per-type union) so any reference kind
// renders without a per-type branch.
export type TSourceDetail = {
    typeLabel: string
    title: string | null
    authors: string | null
    year: string | null
    url: string | null
}

const TITLE_KEYS = [
    "title",
    "pageTitle",
    "chapterTitle",
    "postTitle",
    "bookTitle",
    "manualTitle",
    "standardTitle",
]
const AUTHOR_KEYS = ["authors", "inventors", "editors"]

// Best-effort source description from an IEEE reference object. Reads shared,
// commonly-present fields defensively rather than branching on the ~30 typed
// reference variants — this is display-only.
export function describeSource(
    citation: unknown,
    claimUrl: string | null
): TSourceDetail | null {
    const ref =
        citation !== null && typeof citation === "object"
            ? (citation as Record<string, unknown>)
            : null
    const url = firstString(ref, ["url"]) ?? claimUrl
    if (ref === null) {
        return url === null
            ? null
            : { typeLabel: "Link", title: null, authors: null, year: null, url }
    }
    const rawType = typeof ref.type === "string" ? ref.type : "Source"
    return {
        typeLabel: humanizeType(rawType),
        title: firstString(ref, TITLE_KEYS),
        authors: resolveAuthors(ref),
        year: resolveYear(ref),
        url,
    }
}

// Split a PascalCase reference type ("JournalArticle") into words.
function humanizeType(type: string): string {
    const spaced = type.replace(/([a-z])([A-Z])/g, "$1 $2")
    return spaced.length > 0 ? spaced : "Source"
}

function firstString(
    ref: Record<string, unknown> | null,
    keys: string[]
): string | null {
    if (ref === null) return null
    for (const key of keys) {
        const value = ref[key]
        if (typeof value === "string" && value.length > 0) return value
    }
    return null
}

function resolveYear(ref: Record<string, unknown>): string | null {
    if (typeof ref.year === "string" && ref.year.length > 0) return ref.year
    const date = ref.date
    if (typeof date === "string" && date.length > 0) return date.slice(0, 4)
    if (date instanceof Date) return String(date.getFullYear())
    return null
}

function resolveAuthors(ref: Record<string, unknown>): string | null {
    for (const key of AUTHOR_KEYS) {
        const value = ref[key]
        if (Array.isArray(value) && value.length > 0) {
            const names = value.map(personName).filter((n) => n.length > 0)
            if (names.length > 0) return names.join(", ")
        }
    }
    // Blog / social-media references carry a single `author` object.
    const single = ref.author
    if (single !== undefined) {
        const name = personName(single)
        if (name.length > 0) return name
    }
    return null
}

function personName(person: unknown): string {
    if (person === null || typeof person !== "object") return ""
    const record = person as Record<string, unknown>
    const given = typeof record.givenNames === "string" ? record.givenNames : ""
    const family =
        typeof record.familyName === "string" ? record.familyName : ""
    return [given, family].filter((part) => part.length > 0).join(" ")
}

function parseName(name: string): TAuthor {
    const t = name.trim()
    const i = t.lastIndexOf(" ")
    // Mononym → empty givenNames on purpose: the schema requires both parts, so
    // a downstream Value.Check flags it for the user rather than inventing data.
    return i === -1
        ? { givenNames: "", familyName: t }
        : {
              givenNames: t.slice(0, i).trim(),
              familyName: t.slice(i + 1).trim(),
          }
}

// Best-effort byline → authors. Prefer explicit separators (" and " / "&" / ";");
// fall back to commas only when none are present (a lone "Doe, John" is
// ambiguous last-first and will parse as two — acceptable: the user reviews).
export function parseByline(byline: string): TAuthor[] {
    const trimmed = byline.trim()
    if (trimmed.length === 0) return []
    const hasExplicit = /\band\b|&|;/i.test(trimmed)
    const parts = hasExplicit
        ? trimmed.split(/\s+and\s+|&|;/i)
        : trimmed.split(",")
    return parts
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map(parseName)
}
