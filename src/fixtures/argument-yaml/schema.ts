// On-disk YAML contract for a curated argument.
//
// This TypeBox schema mirrors `../curated-argument`'s `CuratedArgument` /
// `ExprNode` authoring shape, plus the optional `documentCurationId` and
// `provenance` carried by `../historical-figures`'s `HistoricalFigureArgument`.
// It is the canonical, PR-editable representation a curated argument serializes
// to and is validated against on parse — NOT core's lossy snapshot YAML.

import Type from "typebox"
import { AxiomKindSchema } from "../../schemas/model/claims.js"
import type { CuratedArgument } from "../curated-argument/index.js"
import type { HistoricalFigureProvenance } from "../historical-figures/index.js"

// Recursive `ExprNode` union. Declared as a cyclic schema so the `operator` /
// `formula` branches can reference the same node type for their children.
export const ExprNodeYamlSchema = Type.Cyclic(
    {
        ExprNode: Type.Union([
            Type.Object({
                type: Type.Literal("variable"),
                symbol: Type.String(),
            }),
            Type.Object({
                type: Type.Literal("operator"),
                operator: Type.Union([
                    Type.Literal("and"),
                    Type.Literal("or"),
                    Type.Literal("not"),
                    Type.Literal("implies"),
                    Type.Literal("iff"),
                ]),
                children: Type.Array(Type.Ref("ExprNode")),
            }),
            Type.Object({
                type: Type.Literal("formula"),
                children: Type.Array(Type.Ref("ExprNode")),
            }),
        ]),
    },
    "ExprNode"
)

// Provenance block — mirrors `HistoricalFigureProvenance`. `model` is the only
// nullable field (some ingestion runs do not pin a concrete model id).
export const ArgumentYamlProvenanceSchema = Type.Object({
    provider: Type.String(),
    model: Type.Union([Type.String(), Type.Null()]),
    pipeline: Type.String(),
    pipelineVersion: Type.String(),
    mode: Type.String(),
    runAt: Type.String(),
    sourceFile: Type.String(),
    sourcePath: Type.String(),
    coreVersion: Type.String(),
    sharedVersion: Type.String(),
    serverVersion: Type.String(),
})

const CuratedClaimYamlSchema = Type.Object({
    symbol: Type.String(),
    title: Type.String(),
    body: Type.String(),
    // Optional axiomatic support. Present as one of the axiom-kind literals when
    // the claim rests on a self-evident basis; the key is omitted otherwise,
    // which is exactly how a claim without support has always serialized.
    axiom: Type.Optional(AxiomKindSchema),
})

const CuratedPremiseYamlSchema = Type.Object({
    // Title-less premises persist `title: null`.
    title: Type.Union([Type.String(), Type.Null()]),
    role: Type.Union([Type.Literal("conclusion"), Type.Literal("supporting")]),
    tree: ExprNodeYamlSchema,
})

export const CuratedArgumentYamlSchema = Type.Object({
    title: Type.String(),
    description: Type.String(),
    claims: Type.Array(CuratedClaimYamlSchema),
    premises: Type.Array(CuratedPremiseYamlSchema),
    // Stable id of the source document this argument was ingested from. Optional
    // because a freshly-authored argument may not have one yet.
    documentCurationId: Type.Optional(Type.String()),
    provenance: Type.Optional(ArgumentYamlProvenanceSchema),
})

// The static type is defined manually from the existing hand-written curated
// types rather than via `Static<typeof CuratedArgumentYamlSchema>`: TypeBox's
// `Static` does not recurse cleanly through `Type.Cyclic` (the same limitation
// `schemas/common.ts` works around for `JsonValue`).
export type TCuratedArgumentYaml = CuratedArgument & {
    documentCurationId?: string
    provenance?: HistoricalFigureProvenance
}
