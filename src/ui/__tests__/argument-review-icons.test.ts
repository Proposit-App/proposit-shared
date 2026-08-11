import { describe, test, expect } from "vitest"
import { REVIEW_ICON_NAMES } from "../argument/review/icons.js"

describe("REVIEW_ICON_NAMES", () => {
    // A repeated name collapses the derived union with no other signal: the
    // clients' `satisfies Record<TReviewIconName, …>` maps still compile, one
    // concept short.
    test("has no duplicate entry", () => {
        expect(new Set(REVIEW_ICON_NAMES).size).toBe(REVIEW_ICON_NAMES.length)
    })
})
