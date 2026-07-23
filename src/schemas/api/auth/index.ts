import { Type, type Static } from "typebox"
import { UUID } from "../../common.js"

// Schemas for POST /api/v1/auth/mobile-session and POST /api/v1/auth/mobile-refresh.

// Email as a wire value. minLength (rejects "") and maxLength (RFC 5321's 254)
// are always enforced by Value.Check; the pattern rejects values with no `@` /
// empty local or domain before they reach the DB. `format: "email"` is
// deliberately NOT used — TypeBox treats unregistered formats as a no-op, and
// consumers don't register one.
const EmailString = Type.String({
    minLength: 3,
    maxLength: 254,
    pattern: "^[^@\\s]+@[^@\\s]+$",
})

// Discriminated on `provider`. Google/Apple sign-in yields an OIDC ID token;
// X (Twitter) uses OAuth 2.0 (PKCE), which yields an access token, not an ID
// token — so the X member carries `accessToken` and has no `idToken`. The
// `email` member is the one-time-code verify step (paired with EmailCodeRequest
// below); `testing-and-qa` is a reviewer login that carries an opaque identity
// plus a password. Both mint the same bearer-token pair as the OAuth paths.
export const MobileSessionRequest = Type.Union([
    Type.Object({
        provider: Type.Union([Type.Literal("google"), Type.Literal("apple")]),
        idToken: Type.String(),
        nonce: Type.Optional(Type.String()),
    }),
    Type.Object({
        provider: Type.Literal("x"),
        accessToken: Type.String(),
    }),
    Type.Object({
        provider: Type.Literal("email"),
        email: EmailString,
        // Six-digit one-time code. minLength/maxLength/pattern are all enforced
        // by Value.Check; pattern also pins it to digits.
        code: Type.String({
            minLength: 6,
            maxLength: 6,
            pattern: "^[0-9]{6}$",
        }),
    }),
    Type.Object({
        provider: Type.Literal("testing-and-qa"),
        identity: Type.String({ minLength: 1, maxLength: 254 }),
        password: Type.String({ minLength: 1, maxLength: 254 }),
    }),
])
export type TMobileSessionRequest = Static<typeof MobileSessionRequest>

// Request-code step for the email one-time-code path. It issues no session, so
// it is NOT a member of MobileSessionRequest. Extra properties are closed off;
// the response is a constant `{ status: "sent" }` so it never reveals whether
// the email maps to an existing account.
export const EmailCodeRequest = Type.Object(
    { email: EmailString },
    { additionalProperties: false }
)
export type TEmailCodeRequest = Static<typeof EmailCodeRequest>

export const EmailCodeResponse = Type.Object({ status: Type.Literal("sent") })
export type TEmailCodeResponse = Static<typeof EmailCodeResponse>

export const MobileSessionResponse = Type.Object({
    accessToken: Type.String(),
    accessTokenExpiresAt: Type.String({ format: "date-time" }),
    refreshToken: Type.String(),
    refreshTokenExpiresAt: Type.String({ format: "date-time" }),
    userId: UUID,
})
export type TMobileSessionResponse = Static<typeof MobileSessionResponse>

export const MobileRefreshRequest = Type.Object({
    refreshToken: Type.String(),
})
export type TMobileRefreshRequest = Static<typeof MobileRefreshRequest>

export const MobileRefreshResponse = Type.Object({
    accessToken: Type.String(),
    accessTokenExpiresAt: Type.String({ format: "date-time" }),
    refreshToken: Type.String(),
    refreshTokenExpiresAt: Type.String({ format: "date-time" }),
})
export type TMobileRefreshResponse = Static<typeof MobileRefreshResponse>
