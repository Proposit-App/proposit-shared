import Type, { type Static } from "typebox"

export const IngestionPipelineVersionSchema = Type.Union([
    Type.Literal("v1-single-shot"),
    Type.Literal("v2-multi-stage"),
])
export type TIngestionPipelineVersion = Static<
    typeof IngestionPipelineVersionSchema
>

/**
 * Internal task input passed from a server route handler into the
 * ingestion pipeline executor. NOT a public route body — the public
 * `/api/v1/argument/import/raw_text` route still accepts the existing
 * `CreateArgumentSchema` shape (`{ origin: "raw_text", data: { text } }`).
 * The server constructs this internal shape from the public body plus the
 * server-side `INGESTION_PIPELINE_VERSION` env (never from the request body)
 * and passes it to `executePipeline(...)` in `@proposit/proposit-core`.
 */
export const IngestArgumentTaskInputSchema = Type.Object({
    text: Type.String({ minLength: 1, maxLength: 50_000 }),
    pipelineVersion: IngestionPipelineVersionSchema,
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
})
export type TIngestArgumentTaskInput = Static<
    typeof IngestArgumentTaskInputSchema
>
