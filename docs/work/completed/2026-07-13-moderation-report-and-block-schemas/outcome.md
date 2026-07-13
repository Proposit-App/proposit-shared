# Outcome — Moderation report and block schemas (decomposition 1 of 3)

## What shipped (commit d4fb8f4)

The cross-platform moderation contract mobile + server both bind to:

- Schemas (`src/schemas/api/moderation/`, new export subpath
  `./schemas/api/moderation`): `ReportContentRequest`/`Response` with a closed
  `ReportReasonCode` union (spam · harassment · hate · sexual-content · violence
  · misinformation · other); `BlockUserRequest`/`Response`; `GetBlocksResponse`
  (+ `BlockedUser`).
- api-client methods (existing `./api-client` subpath): `reportContent` (POST
  `/api/v1/moderation/report`), `blockUser` / `unblockUser` (POST
  `/api/v1/moderation/{block,unblock}`), `getMyBlocks` (GET
  `/api/v1/moderation/blocks`). Typed wrappers — the server routes are slice 2.

## Verification

- `pnpm run check` **green** (re-run on committed state): typecheck ✓, lint ✓,
  tests 727 passed, build ✓ (`dist/schemas/api/moderation/` +
  `dist/api-client/moderation/` emitted). New tests: schema validation (14 cases)
  + api-client URL/verb/body/parse (4 cases).

## Next gate — PUBLISH (blocks slice 2)

The server report/block API slice consumes these **only once `@proposit/shared`
is published** and the server re-pins. That publish is a coordinated release
action (version cut + consumer-validation gate, per ORCHESTRATOR-AGENTS) — not
done here. This slice's code is complete + verified; it stays active pending that
publish. Changelog entry added to `docs/changelogs/upcoming.md`.
