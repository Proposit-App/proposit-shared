import { Nullable, UUID } from "../../../common.js"
import {
    LogicalOperatorType,
    PropositionalExpressionSchema,
    PropositionalExpressionTypes,
} from "../../../logic.js"
import { ArgumentEngineSnapshotSchema } from "../../../snapshot.js"
import { Type, type Static } from "typebox"

const InsertDirectionType = Type.Union([
    Type.Literal("before"),
    Type.Literal("after"),
])

export const CreateExpressionWithOperatorRequestSchema = Type.Object({
    premiseId: UUID,
    targetExpressionId: UUID,
    operatorType: LogicalOperatorType,
    direction: InsertDirectionType,
    type: PropositionalExpressionTypes,
    variableId: Type.Optional(Nullable(UUID)),
})

export type TCreateExpressionWithOperatorRequest = Static<
    typeof CreateExpressionWithOperatorRequestSchema
>

export const CreateExpressionWithOperatorResponseSchema = Type.Object({
    snapshot: ArgumentEngineSnapshotSchema,
    created: Type.Array(PropositionalExpressionSchema),
    modified: Type.Array(PropositionalExpressionSchema),
})

export type TCreateExpressionWithOperatorResponse = Static<
    typeof CreateExpressionWithOperatorResponseSchema
>
