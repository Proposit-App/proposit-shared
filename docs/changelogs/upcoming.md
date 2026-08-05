# Changelog — upcoming

<changes starting-hash="51a9a28" ending-hash="HEAD">

## Changed

- **`RegistrationInviteActivationRequestSchema` widened**
  (`src/schemas/model/users.ts`): `code` becomes
  `Type.Optional(Type.String())`, and two optional fields are added —
  `username: Type.Optional(Type.String())` and
  `captchaToken: Type.Optional(Type.String())`. `isPromoCode` and the three
  `agreed*` booleans are unchanged and still required. `TRegistrationInviteActivationRequest`
  derives all three.

    Purely additive: widening a required field to optional and adding optional
    fields keeps every body that validates today valid, including the one
    `activateRegistrationInviteImpl` asserts before sending
    (`src/utils/utils.ts` → `strictFetch`). Minor, not major.

    `username` is optional at the wire on purpose. `POST /api/v1/user/register`
    serves both first-time registration and profile-side code redemption, and the
    redemption caller already has a username; requiring one here would break that
    path. The server enforces "code-free ⇒ username" at the route, where it also
    owns uniqueness and format.

- **The registration response is untouched.** `RegistrationInvitationSchema`
  and `src/api-client/user/activate-registration-invite.ts` are byte-identical.

## Added

- `src/schemas/__tests__/registration-activation-request.test.ts` — checks a
  code-free body with a username, today's code-bearing body with no username, a
  body carrying a captcha token, and a body missing an agreement (which must
  still be rejected, proving the widening did not loosen the whole object).

## Internal

- `docs/taxonomy/` — the `account-registration` Feature and the
  `registration-invitation` / `registration-invitation/promo-code` Vocabulary
  terms no longer describe a code as authorizing registration; a code presets the
  tier and role an account starts on.
- `docs/capabilities/` — `auth/activate-an-invitation`,
  `auth/activate-via-a-promo-code`, and
  `profile/activate-an-invitation-or-promo-code` bodies reworded to match.
  Statuses are unchanged.

</changes>
