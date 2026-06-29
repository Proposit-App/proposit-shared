# Release notes — upcoming

## Argument moderation — hide/unhide api-client methods

The api-client now exposes `hideArgument` and `unhideArgument`, so clients can hide or
restore a moderated argument version through the shared factory instead of a raw fetch.
Both call the existing server moderation routes and return the new `{ hidden: boolean }`
state. A matching `SetArgumentHiddenResponseSchema` is exported for validation.

This unblocks the web moderation control (hide/restore affordance on the argument view).
