## What changed for consumers

- **Argument descriptions can be edited through the update API.** The
  argument-update request body now carries an optional `description` alongside
  `title`, so a client's edited description is no longer dropped at the schema
  boundary. Title-only update calls are unaffected. A new
  `ARGUMENT_DESCRIPTION_MAX_LEN` (`500`) const is exported for consistent
  length validation.
