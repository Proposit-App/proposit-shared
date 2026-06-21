# upcoming

## Harden ingestion request/task schemas with `additionalProperties: false`

The TypeBox object schemas on the argument-ingestion request/task path now
reject unknown keys:

- `CreateArgumentSchema` (`schemas/api/argument`) — top-level body.
- `ExternalPlatformData`, `NoPlatformData`, `TwitterArgumentPlatformData`,
  `RedditArgumentPlatformData` (`schemas/integrations`) — the per-platform
  `data` value schemas behind `CreateArgumentSchema.data` /
  `ArgumentPlatformDataMap`. The two `Type.Interface` schemas take
  `additionalProperties: false` as their options argument; the base
  `ExternalPlatformData` they compose can stay strict because `Type.Interface`
  flattens base properties and drops the base's own `additionalProperties`.
- `IngestArgumentTaskInputSchema` (`schemas/ingest-argument`) — internal task
  input.

`ArgumentCreateTask.data` (`schemas/tasks`) already carried the constraint and
is unchanged.

`TwitterEmbedResponse` is deliberately left open — it models X's third-party
oEmbed response, not our trust boundary.

Additive only in the sense that no known-good shape changes; it is a
**breaking validation change** for any payload (or stored `platformData` row,
since the union also backs `ArgumentSchema.platformData`) that was relying on
extra keys being silently dropped.
