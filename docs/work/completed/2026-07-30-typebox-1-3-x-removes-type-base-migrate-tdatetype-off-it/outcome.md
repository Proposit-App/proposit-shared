# Outcome — migrate `EncodableDate` off the removed `Type.Base`

Option 1 of the two the escalation offered: migrate, don't pin the range down.
`proposit-core` took the same route on the same day — required, not coincidental:
the two packages resolve to **one** hoisted `typebox` copy in every shared
consumer, so a split decision would have left whichever guessed wrong broken.

## What shipped

`class TDateType extends Type.Base<Date>` in `src/schemas/common.ts` is gone.
`EncodableDate` is now `Type.Refine` + `Type.Unsafe<Date>` wrapped in a
`Type.Codec`, the same shape core adopted:

- Refine carries the `Check` / `Errors` surface.
- `Unsafe<Date>` keeps `Static<typeof EncodableDate>` inferring as `Date`.
- `Decode` normalizes a serialized date string into a `Date`; `Encode` passes
  `Date` instances through unchanged so `JSON.stringify` still emits ISO.

**The call-site consequence is the part that propagates.** TypeBox 1.3 has no
per-type hook in the Convert pass, so wire coercion moves to the decode pass:
`parseRequest`, `parseResponse`, and the review store now call `Value.Decode`
where they called `Value.Convert` + `Value.Parse`. The schema consequently admits
a date's serialized string — which is what lets a union member such as
`Nullable(EncodableDate)` resolve a wire value at all. A number is still rejected;
that is not a form `JSON.stringify` emits for a `Date`.

Two follow-ups tightened the new ordering before release, and are worth keeping
straight because they are easy to re-break:

- `d294b78` — assert **before** decoding, so a partial request body is still
  rejected. Decode alone would have accepted it.
- `cc7066e` — convert, then assert, then decode, for both request and response
  bodies. That is the order the three passes have to run in now.

- `e60902b` — the migration.
- `dbf7d0b` — merge to `main`.
- Released **v0.54.0**, tagged, published to npm (with `9d03963` resolving
  `@proposit/proposit-core` 3.3.0 from the registry).

## Verification

`src/schemas/__tests__/encodable-date.test.ts` (new, 76 lines) covers the
accept/reject set and the round-trip; the schema suites that touch dates
(`claim-reaction`, `review`, the task-cancel/task-retry API schemas) moved to the
decode path with it.

The escalation's cross-package case is verified where it actually matters: in
`proposit-server`, `pnpm why typebox` resolves a single 1.3.8 with core 3.3.0 and
shared 0.54.0 installed together (`proposit-server` `7b8a752d`).

## Notes

The escalation flagged that shared's local `TDateType` carried a comment saying
custom types "must be defined locally", and asked whether the migration retires
that constraint. It does not retire it here — `EncodableDate` is still defined
locally in `src/schemas/common.ts`. The `instanceof`-across-copies hazard that
motivated the comment is what the codec sidesteps, but sharing one definition
across package boundaries was not attempted and is not implied by this change.
