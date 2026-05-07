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
    // In proposit-core@0.11+, the engine's internal PremiseEngine strips
    // extra fields (role, title, creatorId, createdOn) before computing
    // premise checksums — only the 4 core fields (argumentId, argumentVersion,
    // type, derivedClaimId) are hashed. Matching the DEFAULT_CHECKSUM_CONFIG
    // premise fields here ensures client (PropositArgumentEngine) and server
    // agree on premise checksums regardless of what extra fields are present.
    // premiseFields intentionally omitted: falls back to DEFAULT (4 core fields)
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
