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
} as const
