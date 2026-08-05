# Registration request contract: optional code, username, optional CAPTCHA token

Epic: [Open registration to the general public](tcw://W/proposit-app/2026-08-04-open-registration-to-the-general-public)

**Adoption — do not run `tcw work inbox accept` on this.** Accept double-dates the
slug and drops the `initiative:` back-pointer on a delegated cross-node slice,
which makes the item invisible to the epic's `reconcile`. Instead: read this doc,
run `tcw work new "<title>" --initiative 2026-08-04-open-registration-to-the-general-public`,
copy this body into the new item's `initial-request.md`, then `git rm` this inbox
doc.

Work on a feature branch off `main`, in a git worktree of this repo.

## Why

Proposit is leaving closed alpha. Today an account is only usable if someone
hands the new user an invitation or promo code out of band; without one they land
on an "Account Pending — closed alpha" wall. The epic takes that gate down across
server and mobile. This slice is the contract change every other slice waits on:
`code` stops being required, `username` is collected at registration, and web
sends a CAPTCHA token that mobile does not.

This slice is **first in the epic's order** — S2 (server registration) and S6
(mobile registration) are both blocked on it publishing *and* on the consumer
repin.

## Scope

### The request schema

`RegistrationInviteActivationRequestSchema`
(`src/schemas/model/users.ts:246-252`) currently requires `code: Type.String()`.
It becomes:

- `code` — **optional**. A code is no longer entry; it now buys a *tier*.
- `username` — **added**. Collected at registration on both platforms.
- `captchaToken` — **optional**. Web sends a Cloudflare Turnstile token; mobile
  sends nothing (CAPTCHA on mobile is an explicit epic non-goal — app-store
  distribution is the bot speed bump, and Turnstile in React Native would need a
  WebView wrapper for little gain).

**The response schema does not change.** `POST /api/v1/user/register` returns a
`RegistrationInvitation` today, and the server slice preserves that by minting a
self-issued invitation row for the code-free path rather than inventing a second
response shape. Do not touch the response.

Widening a required field to optional and adding two optional fields is
non-breaking for existing callers — this is a **minor** bump, not a major.

### The taxonomy reword (must land before the capability bodies)

The Feature all six of this epic's capabilities point at,
`account-registration` in `docs/taxonomy/`, is described as *"Registering an
account by redeeming an invitation or promo code, with the preset tier and role
it carries."* That is exactly the premise the epic removes. Reword it first: a
code is optional and carries a tier, not access.

### The capability-body rewords in the master

This repo holds the platform-agnostic capability master
(`docs/capabilities/`). Reword these bodies — **statuses stay `Missing`**; the
epic flips them at closeout, not this slice:

- `auth/activate-an-invitation` and `auth/activate-via-a-promo-code` — today both
  read as *the* way in ("Activate your account by entering an invitation code you
  received"). After the epic a code is optional and carries a **tier**, not
  access. Reword to "…in place of the standard free tier".
- `profile/activate-an-invitation-or-promo-code` — today "…to move it out of an
  unverified state". After the epic, redemption is an **upgrade** on an
  already-registered account. Reword accordingly.

`auth/self-serve-open-registration`, `auth/choose-a-username-at-registration`,
and `auth/acknowledge-the-agreements` need no body change here.

**Not a capability:** bot protection (Turnstile) is not something a user *can
do*; it is friction on a capability they already have. Do not add an entry.

## Acceptance criteria

1. `RegistrationInviteActivationRequestSchema` accepts a request with `username`
   and no `code` and no `captchaToken`, and still accepts today's
   `{ code }`-bearing request unchanged.
2. The registration **response** schema is byte-identical to today's.
3. The `account-registration` Feature no longer describes a code as required;
   `tcw validate` passes.
4. The three capability bodies above read as described; all six entries' statuses
   are still `Missing`.
5. `pnpm run check` is green on a clean tree.
6. A minor version is cut (`pnpm version minor`), with `docs/release-notes/` and
   `docs/changelogs/` rotated per this repo's Documentation Sync rules.

## Publish gate — read before you cut

**Do not publish.** A `@proposit/shared` release is gated on consumer-side
validation coordinated at the workspace root. Your slice ends at *ready to
publish*:

1. Land the change and cut the minor.
2. Build a local tarball and hand it to the orchestrator for consumer validation.
   Note: **pnpm 10 silently ignores `package.json` `overrides`** — a consumer
   verifying the tarball must confirm the resolved version by reading it out of
   `node_modules`, not from the manifest.
3. The user holds the NPM MFA and publishes. Do not attempt it.
4. The orchestrator repins both consumers and unblocks S2 and S6.

## One open question for the epic, answer before you cut

Mobile ships through app-store review on its own schedule, so the epic's tier-0
gate (S4, server) will reach mobile builds that predate mobile's registration
screen (S6). Those users get a bare 401 with no path forward.

If that needs a **coded error** the mobile client can render as "finish
registering on the web", it belongs in *this* slice's contract and must land
before the publish — adding it later means a second shared release. Raise it with
the orchestrator (`tcw work escalate`) if you think it does. The epic's current
position is that it is a checkpoint decision, not a foregone conclusion.

## Notes

- Pins today: shared `0.58.1`, server `^0.58.1`, mobile `^0.58.0`. Mobile's drift
  is pre-existing and tracked separately — not this slice's to close.
- If you find the spec wrong rather than merely incomplete, escalate to the epic
  (`tcw work escalate`) rather than quietly reinterpreting the boundary.
