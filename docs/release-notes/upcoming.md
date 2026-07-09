# Release notes — upcoming

## Profile image + argument-reaction read on the api surface

Two additive api-surface changes that unblock mobile UI work:

- `getCurrentUser()` now returns an `image` field (nullable profile-image URL),
  so a profile/avatar surface reads it from the same `/me` call.
- `getReaction(argumentId, version)` — read the argument-level reactions
  collection from the api-client, mirroring the existing claim-reaction read.

Pairs with a proposit-server change that populates `image` on
`GET /api/v1/user/me`.
