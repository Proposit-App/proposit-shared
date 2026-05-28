// Canonical error-body shapes shared by server entry routes. The first
// member is the 402 budget-exceeded contract emitted by every LLM-bearing
// entry route (build, twitter/reddit/raw_text import) when the caller's
// per-user token budget is exhausted. The discriminating `code` matches the
// task-level settle code used for mid-pipeline overruns (TaskStatus.FAILED
// with errorData.code === "TOKEN_BUDGET_EXCEEDED") so the client has one
// classifier across both surfaces — request-level (this body) and
// task-level. `usage` lets the client surface used / limit / resetOn to the
// user.

import { Type, type Static } from "typebox"

export const BudgetExceededErrorBodySchema = Type.Object({
    code: Type.Literal("TOKEN_BUDGET_EXCEEDED"),
    message: Type.String(),
    usage: Type.Object({
        used: Type.Integer({ minimum: 0 }),
        limit: Type.Integer({ minimum: 0 }),
        resetOn: Type.String({ format: "date-time" }),
    }),
})

export type TBudgetExceededErrorBody = Static<
    typeof BudgetExceededErrorBodySchema
>
