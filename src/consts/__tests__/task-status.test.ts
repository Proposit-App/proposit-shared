import { describe, expect, it } from "vitest"
import { SETTLED_TASK_STATUSES, TaskStatus } from "../index.js"

describe("TaskStatus", () => {
    it("assigns CANCELLED the next free numeric value (5)", () => {
        expect(TaskStatus.CANCELLED).toBe(5)
    })

    it("keeps the pre-existing status values stable", () => {
        expect(TaskStatus.PENDING).toBe(0)
        expect(TaskStatus.IN_PROGRESS).toBe(1)
        expect(TaskStatus.COMPLETED).toBe(2)
        expect(TaskStatus.FAILED).toBe(3)
        expect(TaskStatus.INTERRUPTED).toBe(4)
    })
})

describe("SETTLED_TASK_STATUSES", () => {
    it("is the single source of truth for the settled partition: COMPLETED, FAILED, CANCELLED", () => {
        expect([...SETTLED_TASK_STATUSES].sort((a, b) => a - b)).toEqual([
            TaskStatus.COMPLETED,
            TaskStatus.FAILED,
            TaskStatus.CANCELLED,
        ])
    })

    it("excludes the non-terminal statuses (PENDING, IN_PROGRESS, INTERRUPTED)", () => {
        expect(SETTLED_TASK_STATUSES).not.toContain(TaskStatus.PENDING)
        expect(SETTLED_TASK_STATUSES).not.toContain(TaskStatus.IN_PROGRESS)
        expect(SETTLED_TASK_STATUSES).not.toContain(TaskStatus.INTERRUPTED)
    })
})
