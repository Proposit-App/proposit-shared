---
from: .
---

# Remove mis-specified choose-a-username-at-registration capability from master

## Problem

The capability `auth/choose-a-username-at-registration` in the shared master
describes something the platform does not support. It should be removed (or
re-specified) at the master, and its consumer overrides cleaned up.

## Root cause

The registration endpoint (`POST /api/v1/user/register`) accepts only `code` +
the three `agreedTo*` agreement flags — there is no `username`/`displayName`
field at registration. A username is set **after** signup, in Settings, via
`PUT /api/v1/user/me` (`UserModifyRequest.username`). So "choose a username at
registration" is not a real capability; it was declared in error.

## Proposed fix

1. Remove `auth/choose-a-username-at-registration` from the shared capability
   master (`proposit-shared/docs/capabilities/auth/`).
2. Remove the now-dangling consumer override in proposit-mobile
   (`docs/capabilities/auth/choose-a-username-at-registration/`, currently
   `Omitted`). Confirm no other node overrides it.
3. `tcw capabilities check` + `tcw validate` green on shared, mobile, server.

> If instead there is product intent to add register-time username selection,
> re-specify the cap against a real (future) server field rather than deleting
> it — but as of 2026-07-20 no such field exists.

## Consumer impact

- proposit-mobile: drops an `Omitted` override (no behavior change — the ability
  already lives in Settings and stays there).
- proposit-server: does not override this cap; no change expected.

Discovered while triaging the remaining gaps in the
close-mobile-capability-gaps effort; the username ability itself already exists
in mobile's account/settings screen (`modifyCurrentUser`).
