import Type, { type Static, type TObjectOptions } from "typebox"
import { EncodableDate, Nullable, UUID } from "../common.js"

export const UserTiers = {
    UNVERIFIED: 0,
    FREE: 1,
    PREMIUM: 2,
    ENTERPRISE: 3,

    BANNED: 101,
    DEACTIVATED: 102,
    NO_ASSIST: 103,
} as const
export const UserTiersSchema = Type.Object({
    UNVERIFIED: Type.Literal(UserTiers.UNVERIFIED),
    FREE: Type.Literal(UserTiers.FREE),
    PREMIUM: Type.Literal(UserTiers.PREMIUM),
    ENTERPRISE: Type.Literal(UserTiers.ENTERPRISE),

    BANNED: Type.Literal(UserTiers.BANNED),
    DEACTIVATED: Type.Literal(UserTiers.DEACTIVATED),
    NO_ASSIST: Type.Literal(UserTiers.NO_ASSIST),
})
export type TUserTiers = Static<typeof UserTiersSchema>
export const AllUserTiersBuilder = (options?: TObjectOptions) =>
    Type.Index(UserTiersSchema, Type.KeyOf(UserTiersSchema), options)
export const AllUserTiers = AllUserTiersBuilder()
export type TAllUserTiers = Static<typeof AllUserTiers>

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
    tokensUsed: Type.Integer(),
    lifetimeTokensUsed: Type.Integer(),
    tokenResetOn: EncodableDate,
    deleted: Type.Boolean(),
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

export const RegistrationInviteActivationRequestSchema = Type.Object({
    code: Type.String(),
    isPromoCode: Type.Boolean(),
    agreedToTerms: Type.Boolean(),
    agreedToPrivacyPolicy: Type.Boolean(),
    agreedToCommunityGuidelines: Type.Boolean(),
})
export type TRegistrationInviteActivationRequest = Static<
    typeof RegistrationInviteActivationRequestSchema
>
