# Outcome: Registration request contract — optional code, username, optional CAPTCHA token

## Where it landed

Code, taxonomy, capability bodies, and release docs were built in a native git
worktree on `registration-request-contract`
(`.worktrees/registration-request-contract`, real `pnpm install`), then
fast-forwarded into `main` in the primary checkout at `e21992b` so the epic's
`tcw work reconcile` can see them. **Nothing is pushed.** The branch and the
worktree are left in place; the tarball lives in the worktree.

## What shipped, task by task

### 1. The schema — `51a9a28`

`src/schemas/model/users.ts` — `RegistrationInviteActivationRequestSchema`:

```ts
code: Type.Optional(Type.String()),
isPromoCode: Type.Boolean(),
username: Type.Optional(Type.String()),
captchaToken: Type.Optional(Type.String()),
agreedToTerms / agreedToPrivacyPolicy / agreedToCommunityGuidelines: Type.Boolean(),
```

Plus a doc comment stating the invariant the next reader needs: one endpoint,
two callers, which is why `username` is optional at the wire and mandatory at the
route on the code-free path.

New `src/schemas/__tests__/registration-activation-request.test.ts`, four cases —
code-free with a username, today's code-bearing body with no username, a body
carrying a captcha token, and a body missing an agreement (must still be
rejected).

`src/api-client/user/activate-registration-invite.ts` and its test are
**untouched**, verified by an empty `git diff 4609c32..HEAD -- src/api-client/`.
That existing test sends today's body and still passes, which is the live
regression proof for AC2. `RegistrationInvitationSchema` has no changed line.

### 2. The taxonomy — `6583b3f`

Three descriptions, bodies only (`docs/taxonomy/**` is prettier-ignored, so no
formatting churn):

- `account-registration` (Feature) — registering and choosing a username; a code
  is optional and presets tier/role in place of the defaults.
- `registration-invitation` (Vocabulary) — presets the tier and role an account
  starts on; redeemable at registration or afterwards.
- `registration-invitation/promo-code` (Vocabulary) — presets an account's access
  tier under preset limits.

The last two are the spec's addition to the delegating request, which named only
the Feature. Rationale in `spec.md` → Capability changes.

### 3. The capability bodies — `19ac02b`

`description.md` only; no `meta.yaml` touched, so no `Status` or `Planning doc`
moved and `tcw capabilities set` was never run.

- `auth/activate-an-invitation` — enter a code while registering, start on the
  tier it carries in place of the standard free tier.
- `auth/activate-via-a-promo-code` — same, promo code rather than invitation.
- `profile/activate-an-invitation-or-promo-code` — redeem after registering,
  upgrading to the tier the code carries.

Contradiction detection: `tcw capabilities search registration` returns
`auth/self-serve-open-registration` and
`auth/choose-a-username-at-registration`, both `Missing` and both consistent with
the new wording — the epic's premise is what these bodies now agree with, not
contradict. No `Supported` entry claims a code is required for access.
`tcw capabilities check` exits 0.

### 4. Documentation Sync — `e21992b`

- `docs/release-notes/upcoming.md` [Public-API] — **fired.** One plain-language
  section: registering no longer needs a code, a code sets your tier, nothing
  that worked before stops working.
- `docs/changelogs/upcoming.md` [Any-Code-Change] — **fired.** `## Changed` /
  `## Added` / `## Internal`, wrapped in
  `<changes starting-hash="51a9a28" ending-hash="HEAD">` per the existing files'
  convention.
- `README.md` [Public-API] — **did not fire.** Grepped: it names no registration
  schema, invitation, or promo code.
- `AGENTS.md` — **did not fire.** No new subpath, export, dependency, or design
  rule.

Version cross-check before appending: `package.json` is `0.58.1`, both
`v0.58.1.md` files exist, both `upcoming.md` files held only `# Upcoming`. No
rotation needed, none performed.

## Test result

`pnpm run check` on a clean tree in the worktree — **green**:

```
prettify:check → All matched files use Prettier code style!
eslint         → clean
test           → Test Files 119 passed (119) · Tests 1176 passed (1176)
build          → tsc -p tsconfig.build.json, no errors
```

`git status --short` empty afterwards.

`tcw taxonomy check` → `taxonomy OK` (0). `tcw capabilities check` →
`capabilities OK` (0). All six `account-registration` capabilities still read
`Status: Missing`.

`tcw validate` → exit 1 with **exactly** the three problems that were already on
`main` before this slice (three completed items carrying a `discarded`-family
resolution: `2026-06-21-fix-review-auto-eval-…`,
`2026-06-26-rewire-argument-build-…`, `2026-07-20-move-argument-graph-…`). No
fourth. Reported to the epic; fixing them means re-filing unrelated completed
work.

## Where the plan and the request were wrong

**The request left `username`'s optionality unstated, and required is
unreachable.** AC1 demands that today's `{ code }`-bearing body — which carries
no username — still be accepted, and the same endpoint serves profile-side
redemption by an account that already has one. Shipped optional. The requirement
lives at the route in `proposit-server`. Recorded in `spec.md` → Design before
implementing.

**The request scoped the taxonomy reword to the Feature only.** Two Vocabulary
terms beneath it asserted the same removed premise ("authorizes account
registration" / "authorizes registration"). Rewording the Feature alone would
have left the taxonomy self-contradicting. Widened in `spec.md` and shipped.

**AC6 (cut a minor) was retracted — and then reinstated by the orchestrator.**
*(Updated 2026-08-05, after this outcome was first written.)* The slice originally
stopped at ready-for-minor. The epic then cut the minor here rather than in a
separate item, because two of its corrections landed in this repo: **C16** (a
minor is the right bump — widening `code` to optional is breaking for a consumer
that dereferences it unguarded, and this repo's pre-1.0 policy admits that in a
minor) and **C18** (the `prepack` fix below). `package.json` is now `0.59.0`,
`docs/release-notes/v0.59.0.md` and `docs/changelogs/v0.59.0.md` are rotated, both
`upcoming.md` files are back to a bare heading, and `v0.59.0` is tagged locally on
the prepack commit. Nothing is pushed and nothing is published.

**This repo has no `## Documentation Sync` section** in `CLAUDE.md`/`AGENTS.md`,
though it keeps the full `docs/release-notes/` + `docs/changelogs/` structure the
skill describes and `AGENTS.md` tells agents to offer a version bump. The
triggers above were derived from the structure the repo actually keeps. Adding
the section edits repo guidance and is not this slice's mandate — flagged to the
orchestrator as a small follow-up.

**`pnpm -C <worktree> install` fails under corepack.** Corepack resolves
`packageManager` from the *cwd*, and the workspace root has no `package.json`, so
it fetched pnpm 11.20.0 and then refused against this repo's pinned 10.23.0. Must
`cd` into the worktree. Nothing to fix in the repo; worth knowing.

**The plan said to `pnpm pack`.** The repo already ships
`pnpm run pack:branch` (`scripts/pack-branch.sh`), which exists precisely for
this: it suffixes the branch onto the filename so two worktrees at the same
version cannot silently produce the same tarball name, and it `rm -f`s its own
previous output so no stray `*.tgz` accumulates. Used that instead.

## Handoff to the epic

**Tarball — the branch-suffixed `0.58.1` artifact this section originally named is
superseded and has been deleted.** *(Corrected 2026-08-05.)* The current handoff
artifact is:

`/Users/brian/Projects/Proposit-App/.tarballs/proposit-shared-0.59.0.tgz`

**Why the old path was dangerous enough to correct rather than just update.** A
later repack from the primary checkout produced a tarball stamped `0.59.0` over
`dist/` compiled from roughly `v0.58.0` — no `username`, no `captchaToken`, `code`
still required. Cause: `dist/` is gitignored, this repo rebuilt it only in
`prepublishOnly`, and **`pnpm pack` runs `prepack`, not `prepublishOnly`**, so the
pack shipped whatever was on disk. The build here happened inside the worktree, so
the primary checkout's `dist/` was never refreshed.

Fixed at the root cause: `"prepack": "pnpm run build"` was added to
`package.json`, so no future pack can ship stale bytes. Verified live — `dist/` is
rebuilt during `pnpm pack`, and the packed tarball is byte-identical to the
handoff artifact.

**The verification instruction below was wrong, and this is the durable lesson.**
Reading the resolved version out of `node_modules` is sound against pnpm 10's
silent `overrides` no-op, and it **passed on the stale artifact**. A version
string proves which `package.json` you installed, never which bytes came with it.
Assert on the contract body instead:

```
grep -A 8 "RegistrationInviteActivationRequestSchema = Type.Object" \
  node_modules/@proposit/shared/dist/schemas/model/users.js
```

Recorded as epic correction **C18**.

**The tier-0 coded-error question: answered no.** `ErrorResponseSchema` already
carries `errorCode?: string` (`src/schemas/common.ts:92-100`, shipped in
`v0.24.0` via `56d6880`), so the server can discriminate the tier-0 refusal today
with zero shared change on every consumer pinned at `^0.58.x`. A *new* envelope
could not help the builds it is for — a schema added in `0.59.0` only reaches a
binary built against `0.59.0`+, which is the S6 build that already has the
registration screen. And mobile's `readErrorMessage`
(`proposit-mobile/src/auth/oauth-shared.ts:65-78`) already renders `errorMessage`
verbatim, so a pre-S6 binary already shows whatever sentence the server writes.
The mitigation is S4's: set `errorCode` plus a human-readable `errorMessage`. Not
a blocker on this publish.

**Two decisions the epic may want to revisit:**

1. `isPromoCode` stays **required**, so a code-free registration sends a
   vestigial `isPromoCode: false`. Making it optional would be another additive
   minor — outside the delta the epic scoped, so not changed unilaterally.
2. `username` and `captchaToken` carry no `minLength`/`maxLength`. That matches
   the unconstrained `username: Type.String()` already used at
   `src/schemas/api/user/index.ts:7,12,22`; a cap introduced only here would be a
   second, disagreeing definition of the same field.

## Notes

Not done, by instruction: no `git push`, no `pnpm publish`, no `pnpm version`,
no `tcw work submit`, no `tcw work complete`, no capability status flips.
