# Spec — email-OTP + testing-and-qa members on the mobile-session contract

## Goal

Let the mobile bearer-token session endpoint accept two non-OAuth login paths,
and add the OTP request-code step's own contract. All additive; existing
`google | apple | x` requests keep validating.

## Contract change (`src/schemas/api/auth/index.ts`)

Add two members to the `MobileSessionRequest` union (discriminator `provider`):

```ts
Type.Object({
    provider: Type.Literal("email"),
    email: Type.String(),
    code: Type.String(),
}),
Type.Object({
    provider: Type.Literal("testing-and-qa"),
    identity: Type.String(),
}),
```

Add the OTP request-code step as its own request/response pair (NOT part of the
session union — it issues no session):

```ts
export const EmailCodeRequest = Type.Object(
    { email: Type.String() },
    { additionalProperties: false },
)
export type TEmailCodeRequest = Static<typeof EmailCodeRequest>

export const EmailCodeResponse = Type.Object({ status: Type.Literal("sent") })
export type TEmailCodeResponse = Static<typeof EmailCodeResponse>
```

- `EmailCodeRequest` closes extra properties so the request-code step rejects
  stray fields.
- `EmailCodeResponse` is a constant `{ status: "sent" }` — non-enumerating, so
  the response never reveals whether the email maps to an account.
- `MobileSessionResponse` is unchanged: both new paths mint the same
  bearer-token pair.

## Acceptance (schema tests)

- `MobileSessionRequest` accepts `{ provider: "email", email, code }` and
  `{ provider: "testing-and-qa", identity }`.
- Rejects `email` member missing `code` (or `email`); rejects `testing-and-qa`
  missing `identity`.
- `EmailCodeRequest` accepts `{ email }`; rejects `{}` and rejects extras.
- `EmailCodeResponse` accepts `{ status: "sent" }`.

## Non-goals

- No `format: "email"` / length enforcement in the schema (matches the loose
  style of the existing members; server owns validation).
- No server or mobile changes (separate downstream slices).
