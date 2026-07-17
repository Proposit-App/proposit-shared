---
from: .
initiative: 2026-07-17-chat-builder-mobile
---

# api-client: add build() method to factory

Slice 1 of cross-node epic **Chat builder (mobile)** (`2026-07-17-chat-builder-mobile`).
Blocking: unblocks the mobile chat-builder UI (Slice 2).

## Ask

Add one thin, **non-streaming** method to the `@proposit/shared` api-client
factory, mirroring `importArgumentImpl` in `src/api-client/factory.ts`. No schema
work — 0.42.x already ships everything below.

## Already shipped (no schema work)

- `ArgumentBuilderRequestSchema` (`src/schemas/api/argument/build.ts`):
  `{ lastResponseId?: string, newPrompts: string[], action: "review" | "finalize"
  | "simulate_user" }`.
- Task literals `argument_build_review` / `argument_build_finalize` /
  `argument_build_simulate_user` (`src/schemas/tasks.ts`); `resultData` =
  `{ tokensUsed, output: ChatEntry }`.

## The gap

```
build(argumentId: string, version: number, body: TArgumentBuilderRequest)
  → POST /api/v1/argument/${argumentId}/${version}/build
  → returns a Task (validate against TaskSchema)
```

- Register `build: buildImpl` in the `impls` registry.
- Add `build` to the client interface type.
- Server route already exists and returns the created task (not SSE) — see
  `proposit-server` `.../[argumentId]/[version]/build/route.ts`.

## Test

Request-shape + task-response validation in shared's suite.

## Consumer impact

Purely additive (new method); no back-compat risk. After release, mobile repins
`@proposit/shared` and unblocks Slice 2.

