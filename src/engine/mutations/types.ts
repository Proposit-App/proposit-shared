// Inherited from proposit-server. Legacy type-alias names (ProjectEngine,
// ProjectChangeset, ProjectMutationResult) predate the brain-style T-prefix
// convention; renaming cascades through every consumer. Tracked as tech debt
// for a dedicated follow-up.
/* eslint-disable @typescript-eslint/naming-convention */
import type {
    ArgumentEngine,
    TCoreChangeset,
    TCoreMutationResult,
} from "@proposit/proposit-core"
import type { TArgument } from "../../schemas/model/arguments.js"
import type {
    TPropositionalExpressionCombined,
    TPropositionalPremise,
    TPropositionalVariable,
} from "../../schemas/logic.js"

/** Fully parameterized ArgumentEngine for this project. */
export type ProjectEngine = ArgumentEngine<
    TArgument,
    TPropositionalPremise,
    TPropositionalExpressionCombined,
    TPropositionalVariable
>

/** Fully parameterized changeset type. */
export type ProjectChangeset = TCoreChangeset<
    TPropositionalExpressionCombined,
    TPropositionalVariable,
    TPropositionalPremise,
    TArgument
>

/** Fully parameterized mutation result type. */
export type ProjectMutationResult<T> = TCoreMutationResult<
    T,
    TPropositionalExpressionCombined,
    TPropositionalVariable,
    TPropositionalPremise,
    TArgument
>

export { mergeChangesets } from "@proposit/proposit-core"
