# Mobile Auth Schemas — Spec

**Parent initiative:** Phase 1 sub-project 1C — mobile authentication (shared side).
**Briefing:** `docs/superpowers/briefings/phase-1-shared-agenda.md` §"1C — Conditional schema work".
**Cross-repo overview:** `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-04-21-phase-1-remaining-overview.md` §2.

## Summary

Add TypeBox request/response schemas for `proposit-server`'s new mobile-session authentication endpoints. These let `proposit-mobile` exchange a provider OAuth ID token for a short-lived access token + rotating refresh token, and rotate the refresh token when the access token expires.

The shape is the product of a 3-way convergence (server lean, shared lean, mobile's explicit decision) recorded on broker room `phase-1-1c-shared` (762413) and signed off by the server agent prior to this spec being written.

## Endpoints (server-owned; this repo only ships the schemas)

- `POST /api/v1/auth/mobile-session` — establish a mobile session from a provider OAuth ID token.
- `POST /api/v1/auth/mobile-refresh` — rotate an expired access token using the refresh token.

## Schemas

All four live under `src/schemas/api/auth/` and are re-exported via that directory's barrel. Naming follows the `user/` + `reaction/` api-subpath conventions: schema consts are bare-named (no `Schema` suffix), static types are `T`-prefixed.

### `MobileSessionRequest`

| Field      | Type                                                | Notes                                                                                                                    |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `provider` | `Type.Union([Literal("google"), Literal("apple")])` | Twitter explicitly dropped for v1.                                                                                       |
| `idToken`  | `Type.String()`                                     | Provider OAuth ID token (JWT).                                                                                           |
| `nonce`    | `Type.Optional(Type.String())`                      | Required for Apple at verify-time (server-side conditional); optional in the wire schema per server's Option A sign-off. |

### `MobileSessionResponse`

| Field                   | Type                                   | Notes                                                                                |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| `accessToken`           | `Type.String()`                        | Short-lived (server decides lifetime).                                               |
| `accessTokenExpiresAt`  | `Type.String({ format: "date-time" })` | ISO 8601. Renamed from `expiresAt` to disambiguate against refresh expiry.           |
| `refreshToken`          | `Type.String()`                        | Long-lived, rotating (each rotation invalidates prior).                              |
| `refreshTokenExpiresAt` | `Type.String({ format: "date-time" })` | ISO 8601. Lets mobile decide rotate-vs-force-re-auth without a blind 401-retry loop. |
| `userId`                | `UUID` (from `src/schemas/common.ts`)  | Consuming this package's existing UUID helper.                                       |

### `MobileRefreshRequest`

| Field          | Type            | Notes                                                       |
| -------------- | --------------- | ----------------------------------------------------------- |
| `refreshToken` | `Type.String()` | Prior refresh token. Server validates + invalidates on use. |

### `MobileRefreshResponse`

Same shape as `MobileSessionResponse` **minus `userId`** (the refresh flow doesn't re-introduce identity; the rotated tokens already prove it).

| Field                   | Type                                   |
| ----------------------- | -------------------------------------- |
| `accessToken`           | `Type.String()`                        |
| `accessTokenExpiresAt`  | `Type.String({ format: "date-time" })` |
| `refreshToken`          | `Type.String()`                        |
| `refreshTokenExpiresAt` | `Type.String({ format: "date-time" })` |

The new `refreshToken` invalidates the one that was submitted in the request. If a prior (invalidated) refresh token is ever presented, the server treats it as a leak signal and revokes the entire refresh family (OWASP rotating-refresh + reuse-detection pattern). That behavior is server-side; the schema just models the wire shape.

## Exports-map entry

Add to `package.json`:

```json
"./schemas/api/auth": {
    "types": "./dist/schemas/api/auth/index.d.ts",
    "import": "./dist/schemas/api/auth/index.js",
    "default": "./dist/schemas/api/auth/index.js"
}
```

All three conditions (`types` + `import` + `default`) are required per the 0.2.1 exports-map fix — non-`import`-aware resolvers (Jest CJS, older bundlers) rely on `default`.

Also add to `CLAUDE.md` Package structure list:

```
- `./schemas/api/auth` → `src/schemas/api/auth/index.ts`
```

## Non-goals

- **Server handler implementation.** Server owns the endpoint wiring, id-token verification, refresh-token storage, and rotation/leak detection. Server has started work against this shape in parallel; any shape diff between now and publish is a rename for them, not a rewrite.
- **Mobile consumer code.** Mobile will bump `@proposit/shared` to `^0.3.0` after publish and import the schemas.
- **Runtime validation of ISO-8601 format.** TypeBox's `format` annotation is advisory unless a format validator is registered. Documenting intent is enough for this schema; the handlers produce real ISO strings.
- **Discriminated-union nonce enforcement.** Server chose Option A (optional in wire schema, conditional server-side). Not revisited here.

## Acceptance

1. `src/schemas/api/auth/index.ts` exists and exports the four schemas + four `T`-types.
2. A `src/schemas/api/auth/__tests__/` test file covers happy-path accept + required-field reject + provider-union enforcement + `nonce` optionality for each of the four schemas.
3. `package.json` has the new exports-map entry with all three conditions.
4. `CLAUDE.md` Package structure list includes the new subpath.
5. `pnpm run check` passes: typecheck + lint + full vitest suite + build.
6. Version bump, publish, tag, PR, and `READY:` broker signal are handled in the publish-ceremony step (gated on user go/no-go per repo policy for publish actions).

## Versioning

`0.2.1 → 0.3.0` (minor). Pre-1.0 repo policy allows minor bumps to break, but this change is purely additive: a new subpath, new schemas. Existing consumers are untouched. The minor bump is the conservative-but-correct call under the repo's convention.

## Branch + PR

- Branch: `phase-1/pr-1c-mobile-auth-shared`
- PR → `main`, no integration branch.
- Post-merge broker signal on room 762413: `READY: @proposit/shared@0.3.0 published with TMobileSession* + TMobileRefresh* under /schemas/api/auth`.
