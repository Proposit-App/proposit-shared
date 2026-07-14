---
from: .
initiative: 2026-07-13-proposit-mobile-v1-0-0-first-ios-android-publish
---

# Extend MobileSessionRequest for email-OTP and testing-and-qa mobile login

## Problem

The mobile app is adding two non-OAuth login paths (email one-time-code, and a
hidden QA/reviewer login) to unblock App Store / Play reviewers who cannot use
OAuth. Both terminate in the existing mobile bearer-token session, but the wire
contract in `@proposit/shared` only models OAuth providers.

## Root cause

`src/schemas/api/auth/index.ts` `MobileSessionRequest` is a union discriminated on
`provider` with only `google | apple | x`. There is no member for an email
one-time-code verification, no member for a credential-less QA identity, and no
schema for the OTP request-code step.

## Proposed fix

Extend the `schemas/api/auth` module (exact field names to agree with the server
slice — `proposit-server/…-mobile-session-email-otp-and-testing-and-qa-bearer-token-branches`):

1. Add to `MobileSessionRequest`:
   - `{ provider: "email", email, code }` — the OTP verify step.
   - `{ provider: "testing-and-qa", identity }` — credential-less QA login.
2. Add a sibling request/response for the OTP request-code step (not part of the
   session union, since it issues no session): e.g. `EmailCodeRequest { email }`
   and a minimal response. Keep it non-enumerating (no field that leaks account
   existence).
3. Export the new `Static` types. `MobileSessionResponse` likely unchanged (both
   paths return the same bearer-token pair) — confirm and leave as-is if so.

## Consumer impact

- **proposit-server** consumes these to validate requests on the mobile-session
  endpoint and the new request-code endpoint.
- **proposit-mobile** consumes them in `src/auth/oauth-shared.ts`.
- **Backward-compatible:** union extension is additive — existing google/apple/x
  requests still validate; no migration.

## Test cases

- Each new union member accepts a valid body and rejects a body missing its
  discriminated fields (mirror the existing `__tests__/index.test.ts` cases).
- `provider: "testing-and-qa"` requires `identity`; `provider: "email"` requires
  both `email` and `code`.
- The request-code schema accepts `{ email }` and rejects extras.

## Sequencing

Ship first; the server slice pins this shared version, then mobile pins the
server-compatible shared version. Cut a shared release when done.
