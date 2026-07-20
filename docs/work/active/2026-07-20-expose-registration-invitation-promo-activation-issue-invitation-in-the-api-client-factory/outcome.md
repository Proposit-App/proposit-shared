# Outcome — api-client invitation/promo activation + issue-invitation

## What shipped (worktree branch, commit 4aa8453)

Two new methods on the shared `createApiClient` factory, following the existing
`src/api-client/user/` pattern (`strictFetch` with request + response schemas):

- `activateRegistrationInvite(body)` → `POST /api/v1/user/register`. Request
  `RegistrationInviteActivationRequestSchema` (code, isPromoCode, agreed* flags),
  response `RegistrationInvitationSchema`.
- `issueInvitation(body)` → `POST /api/v1/user/invite`. Request
  `RegistrationInvitationCreateSchema`, response `RegistrationInvitationSchema`.

Both request/response schemas already existed — no new schema was needed (the
`/invite` contract reused `RegistrationInvitationCreateSchema`). Registered in
`factory.ts`; unit tests mock fetch and assert path/verb/body + parsed Result,
covering success + error.

## Verification

`pnpm run check` **green** (re-run on committed state): vitest **820 passed /
98 files**, build (gen:fixtures + tsc) clean.

## Consumer impact / follow-up

Unblocks mobile Slice B (`2026-07-20-activate-an-invitation-or-promo-code`) and
the self-serve-registration adopted item. **Consumption requires publishing
`@proposit/shared`** (root-gated on consumer validation) or a temporary workspace
override; the mobile first drafts that consume these methods note that
dependency. No capability delta on the shared node (caps are realized mobile-side).
