# Release notes — upcoming

## Read and update the current user from the api-client

Two current-user methods, so consumers (mobile) don't need one-off fetches:

- `getCurrentUser()` — `GET /api/v1/user/me` → username, preferences, usage, and
  tier limits in one read (`GetCurrentUserResponse`).
- `modifyCurrentUser({ username?, preferences? })` — `PUT /api/v1/user/me` to
  change the username and/or a partial preferences patch; returns the updated user.

Pairs with a proposit-server change that adds `username` + `preferences` to the
`GET /api/v1/user/me` response.
