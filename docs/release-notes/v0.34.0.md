# Release notes — upcoming

- **New api-client method: `importArgument`.** The shared client can now start a
  raw-text (and other-origin) import directly — `importArgument({ origin, data, mode })`
  hits `POST /api/v1/argument/import/{origin}` and returns the create task with the new
  argument's id/version. Consumers no longer hand-roll a `fetch` for the `/import/*` routes.
