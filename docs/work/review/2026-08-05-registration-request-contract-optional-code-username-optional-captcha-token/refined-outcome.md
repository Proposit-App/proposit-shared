# Refined outcome — the registration request contract

**Accepted 2026-08-05**, and published: `@proposit/shared` **0.59.0** is on the
registry, tag `v0.59.0` pushed at `6da461f`.

## What shipped

`RegistrationInviteActivationRequestSchema` gains optional `username` and
`captchaToken`, and `code` becomes optional. The **response** schema is
unchanged — a code-free registration still mints a real invitation, so
`RegistrationInvitation` stays valid on every path.

## Evidence

The contract was consumed by three slices across two repos before it was
published, which is the whole point of the tarball-first sequencing:

- **proposit-server** — self-serve registration, the bot check's `captchaToken`,
  and post-registration redemption all built against it.
- **proposit-mobile** — the first-login registration screen.
- Both consumers green against the published package: server 3640 tests, mobile
  1015, `pnpm run check` exit 0 in each.

The published tarball carries the **same integrity hash** as the local tarball
every slice was verified against (`sha512-hbRhKp70…`), so the bytes that were
tested are the bytes that shipped. That is the check worth keeping — a matching
*version string* would have proved nothing.

## Two things this slice fixed in itself

- **`prepack` was missing.** `pnpm pack` runs `prepack`, not `prepublishOnly`,
  so a tarball could be built at a new version over a stale `dist/`. Caught by
  the mobile agent refusing to proceed, fixed at the root cause, and the
  re-verification asserted on the **schema body** rather than the version
  string. Epic correction **C18**.
- **A capability title contradicted the epic.** "Activate an invitation to
  create an account" became "…to start on a higher tier" — under open
  registration an invitation presets a tier, it does not create the account.

## A correction I made during this slice

I reported the server consumer check as passing when it had failed; a `| tail`
pipe had masked the exit code. The real failure was
`'reqData.code' is possibly 'undefined'` — expected and self-resolving, since
the consuming slice deletes that line. Recorded as epic correction **C16**,
which also settles that a green server `main` between this slice and its
consumer is **not achievable and not the bar**.

## Closeout

Published; consumers repinned from the tarball to `^0.59.0` and re-verified.
Master capability statuses flip at epic closeout, not here.
