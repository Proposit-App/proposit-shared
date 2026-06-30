import { Type, type Static } from "typebox"

// IMPORTANT NOTE: These literals need to match the auth provider if an import platform
//  is also an argument data platform. Right now, twitter is the only such example.
//  Specifically, the auth provider `id` value must match.
export const TwitterImport = Type.Literal("twitter")
export const RedditImport = Type.Literal("reddit")
export const FromText = Type.Literal("raw_text")
export const NoImport = Type.Literal("manual")
export const ArgumentImportOrigin = Type.Union([
    TwitterImport,
    RedditImport,
    FromText,
    NoImport,
])
export type TArgumentImportOrigin = Static<typeof ArgumentImportOrigin>

// Synthetic showcase arguments seeded by the curation pipeline. Not a
// user-importable origin (the import flow uses ArgumentImportOrigin), but a
// valid stored `arguments.platform` value, so it lives in ArgumentPlatform
// below — the superset used by the stored-argument schema.
export const CuratedOrigin = Type.Literal("curated")
export type TCuratedOrigin = Static<typeof CuratedOrigin>

// The stored `arguments.platform` value: every import origin plus "curated".
export const ArgumentPlatform = Type.Union([
    TwitterImport,
    RedditImport,
    FromText,
    NoImport,
    CuratedOrigin,
])
export type TArgumentPlatform = Static<typeof ArgumentPlatform>

// Common
// For all origins other than manual
const ExternalPlatformData = Type.Object(
    {
        argumentTitle: Type.Optional(Type.String()),
        textContent: Type.String(),
    },
    { additionalProperties: false }
)
// If manual, there must be a title but never content
const NoPlatformData = Type.Object(
    {
        argumentTitle: Type.String(),
        textContent: Type.Null(),
    },
    { additionalProperties: false }
)

// Twitter specifics
export const TwitterImportSelfMode = Type.Literal("self_author")
export type TTwitterImportSelfMode = Static<typeof TwitterImportSelfMode>
export const TwitterImportOtherMode = Type.Literal("other_author")
export type TTwitterImportOtherMode = Static<typeof TwitterImportOtherMode>
export const TwitterImportCopyMode = Type.Literal("copy_contents")
export type TTwitterImportCopyMode = Static<typeof TwitterImportCopyMode>
export const TwitterImportMode = Type.Union([
    TwitterImportSelfMode,
    TwitterImportOtherMode,
    TwitterImportCopyMode,
])
export type TTwitterImportMode = Static<typeof TwitterImportMode>

// Left open to unknown keys on purpose: this is X's oEmbed response, not our
// trust boundary — X may add fields and we don't want to reject valid embeds.
export const TwitterEmbedResponse = Type.Object({
    url: Type.String(),
    authorUrl: Type.String(),
    authorName: Type.String(),
    html: Type.String(),
    width: Type.Optional(Type.Number()),
    height: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    type: Type.Optional(Type.String()),
    version: Type.Optional(Type.String()),
    providerName: Type.Optional(Type.String()),
    providerUrl: Type.Optional(Type.String()),
    cacheAge: Type.Optional(Type.String()),
})
export type TTwitterEmbedResponse = Static<typeof TwitterEmbedResponse>

export const TwitterArgumentPlatformData = Type.Interface(
    [ExternalPlatformData],
    {
        postUrl: Type.String(),
        importMode: TwitterImportMode,
        // From https://developer.x.com/en/docs/x-for-websites/oembed-api#item1
        embedResponse: Type.Optional(TwitterEmbedResponse),
        username: Type.Optional(Type.String()),
    },
    { additionalProperties: false }
)
export type TTwitterArgumentPlatformData = Static<
    typeof TwitterArgumentPlatformData
>

// Reddit specifics
export const RedditArgumentPlatformData = Type.Interface(
    [ExternalPlatformData],
    {
        postUrl: Type.String(),
        username: Type.Optional(Type.String()),
    },
    { additionalProperties: false }
)
export type TRedditArgumentPlatformData = Static<
    typeof RedditArgumentPlatformData
>

// Full mapping
export const ArgumentPlatformDataMap = Type.Object({
    twitter: TwitterArgumentPlatformData,
    reddit: RedditArgumentPlatformData,
    raw_text: ExternalPlatformData,
    manual: NoPlatformData,
})
export type TArgumentPlatformDataMap = Static<typeof ArgumentPlatformDataMap>

export const ArgumentPlatformData = Type.Index(
    ArgumentPlatformDataMap,
    Type.KeyOf(ArgumentPlatformDataMap)
)
export type TArgumentPlatformData = Static<typeof ArgumentPlatformData>

// platformData for curated showcase arguments: a stable curation id linking the
// argument to its source document content in the historical-figures fixtures
// (the argument's own UUID is regenerated on each seed, so this is the durable
// association key).
export const CuratedArgumentPlatformData = Type.Object(
    {
        curationId: Type.String(),
        // SHA-256 content digest of the curated argument's claims + premises
        // (`curatedArgumentContentDigest`), stamped on the row when the version
        // is seeded or reconciled. The deploy-time reconcile compares this
        // against the committed fixture's digest to detect a drifted argument.
        // Optional: rows seeded before digest tracking have none, which the
        // reconcile treats as "needs reconcile".
        contentDigest: Type.Optional(Type.String()),
    },
    { additionalProperties: false }
)
export type TCuratedArgumentPlatformData = Static<
    typeof CuratedArgumentPlatformData
>

export const CreateArgumentFromImportSchema = Type.Object({
    origin: ArgumentImportOrigin,
    data: Type.Index(
        Type.Omit(ArgumentPlatformDataMap, NoImport),
        Type.KeyOf(Type.Omit(ArgumentPlatformDataMap, NoImport))
    ),
})
export type TCreateArgumentFromImport = Static<
    typeof CreateArgumentFromImportSchema
>
