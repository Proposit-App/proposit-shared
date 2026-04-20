// IEEE Citation Templates https://journals.ieeeauthorcenter.ieee.org/wp-content/uploads/sites/7/IEEE_Reference_Guide.pdf

export * from "@proposit/proposit-core/extensions/ieee"

// ── Locally-computed type ──

import type { Static } from "typebox"
import type { IEEEReferenceSchemaMap } from "@proposit/proposit-core/extensions/ieee"

export type TIEEEReferenceMap = {
    [K in keyof typeof IEEEReferenceSchemaMap]: Static<
        (typeof IEEEReferenceSchemaMap)[K]
    >
}

// ── Server-only API schemas ──

import { Type } from "typebox"
import { ReferenceTypeSchema } from "@proposit/proposit-core/extensions/ieee"

export const ReferenceImportRequestSchema = Type.Object({
    url: Type.String(),
    referenceType: ReferenceTypeSchema,
})
export type TReferenceImportRequest = Static<
    typeof ReferenceImportRequestSchema
>

export const ReferenceAnalyzeRequestSchema = Type.Object({
    url: Type.String(),
    referenceType: ReferenceTypeSchema,
    htmlText: Type.String(),
})
export type TReferenceAnalyzeRequest = Static<
    typeof ReferenceAnalyzeRequestSchema
>

// ── Citation templates ──

export const BOOK_TEMPLATE = `${"{author}"}. ${"{title}"}. ${"{city}"}, ${"{state}"}, ${"{country}"}: ${"{publisher}"}, ${"{year}"} .`
export const WEBSITE_TEMPLATE = `${"{authors}"} . "${"{pageTitle}"}." ${"{websiteTitle}"} . Accessed: ${"{accessDateString}"} . [Online]. Available: ${"{url}"} .`
export const BOOK_CHAPTER_TEMPLATE = `${"{author}"}, "${"{chapterTitle}"}," in ${"{bookTitle}"}, ${"{edition}"} ed., ${"{editor}"} Ed., ${"{city}"}, ${"{state}"}, ${"{country}"}: ${"{publisher}"}, ${"{year}"}, ch. ${"{chapter}"} , sec. ${"{section}"} , pp. ${"{pages}"}.`
export const HANDBOOK_TEMPLATE = `${"{manualTitle}"} , ${"{edition}"} ed., ${"{company}"} , ${"{city}"}, ${"{state}"}, ${"{year}"} , pp. ${"{pages}"} .`
export const TECHNICAL_REPORT_TEMPLATE = `${"{author}"} , "${"{title}"}," ${"{company}"} , ${"{city}"}, ${"{state}"}, ${"{country}"} , Rep. ${"{reportNumber}"} , ${"{year}"} .`
export const STANDARD_TEMPLATE = `${"{standardTitle}"} , ${"{standardNumber}"} , ${"{organization}"} , ${"{location}"} , ${"{date}"} .`
export const THESIS_TEMPLATE = `${"{author}"} , "${"{title}"}," ${"{degreeType}"} thesis, ${"{department}"} , ${"{university}"} , ${"{city}"} , ${"{state}"} , ${"{country}"} , ${"{year}"} .`
export const PATENT_TEMPLATE = `${"{inventor}"} , "${"{title}"}," ${"{country}"} Patent ${"{patentNumber}"} , ${"{date}"} .`
export const DATASET_DOI_TEMPLATE = `${"{author}"} , ${"{date}"} , "${"{title}"}," ${"{source}"} , doi: ${"{doi}"} .`
export const DATASET_URL_TEMPLATE = `${"{author}"} , ${"{date}"} , "${"{title}"}," ${"{source}"} . [Online]. Available: ${"{url}"} .`
export const CONFERENCE_PRESENTED_TEMPLATE = `${"{author}"} , "${"{title}"}," presented at the ${"{conferenceName}"} , ${"{city}"} , ${"{state}"} , ${"{country}"} , ${"{month}"} ${"{day}"} , ${"{year}"} , Paper ${"{paperNumber}"} .`
export const CONFERENCE_PROCEEDINGS_PRINT_TEMPLATE = `${"{author}"} , "${"{title}"}," in ${"{conferenceName}"} , ${"{city}"} , ${"{state}"} , ${"{country}"} , ${"{year}"} , pp. ${"{pages}"} .`
export const CONFERENCE_PROCEEDINGS_DOI_TEMPLATE = `${"{author}"} , "${"{title}"}," in ${"{conferenceName}"} , ${"{year}"} , pp. ${"{pages}"} , doi: ${"{doi}"} .`
export const JOURNAL_ARTICLE_TEMPLATE = `${"{author}"} , "${"{title}"}," ${"{journalName}"} , vol. ${"{volume}"} , no. ${"{issue}"} , pp. ${"{pages}"} , ${"{month}"} ${"{year}"} .`
export const MAGAZINE_ARTICLE_TEMPLATE = `${"{author}"} , "${"{title}"}," ${"{magazineName}"} , vol. ${"{volume}"} , no. ${"{issue}"} , pp. ${"{pages}"} , ${"{month}"} ${"{year}"} .`
export const NEWSPAPER_ARTICLE_TEMPLATE = `${"{author}"} , "${"{title}"}," ${"{newspaperName}"} , ${"{month}"} ${"{day}"} , ${"{year}"} , pp. ${"{pages}"} .`
export const BLOG_TEMPLATE = `${"{author}"} , "${"{title}"}," ${"{blogName}"} , ${"{month}"} ${"{day}"} , ${"{year}"} . [Online]. Available: ${"{url}"} .`
export const SOCIAL_MEDIA_TEMPLATE = `${"{author}"} , "${"{contentSnippet}"}," ${"{platform}"} , ${"{month}"} ${"{day}"} , ${"{year}"} . [Online]. Available: ${"{url}"} .`
export const VIDEO_TEMPLATE = `${"{author}"} , "${"{title}"}," ${"{platform}"} , ${"{month}"} ${"{day}"} , ${"{year}"} . [Online]. Available: ${"{url}"} .`
export const PODCAST_TEMPLATE = `${"{author}"} , "${"{title}"}," ${"{podcastName}"} , ${"{platform}"} , ${"{month}"} ${"{day}"} , ${"{year}"} . [Online]. Available: ${"{url}"} .`
export const COURSE_TEMPLATE = `${"{university}"} . (${"{year}"}). ${"{courseTitle}"} . [Online]. Available: ${"{url}"} .`
export const PRESENTATION_TEMPLATE = `${"{author}"} , "${"{title}"}," presented at ${"{event}"} , ${"{city}"} , ${"{state}"} , ${"{country}"} , ${"{month}"} ${"{year}"} .`
export const INTERVIEW_TEMPLATE = `${"{interviewer}"} , interview with ${"{interviewee}"} , ${"{month}"} ${"{day}"} , ${"{year}"} .`
export const PERSONAL_COMMUNICATION_TEMPLATE = `${"{author}"} , private communication, ${"{month}"} ${"{year}"} .`
export const EMAIL_TEMPLATE = `${"{author}"} , personal email, ${"{month}"} ${"{day}"} , ${"{year}"} .`
export const LAW_TEMPLATE = `${"{legislativeBody}"} . ${"{session}"} . (${"{year}"} , ${"{month}"} ${"{day}"}). ${"{documentTitle}"} . [Online]. Available: ${"{url}"} .`
export const COURT_CASE_TEMPLATE = `${"{caseName}"} , ${"{reporter}"} , vol. ${"{volume}"} , ${"{year}"} , p. ${"{page}"} .`
export const GOVERNMENT_PUBLICATION_TEMPLATE = `${"{governmentBody}"} . (${"{year}"} , ${"{month}"} ${"{day}"}). ${"{title}"} . [Online]. Available: ${"{url}"} .`
export const DATASHEET_TEMPLATE = `${"{manufacturer}"} , "${"{datasheetTitle}"}," ${"{partNumber}"} , ${"{revision}"} , ${"{year}"} . [Online]. Available: ${"{url}"} .`
export const PRODUCT_MANUAL_TEMPLATE = `${"{manufacturer}"} , ${"{productName}"} User Manual, ${"{edition}"} ed., ${"{year}"} . [Online]. Available: ${"{url}"} .`
