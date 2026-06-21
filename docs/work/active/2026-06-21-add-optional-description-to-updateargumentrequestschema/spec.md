# Spec — optional `description` on the argument-update contract

## Goal

Let an argument's `description` travel through the update contract so the
server no longer silently drops it at the schema boundary.

## Contract change

`UpdateArgumentRequestSchema.newData` resolves to `MutableArgumentFieldsSchema`
(`schemas/model/arguments.ts`), which today carries only `title`:

```ts
export const MutableArgumentFieldsSchema = Type.Object({
    title: Type.String(),
})
```

Add an optional `description`:

```ts
export const MutableArgumentFieldsSchema = Type.Object({
    title: Type.String(),
    description: Type.Optional(Type.String()),
})
```

- `title` stays required — title-only callers are unaffected.
- `description` is `Type.Optional` (the field may be absent). The persisted
  model field (`ArgumentSchema.description`) is `Nullable`; the *update input*
  is optional, matching how `title` is modeled (presence, not nullability).

## Length const

Export a max-length const alongside `ARGUMENT_TITLE_MAX_LEN` so the server
validates consistently:

```ts
export const ARGUMENT_DESCRIPTION_MAX_LEN = 500
```

`500` matches `CLAIM_BODY_MAX_LEN`, the existing long-text field. The schema
itself stays loose (`Type.String()` with no `maxLength`) to match how `title`
is modeled — the const is the single source of truth for the server's check.

## Acceptance (schema tests)

- `MutableArgumentFieldsSchema` / `UpdateArgumentRequestSchema` accepts a
  `newData` of `{ title, description }`.
- It still accepts `newData` of `{ title }` only (description omitted).
- It rejects a `newData` missing `title`.

## Non-goals

- No `maxLength` enforcement inside the schema (consistent with `title`).
- No server-side changes (separate downstream work item in `proposit-server`).
- No DB migration (the `description` column already exists).
