# Outcome — Participants api-client methods + add-editor schema

## Shipped (worktree branch, commit 1363774)
`src/api-client/argument/participants.ts` — `getArgumentParticipants` (GET →
`TParticipantWithUser[]`), `addArgumentEditor` (POST `{userId}` → `TParticipant`),
`removeArgumentParticipant` (DELETE, no body). `AddParticipantRequestSchema
= {userId: UUID}` in `src/schemas/api/argument/index.ts`. Registered in
`factory.ts`. 187 lines of tests (path/verb/body + Result, success + error).
Reuses existing `ParticipantSchema`/`ParticipantWithUserSchema`.

## Verification
`pnpm run check` green (vitest + build). Reviewed clean — matches the REST
contract the server slice implements.

## Follow-up
Consumed via local tarball (integration testing, not a published bump). Server
endpoints implement these paths; mobile builds the panel over these methods.
