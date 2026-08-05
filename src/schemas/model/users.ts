import Type, { type Static, type TObjectOptions } from "typebox"
import { EncodableDate, Nullable, UUID } from "../common.js"

/**
 * What a user is entitled to — and nothing else. Account state lives on its own
 * axis (`AccountStates`) so that entering a state cannot destroy an
 * entitlement.
 *
 * `NO_ASSIST` keeps the value `103` despite the gap below it: these numbers are
 * persisted, so closing the gap would re-map existing rows.
 */
export const UserTiers = {
    UNVERIFIED: 0,
    FREE: 1,
    PREMIUM: 2,
    ENTERPRISE: 3,

    NO_ASSIST: 103,
} as const
export const UserTiersSchema = Type.Object({
    UNVERIFIED: Type.Literal(UserTiers.UNVERIFIED),
    FREE: Type.Literal(UserTiers.FREE),
    PREMIUM: Type.Literal(UserTiers.PREMIUM),
    ENTERPRISE: Type.Literal(UserTiers.ENTERPRISE),

    NO_ASSIST: Type.Literal(UserTiers.NO_ASSIST),
})
export type TUserTiers = Static<typeof UserTiersSchema>
export const AllUserTiersBuilder = (options?: TObjectOptions) =>
    Type.Index(UserTiersSchema, Type.KeyOf(UserTiersSchema), options)
export const AllUserTiers = AllUserTiersBuilder()
export type TAllUserTiers = Static<typeof AllUserTiers>

/**
 * Where an account stands in its lifecycle, independent of what it is entitled
 * to. String-valued rather than numeric: the value is read in queries, logs,
 * and admin payloads, where `"banned"` beats a magic number.
 */
export const AccountStates = {
    ACTIVE: "active",
    DEACTIVATED: "deactivated",
    BANNED: "banned",
    DELETED: "deleted",
} as const
export const AccountStatesSchema = Type.Object({
    ACTIVE: Type.Literal(AccountStates.ACTIVE),
    DEACTIVATED: Type.Literal(AccountStates.DEACTIVATED),
    BANNED: Type.Literal(AccountStates.BANNED),
    DELETED: Type.Literal(AccountStates.DELETED),
})
export type TAccountStates = Static<typeof AccountStatesSchema>
export const AllAccountStates = Type.Index(
    AccountStatesSchema,
    Type.KeyOf(AccountStatesSchema)
)
export type TAllAccountStates = Static<typeof AllAccountStates>

/**
 * Per-user persistent settings, stored server-side as a `jsonb` column so new
 * settings can be added without a DB migration. Extend this object as settings
 * are added.
 */
export const UserPreferencesSchema = Type.Object({
    // Grammar-tiers behavior toggle. When `false` (the default), the engine
    // runs in `'assistive'` behavior — server enforces `validate('derivable')`
    // on submit/save. When `true`, the engine runs in `'permissive'` behavior —
    // server skips the derivable gate, and violations surface inline for the
    // user to resolve.
    advancedMode: Type.Boolean(),
})
export type TUserPreferences = Static<typeof UserPreferencesSchema>

export const UserSchema = Type.Object({
    id: UUID,
    name: Nullable(Type.String()),
    email: Nullable(Type.String()),
    emailVerified: Nullable(EncodableDate),
    image: Nullable(Type.String()),
    username: Nullable(Type.String()),
    // Human-readable id marking a synthetic/curated account (e.g. a showcase
    // historical-figure author). `null` for normal users; a unique stable value
    // for curated users. The DB column + unique index are owned server-side.
    curationId: Nullable(Type.String()),
    tier: AllUserTiers,
    accountState: AllAccountStates,
    tokensUsed: Type.Integer(),
    lifetimeTokensUsed: Type.Integer(),
    tokenResetOn: EncodableDate,
    registrationDate: EncodableDate,
    // Per-user persistent settings (jsonb-backed; see UserPreferencesSchema).
    // The DB-side `NOT NULL DEFAULT '{"advancedMode": false}'` is owned by server.
    preferences: UserPreferencesSchema,
})
export type TUser = Static<typeof UserSchema>

export const UserPublicFieldsSchema = Type.Pick(UserSchema, [
    "name",
    "username",
    "image",
])

export const VerificationTokenSchema = Type.Object({
    identifier: Type.String(),
    expires: EncodableDate,
    token: Type.String(),
})
export type TVerificationToken = Static<typeof VerificationTokenSchema>

export const AccountSchema = Type.Object({
    id: UUID,
    userId: UUID,
    type: Type.Union([
        Type.Literal("oauth"),
        Type.Literal("oidc"),
        Type.Literal("email"),
        Type.Literal("webauthn"),
    ]),
    provider: Type.String(),
    providerAccountId: Type.String(),
    refreshToken: Nullable(Type.String()),
    accessToken: Nullable(Type.String()),
    expiresAt: Nullable(Type.Number()),
    idToken: Nullable(Type.String()),
    scope: Nullable(Type.String()),
    sessionState: Nullable(Type.String()),
    tokenType: Nullable(Type.Lowercase(Type.String())),
    username: Nullable(Type.String()),
})
export type TAccount = Static<typeof AccountSchema>

export const SessionSchema = Type.Object({
    id: UUID,
    userId: UUID,
    // from AdapterSession
    sessionToken: Type.String(),
    expires: EncodableDate,
})
export type TSession = Static<typeof SessionSchema>

export const ObjectLimitTypes = Type.Union([
    Type.Literal("arguments"),
    Type.Literal("statements"),
    Type.Literal("citations"),
    Type.Literal("tokens"),
])
export type TObjectLimitTypes = Static<typeof ObjectLimitTypes>

export const UserTierLimitsSchema = Type.Object({
    maxArguments: Type.Integer(),
    maxStatementsPerArg: Type.Integer(),
    maxCitationsPerArg: Type.Integer(),
    maxTokensPerMonth: Type.Integer(),
    // Both source-text ceilings are measured on the NORMALIZED text — the
    // form core's `normalizeOriginText` emits, which is also the coordinate
    // system every origin anchor is an offset into. Measuring the raw paste
    // would let the same document pass or fail depending on its line endings.
    // This library owns the numbers; the server owns enforcement.
    //
    // OPTIONAL for this release only, and required in a later one. Response
    // parsing is a hard `Value.Assert` with no defaulting, so making them
    // required immediately would mean a client carrying this version could not
    // parse `/me` from a server that has not deployed yet. The web app can be
    // sequenced behind a server deploy; the mobile app ships through app-store
    // review on its own schedule and cannot. `UserTierLimits` below always
    // supplies both — a caller reading them off that constant never sees the
    // absence.
    /** Per source-text document. */
    maxSourceTextChars: Type.Optional(Type.Integer()),
    /** Across all of one user's source-text documents. */
    maxStoredSourceTextChars: Type.Optional(Type.Integer()),
})
export type TUserTierLimits = Static<typeof UserTierLimitsSchema>

export const UserUsageDataSchema = Type.Object({
    userId: UUID,
    argumentCount: Type.Number(),
    tokensUsed: Type.Number(),
    lifetimeTokensUsed: Type.Number(),
    tokenResetOn: EncodableDate,
    tier: AllUserTiers,
})
export type TUserUsageData = Static<typeof UserUsageDataSchema>

export const GetUserUsageDataResponse = Type.Object({
    usage: UserUsageDataSchema,
    limits: UserTierLimitsSchema,
})
export type TGetUserUsageDataResponse = Static<typeof GetUserUsageDataResponse>

// Body for `GET /api/v1/user/me`. The usage/limits of the above, plus the
// caller's own username and preferences — everything a profile/settings surface
// needs from one read. `username` is nullable (a freshly-provisioned account may
// not have chosen one yet).
export const GetCurrentUserResponse = Type.Object({
    usage: UserUsageDataSchema,
    limits: UserTierLimitsSchema,
    username: Nullable(Type.String()),
    image: Nullable(Type.String()),
    preferences: UserPreferencesSchema,
})
export type TGetCurrentUserResponse = Static<typeof GetCurrentUserResponse>

export const RegistrationInvitationSchema = Type.Object({
    code: Type.String(),
    createdBy: UUID,
    createdOn: EncodableDate,
    expiresOn: EncodableDate,
    used: Type.Boolean(),
    usedOn: Nullable(EncodableDate),
    usedBy: Nullable(UUID),
    presetUserTier: Nullable(AllUserTiers),
    presetSystemRole: Nullable(Type.String()),
})
export type TRegistrationInvitation = Static<
    typeof RegistrationInvitationSchema
>

export const PromoCodeSchema = Type.Object({
    id: Type.Integer(),
    code: Type.String(),
    createdBy: UUID,
    createdOn: EncodableDate,
    usesLeft: Type.Integer(),
    expiresOn: Nullable(EncodableDate),
    presetUserTier: Nullable(AllUserTiers),
})
export type TPromoCode = Static<typeof PromoCodeSchema>

export const SystemRoleSchema = Type.Object({
    userId: UUID,
    role: Type.String(),
    createdOn: EncodableDate,
    // User who granted the role
    grantedBy: UUID,
})
export type TSystemRole = Static<typeof SystemRoleSchema>

export const RegistrationInvitationCreateSchema = Type.Object({
    presetUserTier: AllUserTiersBuilder({ default: UserTiers.FREE }),
    presetSystemRole: Type.String({ default: "Normal" }),
})
export type TRegistrationInvitationCreate = Static<
    typeof RegistrationInvitationCreateSchema
>

/**
 * Body for `POST /api/v1/user/register`. One endpoint serves two callers:
 * someone registering for the first time, and an already-registered account
 * redeeming a code from their profile. That is why so little is required here.
 *
 * `code` is optional — a code presets the account's tier rather than granting
 * access, so registering without one is a normal path. `isPromoCode`
 * distinguishes the two code namespaces and is only meaningful alongside a
 * `code`.
 *
 * `username` is optional *at the wire* because the profile-side redemption
 * caller already has one. The server requires it on the code-free registration
 * path, where it also owns uniqueness and format — none of which a schema can
 * express.
 *
 * `captchaToken` is a bot-protection token from whichever challenge the caller's
 * platform runs; a platform that runs none omits it.
 */
export const RegistrationInviteActivationRequestSchema = Type.Object({
    code: Type.Optional(Type.String()),
    isPromoCode: Type.Boolean(),
    username: Type.Optional(Type.String()),
    captchaToken: Type.Optional(Type.String()),
    agreedToTerms: Type.Boolean(),
    agreedToPrivacyPolicy: Type.Boolean(),
    agreedToCommunityGuidelines: Type.Boolean(),
})
export type TRegistrationInviteActivationRequest = Static<
    typeof RegistrationInviteActivationRequestSchema
>
