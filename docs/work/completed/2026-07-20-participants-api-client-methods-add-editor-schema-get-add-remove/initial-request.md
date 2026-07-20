# Participants api-client methods + add-editor schema (get/add/remove)

Shared half of the participants API, under the mobile capability-gaps epic
(`2026-07-11-close-mobile-capability-gaps-vs-proposit-shared-master`). The server
half (endpoints + mutation model) is
`proposit-server` item
`2026-07-20-argument-participants-collaborators-api-list-involved-add-remove-editor-step-down`.
Together they unblock the mobile participants slice.

## What exists (reuse, don't redeclare)
- `ParticipantSchema`, `ParticipantWithUserSchema` (= Participant ∩
  UserPublicFields), `TParticipant` in `src/schemas/model/arguments.ts`.
- `ParticipantRoles {OWNER, EDITOR}`, `TParticipantRole` in `src/consts/roles.ts`.
- The `can` predicate in `src/permissions/index.ts` already gates participant
  roles.

## Build (the REST contract + client methods)
Define the contract these endpoints implement (server builds them to match):

- `GET  /api/v1/argument/{argumentId}/{version}/participants` → `TParticipantWithUser[]`
- `POST /api/v1/argument/{argumentId}/{version}/participants` body `{ userId }` → `TParticipant` (owner adds an editor)
- `DELETE /api/v1/argument/{argumentId}/{version}/participants/{userId}` → void (owner removes an editor, or a user removes themselves = step down)

Add:
1. An **add-editor request schema** (`AddParticipantRequestSchema` = `{ userId: UUID }`) in `src/schemas/model/arguments.ts` (or the api schema file, matching where sibling request schemas live).
2. **api-client methods** in `src/api-client/argument/` (or `user/`, wherever argument-scoped methods live), registered in `factory.ts`, following the `strictFetch` pattern:
   - `getArgumentParticipants(argumentId, version)` → `TParticipantWithUser[]`
   - `addArgumentEditor(argumentId, version, body)` → `TParticipant`
   - `removeArgumentParticipant(argumentId, version, userId)` → void
3. Unit tests mirroring the existing api-client tests (mock fetch; assert path/verb/body + parsed Result; success + error).

## Out of scope
Server endpoints + mutation model (separate server item). Authorization is
enforced server-side; the client methods just call the routes.
