import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import {
    ARGUMENT_DESCRIPTION_MAX_LEN,
    ARGUMENT_TITLE_MAX_LEN,
    CLAIM_BODY_MAX_LEN,
    CLAIM_TITLE_MAX_LEN,
    MODERATION_REPORT_NOTE_MAX_LEN,
} from "../../consts/index.js"
import { MutableArgumentFieldsSchema } from "../model.js"
import {
    MutableClaimWriteFieldsSchema,
    MutableClaimFieldsSchema,
} from "../model/claims.js"
import { ReportContentRequest } from "../api/moderation/index.js"

const str = (n: number) => "x".repeat(n)

describe("stored free-text length caps", () => {
    it("accepts an argument title at the cap and rejects one over it", () => {
        const at = { title: str(ARGUMENT_TITLE_MAX_LEN) }
        const over = { title: str(ARGUMENT_TITLE_MAX_LEN + 1) }
        expect(Value.Check(MutableArgumentFieldsSchema, at)).toBe(true)
        expect(Value.Check(MutableArgumentFieldsSchema, over)).toBe(false)
    })

    it("accepts an argument description at the cap and rejects one over it", () => {
        const at = {
            title: "t",
            description: str(ARGUMENT_DESCRIPTION_MAX_LEN),
        }
        const over = {
            title: "t",
            description: str(ARGUMENT_DESCRIPTION_MAX_LEN + 1),
        }
        expect(Value.Check(MutableArgumentFieldsSchema, at)).toBe(true)
        expect(Value.Check(MutableArgumentFieldsSchema, over)).toBe(false)
    })

    it("accepts a claim title and body at the cap and rejects either over it", () => {
        const base = {
            title: str(CLAIM_TITLE_MAX_LEN),
            body: str(CLAIM_BODY_MAX_LEN),
            titleContentHash: "h",
        }
        expect(Value.Check(MutableClaimWriteFieldsSchema, base)).toBe(true)
        expect(
            Value.Check(MutableClaimWriteFieldsSchema, {
                ...base,
                title: str(CLAIM_TITLE_MAX_LEN + 1),
            })
        ).toBe(false)
        expect(
            Value.Check(MutableClaimWriteFieldsSchema, {
                ...base,
                body: str(CLAIM_BODY_MAX_LEN + 1),
            })
        ).toBe(false)
    })

    it("accepts a moderation note at the cap and rejects one over it", () => {
        const base = {
            targetType: "argument" as const,
            targetId: "00000000-0000-0000-0000-000000000001",
            reasonCode: "spam" as const,
        }
        expect(
            Value.Check(ReportContentRequest, {
                ...base,
                note: str(MODERATION_REPORT_NOTE_MAX_LEN),
            })
        ).toBe(true)
        expect(
            Value.Check(ReportContentRequest, {
                ...base,
                note: str(MODERATION_REPORT_NOTE_MAX_LEN + 1),
            })
        ).toBe(false)
    })

    it("leaves the stored claim shape uncapped so an over-length row still serializes", () => {
        // The caps guard writes. `MutableClaimFieldsSchema` is composed into
        // `NormalClaimSchema`, the read model validated on every response, so
        // capping it would turn a pre-existing long row into a read failure.
        expect(
            Value.Check(MutableClaimFieldsSchema, {
                title: str(CLAIM_TITLE_MAX_LEN + 1),
                body: str(CLAIM_BODY_MAX_LEN + 1),
                titleContentHash: "h",
            })
        ).toBe(true)
    })
})
