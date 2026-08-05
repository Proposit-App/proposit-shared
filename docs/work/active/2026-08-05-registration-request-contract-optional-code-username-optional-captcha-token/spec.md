# Spec: Registration request contract — optional code, username, optional CAPTCHA token

## Capability changes

No new capabilities. Six entries already exist under the `account-registration`
Feature, all seeded `Missing` by `2026-07-11-build-the-master-product-capability-layer`.
This slice reworks **bodies only**; the epic flips statuses at closeout.

```yaml
changed:
    - auth/activate-an-invitation
    - auth/activate-via-a-promo-code
    - profile/activate-an-invitation-or-promo-code
```

Untouched here (bodies already correct): `auth/self-serve-open-registration`,
`auth/choose-a-username-at-registration`, `auth/acknowledge-the-agreements`.

**Not a capability:** bot protection (Turnstile). It is friction on a capability
a user already has, not something a user can *do*. No entry.

**Taxonomy delta (layer below capabilities).** Three descriptions state that a
code authorizes registration — the exact premise the epic removes:

- `docs/taxonomy/account-registration/description.md` (Feature) — "Registering an
  account by redeeming an invitation or promo code, with the preset tier and role
  it carries."
- `docs/taxonomy/registration-invitation/description.md` (Vocabulary) — "An
  invitation or promo code that **authorizes account registration**, carrying a
  preset access tier and role."
- `docs/taxonomy/registration-invitation/promo-code/description.md` (Vocabulary) —
  "A shareable code that **authorizes registration** under preset limits."

The delegating request named only the Feature. The two Vocabulary terms are
siblings of the same defect and sit *below* it in the `Vocabulary → Features →
Capabilities` chain, so rewording the Feature while leaving the terms it is built
from asserting the opposite would leave the taxonomy self-contradicting. All
three are reworded.

## Problem

`RegistrationInviteActivationRequestSchema`
(`src/schemas/model/users.ts:246-252`) requires `code: Type.String()`. That
required field is the wire-level expression of closed alpha: without a code there
is no representable registration request, so no server or mobile slice of the
open-registration epic can even send one. The schema is the contract every other
slice in the epic waits on.

Two adjacent facts, both checked:

- The endpoint is **dual-purpose**. `activateRegistrationInviteImpl`
  (`src/api-client/user/activate-registration-invite.ts:12-25`) is the single
  client for `POST /api/v1/user/register`, and it backs both registration
  (`auth/*` capabilities) and post-registration redemption from the profile
  (`profile/activate-an-invitation-or-promo-code`). Anything this slice makes
  *required* is required on both paths.
- The response is `RegistrationInvitationSchema`
  (`src/schemas/model/users.ts:203-213`), asserted at
  `activate-registration-invite.ts:22`. Out of scope, untouched.

## Goals

1. `code` becomes optional — a code buys a *tier*, not entry.
2. `username` is representable on the request, so registration can collect it.
3. `captchaToken` is representable and optional — web sends a Turnstile token,
   mobile sends nothing.
4. The taxonomy and the capability master stop asserting that a code is the way
   in.

## Non-goals

- **The response schema.** Byte-identical to today. The server slice mints a
  self-issued invitation row for the code-free path rather than adding a second
  response shape.
- **Any validation the server owns.** Whether a code-free request *must* carry a
  `username`, whether a `captchaToken` is *required* for the web origin, username
  uniqueness and format — all route-level policy in `proposit-server`, not
  schema shape. Widening here is what lets the server decide; see Design.
- **A new coded-error envelope for the tier-0 gate.** Resolved as not needed —
  see Design, "The open question".
- **The version cut.** The delegating request's AC6 asks this slice to run
  `pnpm version minor`. The orchestrator has since retracted that: it sequences
  the cut against consumer validation of the tarball. This slice stops at *ready
  for a minor bump* and builds the tarball from the current version.
- **Mobile's `^0.58.0` pin drift.** Pre-existing, tracked separately.
- **The three pre-existing `tcw validate` failures.** `tcw validate` exits 1 on
  `main` *before* this slice: three completed items carry a `discarded`-family
  resolution (`superseded`, `duplicate`, `wontfix`). Fixing them means
  re-filing unrelated completed work. AC3 is read as "no *new* validate
  failures"; the pre-existing three are reported to the epic.

## Design

### The request schema

`src/schemas/model/users.ts:246-252` becomes:

```ts
export const RegistrationInviteActivationRequestSchema = Type.Object({
    code: Type.Optional(Type.String()),
    isPromoCode: Type.Boolean(),
    username: Type.Optional(Type.String()),
    captchaToken: Type.Optional(Type.String()),
    agreedToTerms: Type.Boolean(),
    agreedToPrivacyPolicy: Type.Boolean(),
    agreedToCommunityGuidelines: Type.Boolean(),
})
```

Three decisions the request left implicit:

**`username` is optional, not required.** The request says "`username` — added"
without qualifying it, then justifies the minor bump as "adding two optional
fields", and AC1 demands that "today's `{ code }`-bearing request" — which
carries no username — "still be accepted unchanged". Required is unreachable
under AC1. It is also wrong on the merits: the same endpoint serves
`profile/activate-an-invitation-or-promo-code`, where the caller is an
already-registered account that *has* a username. Requiring one would break the
redemption path to serve the registration path. The server slice enforces
"code-free ⇒ username" at the route, where it can also check uniqueness.

**`isPromoCode` stays required.** It is only meaningful alongside a `code`, so
the code-free path must send a vestigial `isPromoCode: false`. Making it optional
would be equally non-breaking and marginally cleaner, but it is outside the
delta the epic scoped, and a required boolean costs the caller one literal.
Flagged to the epic rather than changed unilaterally.

**No length caps or `format` on the new strings.** `username: Type.String()` is
the unconstrained shape already used at `src/schemas/api/user/index.ts:7,12,22`
for the same field on search and modify. Matching it keeps one username shape
across the contract; a cap introduced here and nowhere else would be a second,
disagreeing definition. `captchaToken` is an opaque Turnstile blob whose length
Cloudflare owns.

Compatibility: widening required→optional and adding optional fields is
additive for producers and consumers alike. `strictFetch`
(`src/utils/utils.ts:228-249`) runs `Value.Assert(requestSchema, payload)` on the
way out, so every body valid today stays valid. **Minor** bump.

### The open question — the tier-0 refusal does *not* need a new coded error

The delegating request asks whether the epic's tier-0 gate (S4) needs a coded
error that old mobile builds can render as "finish registering on the web", and
requires an answer before the publish. **Recommendation: no new contract, and it
does not block this publish.** Three grounded reasons:

1. **The discriminant already exists and already ships.** `ErrorResponseSchema`
   carries `errorCode?: string` — "Optional machine-readable error code … so
   clients can branch on a stable discriminant instead of parsing errorMessage"
   (`src/schemas/common.ts:92-100`). It landed in commit `56d6880`, released in
   `v0.24.0`. Every consumer pinned at `^0.58.x` already parses it. The server
   can emit `errorCode: "<registration-incomplete>"` on the tier-0 refusal today
   with **zero** shared change, on the default `parseResponse` path
   (`src/utils/utils.ts:147-198`), which falls through to `ErrorResponseSchema`
   for any error that is not the 422 grammar-violations or 409 mutation-conflict
   envelope.
2. **A new envelope could not help the builds it is for.** The at-risk
   population is mobile binaries shipped *before* S6. A schema added in shared
   `0.59.0` only reaches a binary built against `0.59.0`+ — which is the S6
   build. Any binary that can render the new envelope is a binary that already
   has the registration screen. The new type would be dead code for its entire
   stated purpose.
3. **The existing path already surfaces a human-readable message.** Mobile's
   sign-in error reader (`proposit-mobile/src/auth/oauth-shared.ts:65-78`)
   returns `body.errorMessage` verbatim, falling back to
   `Sign-in failed (HTTP <status>)`. A pre-S6 binary hitting the tier-0 gate
   already shows whatever sentence the server puts in `errorMessage` — so "Finish
   setting up your account at proposit.com" is a **server-slice string**, not a
   shared-contract change.

Consequence for the epic: the mitigation is S4's to own (set `errorCode` plus a
human-readable `errorMessage` on the tier-0 refusal). Adding a bespoke envelope
later would still be additive and would still be a minor — but on this evidence
it is never needed.

### Taxonomy and capability wording

Reword taxonomy first (it is the layer the capabilities point at), then the three
capability bodies. Statuses are not touched — `tcw capabilities set --status` is
not run in this slice.

### Test

One test file, `src/schemas/__tests__/registration-activation-request.test.ts`,
asserting the AC1 pair against `Value.Check`: a `{ username, isPromoCode,
agreed* }` body with no `code` and no `captchaToken` passes, and today's
`{ code, isPromoCode, agreed* }` body still passes. Plus one negative — a body
missing `agreedToTerms` still fails — so the test would catch a widening that
accidentally made everything optional.

## Acceptance criteria

1. `Value.Check(RegistrationInviteActivationRequestSchema, …)` is `true` for
   `{ username: "ada", isPromoCode: false, agreedToTerms: true,
   agreedToPrivacyPolicy: true, agreedToCommunityGuidelines: true }` — no `code`,
   no `captchaToken`.
2. The same check is `true` for the exact body at
   `src/api-client/user/__tests__/activate-registration-invite.test.ts:17-23`
   (today's `{ code }`-bearing request), unchanged.
3. The same check is `false` for that body with `agreedToTerms` removed.
4. `git diff` touches no line of `RegistrationInvitationSchema`
   (`src/schemas/model/users.ts:203-216`) and no line of
   `activate-registration-invite.ts`.
5. `docs/taxonomy/account-registration/description.md`,
   `docs/taxonomy/registration-invitation/description.md`, and
   `docs/taxonomy/registration-invitation/promo-code/description.md` no longer
   assert that a code authorizes/is required for registration; `tcw taxonomy
   check` exits 0.
6. The three capability bodies read as: a code buys a tier in place of the
   standard free tier (`auth/*`), and profile-side redemption is an upgrade on an
   already-registered account (`profile/*`).
7. `tcw capabilities check` exits 0 and all six `account-registration`
   capabilities still read `Status: Missing`.
8. `tcw validate` reports only the three pre-existing work-resolution problems
   present on `main` before this slice — no new failure.
9. `pnpm run check` is green on a clean tree.
10. `pnpm pack` produces a tarball, and no stray `*.tgz` is left in the package
    root beyond the one handed to the orchestrator.

## Risks

- **Someone reads "optional `username`" as "registration need not collect one".**
  It is optional *at the wire*, mandatory at the route for the code-free path.
  Called out in Design and repeated in `outcome.md` so S2/S6 do not inherit the
  looser reading.
- **The vestigial `isPromoCode: false`.** If S2 or S6 finds sending it awkward,
  making it optional is another additive minor. Cheap to defer, cheap to fix.
- **The tier-0 recommendation is wrong and a coded error *is* wanted.** Cost of
  being wrong is one additional minor shared release, not a redesign — the
  envelope would be additive. That asymmetry is why this slice does not
  speculatively add it.
- **Pre-existing `tcw validate` exit 1 masks a new failure.** Mitigated by
  criterion 8: the *exact* three problems, compared against the `main` baseline
  captured in this spec.
