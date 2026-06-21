# Add optional description to UpdateArgumentRequestSchema

## Product changes

## Technical changes

## Meta changes

# Change request: add optional `description` to `UpdateArgumentRequestSchema.newData`

**From:** `proposit-server`
**Date:** 2026-06-21
**Impact area:** `@proposit/shared/schemas/api/argument` (`UpdateArgumentRequestSchema`)
**Target version:** minor bump (additive optional field)
**Tracking work item:** `proposit-server/docs/work/active/2026-06-21-atv-crud-restoration-follow-ups/` (item 3)

## Problem

Argument description editing is half-wired on the server. The `arguments` table
has a `description` column, and `proposit-server`'s `updateArgumentAction` already
accepts `description?: string`, but `UpdateArgumentRequestSchema.newData` carries
**only** `title`. So a `description` sent on the PUT body is dropped at the schema
boundary — the user's edited description is silently lost.

## Root cause

```ts
// current
export const UpdateArgumentRequestSchema = Type.Object({
    newData: Type.Object({
        title: Type.String(),
    }),
    currentDigest: Type.String(),
})
```

`newData` is a closed object with `title` only; there is no field for the
description to travel through.

## Proposed API

Add an optional `description` to `newData` (keep `title` required as today):

```ts
export const UpdateArgumentRequestSchema = Type.Object({
    newData: Type.Object({
        title: Type.String(),
        description: Type.Optional(Type.String()),
    }),
    currentDigest: Type.String(),
})
```

Optional so existing title-only callers are unaffected. If a shared max-length
const for argument description exists (or should), expose it alongside the
existing `ARGUMENT_TITLE_MAX_LEN` so the server can validate consistently.

## Consumer impact

`proposit-server` will, after bumping the dependency:

- add `description` to `MUTABLE_ARGUMENT_FIELDS` + a max-length check,
- apply `newData.description` in the argument PUT handler (mirroring `title`),
- pass `description` through the gear-menu "Edit description" save path,
- add an integration test exercising the description round-trip.

No DB migration needed (the column already exists).

## Test cases (shared side)

- `UpdateArgumentRequestSchema` accepts a `newData` with `{ title, description }`.
- It still accepts `newData` with `{ title }` only (description omitted).
- It rejects a `newData` missing `title`.

