export const TaskStatus = {
    // Task created but not yet started
    PENDING: 0,
    // Task is currently running
    IN_PROGRESS: 1,
    // Task has completed successfully
    COMPLETED: 2,
    // Task has failed
    FAILED: 3,
    // Task was pending or in progress, but was interrupted
    // likely by server shutdown
    INTERRUPTED: 4,
    // User-initiated cancel of a running task (distinct from INTERRUPTED's
    // server-shutdown meaning — this is a deliberate user action)
    CANCELLED: 5,
} as const

// Single source of truth for the "settled" (terminal) partition of task
// statuses. `isTaskSettled`/`isTaskNotSettled` derive from this set
// (`src/utils/tasks/utils.ts`), and server queries (e.g. `getUnsettledTasks`)
// can import it instead of hardcoding the list. INTERRUPTED is deliberately
// NOT settled — an interrupted task may resume.
export const SETTLED_TASK_STATUSES = [
    TaskStatus.COMPLETED,
    TaskStatus.FAILED,
    TaskStatus.CANCELLED,
] as const
