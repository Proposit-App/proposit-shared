import { describe, test, expect } from "vitest"
import type {
    TIEEEReference,
    TUnparsedCitation,
} from "../../schemas/model/references.js"
import { extractCitationTitle } from "../embedding-text.js"

describe("extractCitationTitle", () => {
    // Strategy 1: direct title field
    test("returns title for Book reference", () => {
        const result = extractCitationTitle({
            type: "Book",
            title: "Climate Change Evidence",
            year: "2024",
            authors: [{ givenNames: "John", familyName: "Smith" }],
            publisher: "MIT Press",
        } as TIEEEReference)
        expect(result).toBe("Climate Change Evidence")
    })

    // Strategy 2: alternate title-like fields
    test("returns pageTitle for Website reference", () => {
        const result = extractCitationTitle({
            type: "Website",
            pageTitle: "How Climate Models Work",
            websiteTitle: "NASA",
            authors: [{ givenNames: "Jane", familyName: "Doe" }],
            accessedDate: new Date(),
            url: "https://nasa.gov",
        } as TIEEEReference)
        expect(result).toBe("How Climate Models Work")
    })

    test("returns chapterTitle for BookChapter reference", () => {
        const result = extractCitationTitle({
            type: "BookChapter",
            chapterTitle: "The Greenhouse Effect",
            bookTitle: "Earth Science",
            year: "2024",
            authors: [{ givenNames: "A", familyName: "B" }],
            publisher: "P",
            location: "L",
        } as TIEEEReference)
        expect(result).toBe("The Greenhouse Effect")
    })

    test("returns postTitle for Blog reference", () => {
        const result = extractCitationTitle({
            type: "Blog",
            postTitle: "Why Carbon Taxes Work",
            blogName: "EconBlog",
            author: { givenNames: "A", familyName: "B" },
            date: new Date(),
            url: "https://example.com",
            accessedDate: new Date(),
        } as TIEEEReference)
        expect(result).toBe("Why Carbon Taxes Work")
    })

    test("returns episodeTitle for Podcast reference", () => {
        const result = extractCitationTitle({
            type: "Podcast",
            episodeTitle: "Sea Level Rise",
            seriesTitle: "Climate Pod",
            platform: "Spotify",
            url: "https://example.com",
            accessedDate: new Date(),
        } as TIEEEReference)
        expect(result).toBe("Sea Level Rise")
    })

    test("returns caseName for CourtCase reference", () => {
        const result = extractCitationTitle({
            type: "CourtCase",
            caseName: "Massachusetts v. EPA",
            reporter: "US",
            volume: "549",
            year: "2007",
            page: "497",
        } as unknown as TIEEEReference)
        expect(result).toBe("Massachusetts v. EPA")
    })

    // Strategy 3: synthetic strings
    test("returns conferenceName for ConferenceProceedings", () => {
        const result = extractCitationTitle({
            type: "ConferenceProceedings",
            conferenceName: "IEEE Climate Conference",
            location: "NYC",
            date: new Date(),
            publisher: "IEEE",
        } as TIEEEReference)
        expect(result).toBe("IEEE Climate Conference")
    })

    test("constructs synthetic string for SocialMedia", () => {
        const result = extractCitationTitle({
            type: "SocialMedia",
            author: { givenNames: "James", familyName: "Hansen" },
            platform: "Twitter",
            postDate: new Date(),
            url: "https://twitter.com/...",
        } as TIEEEReference)
        expect(result).toBe("Hansen on Twitter")
    })

    test("constructs synthetic string for Interview", () => {
        const result = extractCitationTitle({
            type: "Interview",
            interviewee: { givenNames: "Michael", familyName: "Mann" },
            date: new Date(),
        } as TIEEEReference)
        expect(result).toBe("Interview with Mann")
    })

    test("constructs synthetic string for PersonalCommunication", () => {
        const result = extractCitationTitle({
            type: "PersonalCommunication",
            person: { givenNames: "Gavin", familyName: "Schmidt" },
            date: new Date(),
        } as TIEEEReference)
        expect(result).toBe("Communication with Schmidt")
    })

    test("constructs synthetic string for Email", () => {
        const result = extractCitationTitle({
            type: "Email",
            sender: { givenNames: "Phil", familyName: "Jones" },
            recipient: { givenNames: "Michael", familyName: "Mann" },
            date: new Date(),
        } as TIEEEReference)
        expect(result).toBe("Email from Jones to Mann")
    })

    // Unparsed citations (ingestion-extracted, not yet structured into IEEE)
    test("returns text for an unparsed citation with text", () => {
        const result = extractCitationTitle({
            type: "unparsed",
            text: "An interesting article",
            citationTypeGuess: "Website",
            url: "https://example.com/article",
        } satisfies TUnparsedCitation)
        expect(result).toBe("An interesting article")
    })

    test("falls back to url for an unparsed citation without text", () => {
        const result = extractCitationTitle({
            type: "unparsed",
            text: "",
            citationTypeGuess: "Website",
            url: "https://example.com/article",
        } satisfies TUnparsedCitation)
        expect(result).toBe("https://example.com/article")
    })

    test("returns null for an unparsed citation with neither text nor url", () => {
        const result = extractCitationTitle({
            type: "unparsed",
            text: "",
            citationTypeGuess: "unknown",
        } satisfies TUnparsedCitation)
        expect(result).toBeNull()
    })

    // Legacy "Other" citations (pre-0.8.19 imports)
    test("returns text for Other citation (legacy import path)", () => {
        const result = extractCitationTitle({
            type: "Other",
            text: "Source citation text from import",
        } as unknown as TIEEEReference)
        expect(result).toBe("Source citation text from import")
    })

    test("returns null for Other citation with empty text", () => {
        const result = extractCitationTitle({
            type: "Other",
            text: "",
        } as unknown as TIEEEReference)
        expect(result).toBeNull()
    })

    test("returns null for Other citation with no text field", () => {
        const result = extractCitationTitle({
            type: "Other",
        } as unknown as TIEEEReference)
        expect(result).toBeNull()
    })

    // Fallback
    test("returns null for empty title", () => {
        const result = extractCitationTitle({
            type: "Book",
            title: "   ",
            year: "2024",
            authors: [],
            publisher: "P",
        } as TIEEEReference)
        expect(result).toBeNull()
    })
})
