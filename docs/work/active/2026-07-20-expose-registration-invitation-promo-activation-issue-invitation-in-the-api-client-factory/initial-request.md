# Expose registration-invitation/promo activation + issue-invitation in the api-client factory

Escalated from the mobile capability-gaps epic
(`2026-07-11-close-mobile-capability-gaps-vs-proposit-shared-master`). Blocks
mobile Slice B (activate invitation/promo) and 2 caps of Slice C
(issue-an-invitation, activate-an-invitation-or-promo-code).

## Problem

The server exposes the endpoints and the shared schema already exists, but the
shared `createApiClient` factory has **no callable method** for them, so mobile
(which consumes only the shared api-client) cannot invoke them.

- `POST /api/v1/user/register` — activates a registration invitation or promo
  code. Request body already schema'd as
  `RegistrationInviteActivationRequestSchema` (`@proposit/shared/schemas/model`):
  `code`, `isPromoCode`, `agreedToTerms/PrivacyPolicy/CommunityGuidelines`.
- `POST /api/v1/user/invite` — issues an invitation to another user.

## Proposed fix

Add factory methods (mirroring the existing `*Impl` + public-method pattern in
`src/api-client/user/`), e.g. `activateRegistrationInviteImpl` and
`issueInvitationImpl`, wired to the two routes above with the existing schemas.
Add the request/response schema for `/invite` if one doesn't already exist.

## Consumer impact

- **mobile**: unblocks Slice B + Slice C's invitation caps.
- **server**: no change (endpoints already exist); web `register-form.tsx` /
  `create-invite-form.tsx` currently call the routes directly and could later
  adopt the factory methods, but that's out of scope here.
