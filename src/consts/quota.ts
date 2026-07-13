/** `errorData.code` set on a run/stage/task aborted because the global
 * AI-budget breaker tripped. Consumers key their "AI temporarily
 * unavailable" breaker UI off a match against this code. */
export const AI_QUOTA_ABORT_CODE = "AI_QUOTA_EXHAUSTED" as const
