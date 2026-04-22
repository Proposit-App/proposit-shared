import { Type, type Static } from "typebox"
import { UUID } from "../../common.js"

// Schemas for POST /api/v1/auth/mobile-session and POST /api/v1/auth/mobile-refresh.
// Shape signed off by server on broker room phase-1-1c-shared (762413, 2026-04-22).
// See docs/superpowers/specs/2026-04-22-mobile-auth-schemas.md.

export const MobileSessionRequest = Type.Object({
    provider: Type.Union([Type.Literal("google"), Type.Literal("apple")]),
    idToken: Type.String(),
    nonce: Type.Optional(Type.String()),
})
export type TMobileSessionRequest = Static<typeof MobileSessionRequest>

export const MobileSessionResponse = Type.Object({
    accessToken: Type.String(),
    accessTokenExpiresAt: Type.String({ format: "date-time" }),
    refreshToken: Type.String(),
    refreshTokenExpiresAt: Type.String({ format: "date-time" }),
    userId: UUID,
})
export type TMobileSessionResponse = Static<typeof MobileSessionResponse>
