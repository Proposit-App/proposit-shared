// Render-policy projections: symbolic-formula rendering + legend, markdown and
// plain-text serialization, the origin passage projection, and the citation
// display projection. Pure and runtime-agnostic — clients supply only their
// presentational shells.

export { buildArgumentFormula } from "./formula.js"
export type { TArgumentFormula, TPremiseFormula } from "./formula.js"

export { serializeArgumentToMarkdown, originPassagesFor } from "./markdown.js"

export { serializeArgumentText } from "./text.js"
export type { TArgumentHeader } from "./text.js"

export {
    humanizeCitationTypeMap,
    humanizeCitationType,
    getInlineSourceLabel,
    describeSource,
    parseByline,
} from "./citation.js"
export type { TSourceDetail } from "./citation.js"
