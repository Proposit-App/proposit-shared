# Changelog — upcoming

<!-- Add changelog entries here -->

## Added

- Moderation report + block API contract (`@proposit/shared/schemas/api/moderation`
  + api-client methods `reportContent`, `blockUser`, `unblockUser`, `getMyBlocks`):
  `ReportContentRequest`/`Response` (with a closed `ReportReasonCode` union — spam,
  harassment, hate, sexual-content, violence, misinformation, other),
  `BlockUserRequest`/`Response`, and `GetBlocksResponse`. Cross-platform contract
  for the mobile moderation UI + server moderation API (server routes land in the
  consumer slice). Additive.
