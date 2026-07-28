# Changelog — upcoming

- **Add `isPlatformDisabled(tier)` and `PLATFORM_DISABLED_TIERS`** to
  `@proposit/shared/consts` (`src/consts/user-tiers.ts`). One definition of which
  `users.tier` values lock an account out of the platform — `BANNED` (101) and
  `DEACTIVATED` (102) — replacing a rule that existed only as a server-local
  predicate. `NO_ASSIST` (103) is explicitly **not** in the set: it sits directly
  above `DEACTIVATED` in the same numeric block but withholds AI assist only
  (`maxTokensPerMonth: 0`, all other limits equal to `FREE`), so the obvious
  `tier > 100` shorthand for "the lockout block" locks out a paying user. That
  carve-out, stated in the doc comment, is the reason the definition is worth
  federating; the two positive cases are the easy half.

    The parameter is `number`, not the narrower `UserTierValues`, deliberately: the
    values reaching this check come off database rows whose declared tier type is an
    assertion about the column rather than a validated parse, and an unrecognized
    tier is correctly _not_ platform-disabled — failing closed on an unknown
    principal belongs to the caller. It also matches the existing server-local
    signature, so adoption there is an import swap rather than a cast.

    Purely additive: no existing export changed, moved, or was removed, and
    `src/consts/index.ts` already re-exported the module. A unit test pins all seven
    `UserTiers` members individually and fails if a tier is added without a decision
    about which side it falls on.
