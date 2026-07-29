# Changelog — upcoming

## Added

- `apiClient.deactivateAccount()` (`src/api-client/user/deactivate-account.ts`,
  registered on the factory). Issues `PATCH /api/v1/user/me` and returns the
  updated user. Takes **no argument**: the route accepts exactly one state, so
  there is nothing for a caller to choose, and a client that could pass a state
  would hand every authenticated caller a moderator's reach.
- `DeactivateAccountRequest` (`src/schemas/api/user/index.ts`) — a single
  `Type.Literal(AccountStates.DEACTIVATED)` rather than the `AccountStates`
  union, so an attempt to ask for `banned` or `deleted` is a compile error rather
  than a server-side 400.

Additive only. v0.52.0 introduced `accountState` but no way to set it; this is
what lets a consumer act on it.
