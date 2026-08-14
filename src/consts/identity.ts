export const INTERNAL_USER_UUID_SEED = new Uint8Array([
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff,
])

export const UsernameValidationRe = /^[\w-]{0,32}$/

/**
 * Whether a username is reserved and must be refused, independent of whether it
 * satisfies {@link UsernameValidationRe}. Both rules apply: a name has to be
 * well-formed AND not reserved.
 *
 * Two rules, deliberately asymmetric:
 *
 * - **`proposit` as a substring.** The brand is reserved for internal and staff
 *   accounts, so `Proposit`, `proposit_staff` and `xpropositx` all go. A name
 *   that merely contains the brand still reads as speaking for it.
 * - **`admin` as the whole name.** `Admin` is reserved as an identity someone
 *   could be mistaken for. It is not a word to ban: `administrator_fan` and
 *   `sysadmin` claim to be nobody, and refusing them would reject ordinary
 *   names for a reason the user cannot guess.
 *
 * Returns a boolean rather than a reason code because both cases are the same
 * sentence to a user — "that username is reserved". Consumers that need to
 * distinguish them can widen this later; unwinding an unused enum is the harder
 * direction.
 */
export function isReservedUsername(username: string): boolean {
    const normalized = username.trim().toLowerCase()
    return normalized === "admin" || normalized.includes("proposit")
}
