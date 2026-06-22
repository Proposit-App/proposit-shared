# upcoming

- **`canArgument("delete")` is now OWNER-only among participants.** An EDITOR may edit an unpublished draft but can no longer hard-delete it — only the draft's OWNER (or an admin / `argument:delete` holder) can. `src/permissions/index.ts`. Consumers gate the argument-delete endpoint on this predicate, so adopting this version tightens who can delete an unpublished draft.
- Permissions test coverage: added the `canArgument("unhide")` branch and the `can(…, "RegistrationInvitation")` dispatcher route (previously only `hide` and the `Argument` route were asserted).
