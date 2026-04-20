import { UUID } from "../../../common.js"
import {
    LogicalOperatorType,
    PropositionalExpressionSchema,
} from "../../../logic.js"
import { ArgumentEngineSnapshotSchema } from "../../../snapshot.js"
import { Type, type Static } from "typebox"

export const ChangeEdgeOperatorRequestSchema = Type.Object({
    expressionId: UUID,
    sourceChildId: UUID,
    targetChildId: UUID,
    newOperator: LogicalOperatorType,
    sourceChecksum: Type.String(),
    targetChecksum: Type.String(),
})

export type TChangeEdgeOperatorRequest = Static<
    typeof ChangeEdgeOperatorRequestSchema
>

export const ChangeEdgeOperatorResponseSchema = Type.Object({
    snapshot: ArgumentEngineSnapshotSchema,
    created: Type.Array(PropositionalExpressionSchema),
    modified: Type.Array(PropositionalExpressionSchema),
    removed: Type.Array(UUID),
})

export type TChangeEdgeOperatorResponse = Static<
    typeof ChangeEdgeOperatorResponseSchema
>
