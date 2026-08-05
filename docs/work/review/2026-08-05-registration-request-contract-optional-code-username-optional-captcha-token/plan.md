# Plan: Registration request contract — optional code, username, optional CAPTCHA token

## Where the work happens

Two locations, deliberately split:

- **Lifecycle artifacts + `tcw` commands** — the primary checkout on `main`
  (`/Users/brian/Projects/Proposit-App/proposit-shared`). The root epic's
  `tcw work reconcile` reads the child's primary checkout only; an item or
  status on an unmerged branch is invisible to the rollup.
- **Code, taxonomy, capabilities, and release docs** — a native git worktree on
  a feature branch off `main`:

    ```
    git -C /Users/brian/Projects/Proposit-App/proposit-shared \
        worktree add -b registration-request-contract \
        .worktrees/registration-request-contract
    pnpm -C <worktree> install     # a real install; a symlinked node_modules breaks the build
    ```

    `tcw` CLI commands do **not** run inside the worktree (relative
    connected-project resolution breaks there) — taxonomy and capability *bodies*
    are plain file edits, which are fine; the `check`/`validate` runs happen in
    the primary checkout after the branch merges.

## Ordered tasks

Ordering rationale: the test lands with the schema in one task (they are the
same behavioral unit and splitting them leaves a red suite at a commit
boundary); docs land last in a single pass over the finished diff.

### 1. Widen `RegistrationInviteActivationRequestSchema` + its test

**Changes**

- `src/schemas/model/users.ts:246-252` — `code` → `Type.Optional(Type.String())`;
  add `username: Type.Optional(Type.String())` and
  `captchaToken: Type.Optional(Type.String())`. `isPromoCode` and the three
  `agreed*` booleans stay required. Field order: `code`, `isPromoCode`,
  `username`, `captchaToken`, `agreed*` — keeps the code pair adjacent.
- Add a short comment above the schema stating the invariant a future reader
  needs: the endpoint serves both first-time registration and profile-side
  redemption, so `username` is optional at the wire and mandatory at the route
  only for the code-free path. No planning labels, no slice/epic references.
- New `src/schemas/__tests__/registration-activation-request.test.ts` with three
  `Value.Check` assertions (spec AC1-3): code-free + username passes, today's
  `{ code }` body passes, a body missing `agreedToTerms` fails.

**Verified by** `pnpm -C <worktree> run test` green, including the untouched
`src/api-client/user/__tests__/activate-registration-invite.test.ts` (it sends
today's body and must still pass unchanged — that file is the live regression
proof for AC2).

### 2. Reword the taxonomy (three descriptions)

**Changes** — bodies only; no `meta.yaml` field, name, or `vocabulary` list moves.

- `docs/taxonomy/account-registration/description.md` — registering an account
  in your own right; an optional invitation or promo code presets the tier and
  role rather than granting access.
- `docs/taxonomy/registration-invitation/description.md` — a code that presets
  the access tier and role an account registers with (drop "authorizes account
  registration").
- `docs/taxonomy/registration-invitation/promo-code/description.md` — a shareable
  code that presets an account's tier under preset limits (drop "authorizes
  registration").

**Verified by** `tcw taxonomy check` exit 0 in the primary checkout after merge;
and by grep: none of the three contains "authorizes" or asserts a code is
required.

### 3. Reword the three capability bodies

**Changes** — `description.md` only. `meta.yaml` is untouched, so every
`Status: Missing` and `Planning doc:` pointer survives; `tcw capabilities set` is
deliberately **not** run in this slice.

- `docs/capabilities/auth/activate-an-invitation/description.md` — entering an
  invitation code starts the account on the tier the code carries, in place of
  the standard free tier.
- `docs/capabilities/auth/activate-via-a-promo-code/description.md` — same, via a
  promo code rather than a direct invitation.
- `docs/capabilities/profile/activate-an-invitation-or-promo-code/description.md`
  — redeeming from an already-registered account as an *upgrade* to the tier the
  code carries (drop "to move it out of an unverified state").

**Verified by** `tcw capabilities check` exit 0 and
`grep -c 'Status: Missing'` across the six `account-registration` entries = 6,
both in the primary checkout after merge.

### 4. Documentation Sync pass (one pass, after tasks 1-3)

`CLAUDE.md`/`AGENTS.md` in this repo has **no `## Documentation Sync` section**,
so the entries below are derived from the structure the repo actually keeps
(`docs/release-notes/` + `docs/changelogs/`, both with a live `upcoming.md`) and
from `AGENTS.md`'s "After a major set of changes, offer `pnpm version …`". The
missing section is reported to the orchestrator rather than added here — adding
it edits repo guidance, which is not this slice's mandate.

Version cross-check before appending: `package.json` is `0.58.1` and
`docs/{release-notes,changelogs}/v0.58.1.md` both exist, so `upcoming.md` is
correctly empty and takes this slice's content. No rotation.

- **`docs/release-notes/upcoming.md`** [Public-API] — fires. The request contract
  is public surface. One plain-language section: registering no longer requires a
  code; a code now sets your tier.
- **`docs/changelogs/upcoming.md`** [Any-Code-Change] — fires. A `## Changed`
  entry naming `RegistrationInviteActivationRequestSchema`,
  `src/schemas/model/users.ts`, the three new/widened fields, the
  additive-therefore-minor rationale, and the explicit note that the response
  schema is untouched. Wrap in
  `<changes starting-hash="<first commit of this slice>" ending-hash="HEAD">` per
  the existing files' convention.
- **`README.md`** [Public-API] — does **not** fire; confirm by grep that it names
  no registration schema. Skip if the grep is empty.
- **`AGENTS.md`** — does not fire. No new subpath, no new export, no dependency
  or design-rule change.

**Verified by** `pnpm -C <worktree> run check` green on a clean tree (prettier is
part of `lint`, so the Markdown must be prettier-clean too).

### 5. Package the tarball

`pnpm -C <worktree> pack`, report the path, and leave exactly one `*.tgz` (a
second stray tarball in the package root makes a later `pnpm publish` fail with
EUSAGE).

## Verification

Beyond `pnpm run check`, which covers typecheck + lint + test + build:

- **AC2 (response untouched)** is not test-detectable — a diff review is the
  check: `git diff main -- src/` must show no line inside
  `RegistrationInvitationSchema` and no change to
  `src/api-client/user/activate-registration-invite.ts`.
- **AC7 (statuses stay Missing)** is not covered by `tcw capabilities check`
  (a flipped status is structurally valid). Grep the six `meta.yaml` files.
- **AC8 (`tcw validate`)** must be compared against the pre-slice baseline, not
  against exit 0 — `main` already exits 1 with three work-resolution problems
  (`2026-06-21-fix-review-auto-eval-…`, `2026-06-26-rewire-argument-build-…`,
  `2026-07-20-move-argument-graph-…`). Same three, no fourth.
- **Consumer compatibility** is out of this repo's reach; the orchestrator
  validates the tarball against server and mobile. pnpm 10 silently ignores
  `package.json` `overrides`, so that validation must read the resolved version
  out of `node_modules`, not the manifest.

## Notes

- **No version cut.** The delegating request's AC6 asks for `pnpm version minor`;
  the orchestrator retracted it so the cut can be sequenced against consumer
  validation. This slice stops at ready-for-minor, and the tarball carries
  `0.58.1`.
- **No `git push`, no `pnpm publish`, no `tcw work submit`/`complete`.** Those
  are the orchestrator's and the user's.
- No blockers to record: nothing in this node gates this item, and the epic's
  dependents (S2, S6) live in other nodes and are gated by the epic's own order.
