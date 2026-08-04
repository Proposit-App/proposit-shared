# Add password to testing-and-qa mobile-session schema

## Product changes

Testing-and-QA reviewer sign-in now requires a password in addition to the
account identity, so automated App Store review accounts authenticate with a
credential rather than an opaque identity alone.

## Technical changes

Add a required `password: Type.String({ minLength: 1, maxLength: 254 })` field
to the `testing-and-qa` member of `MobileSessionRequest`
(`src/schemas/api/auth/index.ts`). `TMobileSessionRequest` derives
automatically. Add accept/reject test cases for the new field.

## Meta changes

Docs-sync entries in `docs/release-notes/upcoming.md` and
`docs/changelogs/upcoming.md`. Additive schema field — suggests a minor bump;
version cut + publish are gated at the workspace root.
