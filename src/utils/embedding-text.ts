import type { TIEEEReference } from "../schemas/model/references.js"

/**
 * Extract the best embeddable text from a citation object.
 * Handles both strict IEEE references and the non-IEEE
 * `{ type: "Other", text: "..." }` format used by the import path.
 * Returns null if no meaningful text can be extracted.
 *
 * Reused for both server-side embedding generation and
 * client-side fuzzy search display text.
 */
export function extractCitationTitle(
    citation: TIEEEReference | { type: "Other"; text?: string }
): string | null {
    let text: string | null = null

    switch (citation.type) {
        // Unparsed URL sources (import path, quick drafts)
        case "UnparsedURL": {
            const unparsed = citation as TIEEEReference & {
                url: string
                text?: string
            }
            text = unparsed.text ?? unparsed.url
            break
        }

        // Legacy non-IEEE: plain-text citations from pre-0.8.19 imports
        case "Other":
            text = (citation as { text?: string }).text ?? null
            break

        // Strategy 1: direct title field (23 types)
        case "Book":
        case "Handbook":
        case "TechnicalReport":
        case "Standard":
        case "Thesis":
        case "Patent":
        case "Dictionary":
        case "Encyclopedia":
        case "JournalArticle":
        case "MagazineArticle":
        case "NewspaperArticle":
        case "ConferencePaper":
        case "Dataset":
        case "Software":
        case "OnlineDocument":
        case "Preprint":
        case "Video":
        case "Course":
        case "Presentation":
        case "Law":
        case "GovernmentPublication":
        case "Datasheet":
        case "ProductManual":
            text = citation.title
            break

        // Strategy 2: alternate title-like field (5 types)
        case "Website":
            text = citation.pageTitle
            break
        case "BookChapter":
            text = citation.chapterTitle
            break
        case "Blog":
            text = citation.postTitle
            break
        case "Podcast":
            text = citation.episodeTitle
            break
        case "CourtCase":
            text = citation.caseName
            break

        // Strategy 3: synthetic string (5 types)
        case "ConferenceProceedings":
            text = citation.conferenceName
            break
        case "SocialMedia":
            text = `${citation.author.familyName} on ${citation.platform}`
            break
        case "Interview":
            text = `Interview with ${citation.interviewee.familyName}`
            break
        case "PersonalCommunication":
            text = `Communication with ${citation.person.familyName}`
            break
        case "Email":
            text = `Email from ${citation.sender.familyName} to ${citation.recipient.familyName}`
            break
    }

    if (!text || text.trim().length === 0) return null
    return text
}
