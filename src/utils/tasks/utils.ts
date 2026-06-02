import { SETTLED_TASK_STATUSES } from "../../consts/index.js"
import type { TTask } from "../../schemas/tasks.js"

// Derived from the single source of truth in `consts/task-status.ts` so the
// settled partition has ONE definition. Adding a status to SETTLED_TASK_STATUSES
// widens both helpers automatically.
const settledStatuses = new Set<number>(SETTLED_TASK_STATUSES)

export function isTaskSettled(t: TTask): boolean {
    return settledStatuses.has(t.status)
}

export function isTaskNotSettled(t: TTask): boolean {
    return !settledStatuses.has(t.status)
}
