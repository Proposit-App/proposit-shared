# Upcoming release notes

### Features

- Mobile auth schemas. Four new TypeBox schemas under `@proposit/shared/schemas/api/auth`:
    - `MobileSessionRequest` / `MobileSessionResponse` — for the server's new `POST /api/v1/auth/mobile-session` endpoint, which exchanges a Google or Apple OAuth ID token for a short-lived access token + rotating refresh token.
    - `MobileRefreshRequest` / `MobileRefreshResponse` — for `POST /api/v1/auth/mobile-refresh`, which rotates an expired access token using the refresh token. Each rotation issues a new refresh token and invalidates the prior one (OWASP-style rotating refresh with reuse detection).
      Shape was signed off by `proposit-server` before publish. `T`-prefixed static types (`TMobileSessionRequest`, etc.) are exported alongside each schema. Consumed by `proposit-mobile` to wire OAuth sign-in + token rotation and by `proposit-server` to validate request/response payloads.

### Internal

- New `./schemas/api/auth` subpath added to the `package.json` exports map with `types` + `import` + `default` conditions, matching the 0.2.1 exports-map discipline.
- `.claude/` added to `.prettierignore` so Claude Code's local settings file no longer blocks `pnpm run check`.
