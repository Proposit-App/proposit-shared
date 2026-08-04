import { AccountStates } from "../schemas/model/index.js"

export { AccountStates }

/**
 * The account states that refuse authentication. Canonical set — do not restate
 * it as inline comparisons.
 *
 * `DEACTIVATED` is deliberately absent: signing in is how a deactivated account
 * comes back, so authentication must succeed for it.
 */
export const LOCKED_OUT_ACCOUNT_STATES = [
    AccountStates.BANNED,
    AccountStates.DELETED,
] as const

/**
 * Is `accountState` one that refuses authentication?
 *
 * `DEACTIVATED` is **NOT** locked out. Deactivation is a reversible break, and
 * signing back in is the reactivation path — locking it out would make it
 * permanent. This is the carve-out the predicate exists for; never test the
 * state inline.
 *
 * Takes a `string` rather than the narrower union on purpose: values reaching
 * this check often come straight off a database row, where the declared type is
 * an assertion about the column rather than a validated parse. An unrecognized
 * state is correctly not locked out — failing closed on an unknown *principal*
 * is the caller's job, not this predicate's.
 */
export function isLockedOut(accountState: string): boolean {
    return (LOCKED_OUT_ACCOUNT_STATES as readonly string[]).includes(
        accountState
    )
}
