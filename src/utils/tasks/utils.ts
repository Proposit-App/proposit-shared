import { TaskStatus } from "../../consts/index.js"
import type { TTask } from "../../schemas/tasks.js"

const settledStatuses = new Set<number>([
    TaskStatus.COMPLETED,
    TaskStatus.FAILED,
])

export function isTaskSettled(t: TTask): boolean {
    return settledStatuses.has(t.status)
}

export function isTaskNotSettled(t: TTask): boolean {
    return !settledStatuses.has(t.status)
}
