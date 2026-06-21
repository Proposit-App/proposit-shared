import Type, { type Static } from "typebox"

export const IngestionPipelineSchema = Type.Union([
    Type.Literal("scholar"),
    Type.Literal("scribe"),
])
export type TIngestionPipeline = Static<typeof IngestionPipelineSchema>

/**
 * Internal task input passed from a server route handler into the
 * ingestion pipeline executor. NOT a public route body — the public
 * `/api/v1/argument/import/raw_text` route accepts the `CreateArgumentSchema`
 * shape (`{ origin: "raw_text", data: { text }, mode? }`). The server
 * resolves the user-facing `mode` (or its configured default) to a pipeline
 * role, constructs this internal shape, and passes it to `executePipeline(...)`
 * in `@proposit/proposit-core`.
 */
export const IngestArgumentTaskInputSchema = Type.Object(
    {
        text: Type.String({ minLength: 1, maxLength: 50_000 }),
        pipeline: IngestionPipelineSchema,
        title: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
    },
    { additionalProperties: false }
)
export type TIngestArgumentTaskInput = Static<
    typeof IngestArgumentTaskInputSchema
>
