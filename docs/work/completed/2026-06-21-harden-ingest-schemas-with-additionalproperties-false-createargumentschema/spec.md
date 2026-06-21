# Spec — Harden ingest schemas with `additionalProperties: false`

## Goal

Reject unknown keys at the ingestion request/task trust boundary. Today the
TypeBox object schemas behind `CreateArgumentSchema.data` and the ingest
task-input schema accept extra properties silently. Tighten them so a payload
carrying an unexpected key fails `Value.Check`.

## Scope (the exact set, confirmed against the code)

Harden these `Type.Object` / `Type.Interface` definitions:

| Schema                          | File                                   | Construct                                              |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| `CreateArgumentSchema`          | `src/schemas/api/argument/index.ts`    | `Type.Object` (top level)                              |
| `ExternalPlatformData`          | `src/schemas/integrations/index.ts`    | `Type.Object` (raw_text data + base of twitter/reddit) |
| `NoPlatformData`                | `src/schemas/integrations/index.ts`    | `Type.Object` (manual data)                            |
| `TwitterArgumentPlatformData`   | `src/schemas/integrations/index.ts`    | `Type.Interface` (3rd-arg options)                     |
| `RedditArgumentPlatformData`    | `src/schemas/integrations/index.ts`    | `Type.Interface` (3rd-arg options)                     |
| `IngestArgumentTaskInputSchema` | `src/schemas/ingest-argument/index.ts` | `Type.Object`                                          |

Each gets `{ additionalProperties: false }`.

### Already done — no change

`ArgumentCreateTask.data` (`src/schemas/tasks.ts`) already carries
`{ additionalProperties: false }` (and a test in `tasks.test.ts`). The item's
original note listed it; it is satisfied.

### Deliberately left permissive

`TwitterEmbedResponse` — a third-party Twitter oEmbed response object nested
under `TwitterArgumentPlatformData.embedResponse`. It is not our trust
boundary; X can add fields. Leaving it open avoids rejecting otherwise-valid
embeds. (Hardening the parent does not require hardening this nested object —
`additionalProperties: false` only forbids keys not in the declared property
set, and `embedResponse` is a declared property.)

## `Type.Interface` composition note (verified)

`Type.Interface([base], props, opts)` flattens `base`'s properties into a
single object and **drops** `base`'s own options (including any
`additionalProperties`). So:

- `additionalProperties: false` on `ExternalPlatformData` does NOT break the
  twitter/reddit interfaces that compose it (the flattened result re-declares
  every property, base + own).
- To make an interface strict, pass `{ additionalProperties: false }` as its
  own (third) argument.

## Consumer impact (call out in release notes)

`ArgumentPlatformData` (the union behind these value schemas) is reused by
`ArgumentSchema.platformData` (`src/schemas/model/arguments.ts`) — the stored,
read-back shape. So this also tightens **read** validation: a persisted row
that carries an incidental extra key now fails `Value.Check` on read-back.

- Pre-1.0 breaking-in-minor: acceptable per repo policy, but flag it.
- Server/mobile must confirm no stored `platformData` row (or in-flight import
  body) carries extra keys before adopting the bumped version.

## Acceptance

- Each known-keys object still validates; an extra unknown key now fails.
- Optional fields stay optional (omitting one still validates).
- `pnpm run check` green.
- Release-notes + changelog `upcoming.md` updated with the read-back-tightening
  callout.
