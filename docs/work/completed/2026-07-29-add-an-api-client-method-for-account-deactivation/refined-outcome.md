# Refined outcome — Add an api-client method for account deactivation

**Accepted.** The user approved closeout on 2026-07-29 across the whole epic.

## Evidence

- `pnpm run check` — exit 0; 106 test files / 1016 tests, typecheck, prettier,
  eslint and the `dist/` build clean.
- Tests were written first and failed for the right reason (`Property
  'deactivateAccount' does not exist on type 'TApiClient'`).
- The real consumer proof is downstream: `proposit-mobile`'s deactivate flow is
  built on this method and its gate passes against the published package.

## The no-argument signature holds up

Verified as the right call rather than a shortcut. The route accepts exactly one
state, so a caller has nothing to choose, and a signature that took a state is
one a caller could pass `banned` or `deleted` to. Two locks, not one: the
argument-free signature, and `DeactivateAccountRequest` as a `Type.Literal`, so
asking for anything else is a compile error before it is a 400.

## Deferred

Nothing.

## Closeout

Merged to `main`; shipped in **v0.53.0** (`c564d41`).

## Note on the item itself

This slice did not exist in the epic plan. It was created mid-epic once
`proposit-mobile` proved unbuildable without it — the plan assumed a single
shared publish and one shared slice. That mis-estimate is recorded on the epic,
not held against this item, which did what its own brief asked.
