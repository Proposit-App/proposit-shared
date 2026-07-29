# Refined outcome — Introduce accountState and reduce tier to entitlement

**Accepted.** The user approved closeout on 2026-07-29 with the whole epic in
review, saying to consider the work complete and to file anything found later as
new work items.

## Evidence

- `pnpm run check` — exit 0; 105 test files / 1014 tests, typecheck, prettier,
  eslint and the `dist/` build clean.
- `tcw capabilities check` — `capabilities OK`.
- The pinned interface was confirmed against the built
  `dist/consts/account-states.d.ts`, not the source — the shape a consumer
  actually resolves.
- Red-green verified on the load-bearing assertion: putting `DEACTIVATED` back
  into `LOCKED_OUT_ACCOUNT_STATES` fails two tests. The classification cannot
  regress silently.
- Downstream proof rather than promise: both consumers now build and pass their
  full gates against the published package — `proposit-server`'s `check:full`
  (401 files / 2999 tests plus 114 e2e) and `proposit-mobile`'s `check` (109
  suites / 792 tests).

## Acceptance criteria discharged here

Criterion 3 (`UserTierLimits` / `UserTierNames` hold entitlement values only, no
consumer references a removed key) and criterion 14 (no `isPlatformDisabled`
survives anywhere) are satisfied by this slice and confirmed by the consumers
compiling against it.

## Released

Shipped in **v0.53.0** (`c564d41`, tagged and published from `main` on
2026-07-29), together with the two follow-on shared slices this epic turned out
to need.

## Decisions confirmed at verify

**Deletion, not renaming, of `isPlatformDisabled`.** The epic `spec.md` heading
said "Rename, do not redefine" while `plan.md` said delete. The implementation
followed `plan.md`; the spec heading was corrected at the root to "Delete, do not
redefine". Criterion 14 is satisfied either way, so nothing was reworked.

**`NO_ASSIST` keeps `103`.** The numeric gap left by removing the two state
values stays open, because the numbers are persisted server-side and closing it
would silently re-map live rows. A test pins this against a future tidy-up.

**No `capabilities.yaml` on this item.** `auth/deactivate-account` is seeded
`Missing` here and flipped to `Supported` by the consumer surfaces that realize
it. Both consumers now read `Supported`, so the ledger is consistent.

## Deferred

Nothing. The two gaps this slice surfaced — the missing api-client method and
the required `UserSchema.deleted` field — became their own slices on this node
rather than being carried forward, and both have shipped.

## Closeout

Merged to `main` (no PR); `main` carries the work and the `v0.53.0` tag. Docs
were current before the cut: `docs/release-notes/v0.53.0.md` and
`docs/changelogs/v0.53.0.md` were rewritten to cover the `UserSchema.deleted`
removal before rotation, correcting an earlier draft that wrongly claimed
nothing existing breaks.
