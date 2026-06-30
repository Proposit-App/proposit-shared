// Curated-argument YAML lifecycle foundation: the on-disk YAML schema, its
// serialize/parse helpers, the persisted-argument → curated lowering, and the
// id-independent content digest used for change detection.

export {
    CuratedArgumentYamlSchema,
    ExprNodeYamlSchema,
    ArgumentYamlProvenanceSchema,
    type TCuratedArgumentYaml,
} from "./schema.js"
export { serializeArgumentYaml, parseArgumentYaml } from "./serialize.js"
export { lowerArgumentToCurated, type TArgumentLoweringInput } from "./lower.js"
export { curatedArgumentContentDigest } from "./digest.js"
export { sha256Hex } from "./sha256.js"
