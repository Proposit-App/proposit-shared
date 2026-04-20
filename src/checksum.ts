import { createChecksumConfig } from "@proposit/proposit-core"

export const CHECKSUM_CONFIG = createChecksumConfig({
    expressionFields: new Set(["premiseId", "createdOn", "creatorId"]),
    variableFields: new Set([
        "claimId",
        "claimVersion",
        "boundPremiseId",
        "boundArgumentId",
        "boundArgumentVersion",
        "createdOn",
        "creatorId",
    ]),
    premiseFields: new Set([
        "argumentId",
        "argumentVersion",
        "role",
        "createdOn",
        "creatorId",
        "title",
    ]),
    argumentFields: new Set([
        "title",
        "published",
        "creatorId",
        "createdOn",
        "publishedOn",
        "forkId",
        "digest",
        "description",
    ]),
})
