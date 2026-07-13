# Moderation report and block schemas

Cross-node epic: `2026-07-13-proposit-mobile-v1-0-0-first-ios-android-publish`.
**Decomposition slice 1 of 3** of the moderation feature (report + block). This
is the first, self-contained piece — the cross-platform contract mobile + server
both bind to. **Blocks** the server API slice (which consumes these once shared
is published).

## Problem

Store compliance needs user-facing **report content** and **block user** flows.
These request/response bodies are cross-platform (mobile calls them), so per the
workspace rule they must live in `@proposit/shared/schemas/api/**`, not server-local.

## Technical changes

Add TypeBox schemas under `src/schemas/api/moderation/` (+ exports + api-client
method stubs if the pattern calls for it):

- **Report content:** request — `{ targetType: "argument" | "claim", targetId,
  reasonCode, note? }` (define a closed `reasonCode` union: spam, harassment,
  hate, sexual, violence, other…); response — the created report id / ack.
- **Block user:** request — `{ blockedUserId }`; response — ack. Optionally an
  unblock + a "my blocks" list shape.
- Keep them additive/back-compat; follow existing `schemas/api/*` conventions and
  the `default`-condition export rule in the package's `exports` map.

## Meta changes

After merge, `@proposit/shared` must be **published** (minor bump) and the server
must re-pin before the server API slice can consume these. Gated on the workspace
consumer-validation publish flow — no `file:` pins on the launch branch.
