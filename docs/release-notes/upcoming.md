# Release notes — upcoming

## One shared answer to "is this account disabled?"

`@proposit/shared/consts` now exports `isPlatformDisabled(tier)` and
`PLATFORM_DISABLED_TIERS`. Until now, "which tiers mean the account is locked out
of the platform" was a rule each app kept for itself, so there was nothing for a
second implementation to disagree with.

The set is `BANNED` and `DEACTIVATED`. **`NO_ASSIST` is not in it** — and that
exclusion, not the two inclusions, is why the definition is worth sharing. It
lands directly above `DEACTIVATED` in the tier numbering, so the shorthand that
looks obvious — treat the whole upper block as disabled — quietly locks out
accounts that are paying and active, and merely have AI assist switched off.

Additive only; nothing that existed before changed. Reach for the predicate
rather than comparing tier numbers by hand.
