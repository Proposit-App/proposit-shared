# Citation Modeling — proposit-shared agenda (sub-initiative #1)

## Capability changes

None. `proposit-shared` is a runtime-agnostic library with no `capabilities.md`. The initiative's user-facing capability (distinguish unparsed citations) is realized in `proposit-server` / mobile (#3), not here.

## Scope (sub-initiative #1, shared slice)

Adopt `proposit-core`'s new two-tier citation model. Authoritative spec: `/Users/brian/Projects/Proposit-App/docs/superpowers/specs/2026-06-16-citation-data-model-design.md` (read §1, the §2 shared bullet, and the §5 shared bullet). You author your own plan from it (`writing-plans`).

Changes:

1. **Re-export path move.** `src/schemas/model/references.ts` imports `@proposit/proposit-core/extensions/ieee` at **three** sites (the `export *` on line 3, plus the `IEEEReferenceSchemaMap` and `ReferenceTypeSchema` imports). Repoint all three to `@proposit/proposit-core/extensions/citations/ieee`. Then add `export * from "@proposit/proposit-core/extensions/citations/unparsed"` so consumers get `UnparsedCitationSchema` / `TUnparsedCitation` through `@proposit/shared/schemas/model/references`.
2. **Claim union.** `src/schemas/model/claims.ts`: `CitationClaimSchema.citation` goes from `Nullable(IEEEReferenceSchema)` to `Nullable(Type.Union([IEEEReferenceSchema, UnparsedCitationSchema]))` (import `UnparsedCitationSchema` from the new core unparsed subpath). The single `type` discriminant (33 IEEE literals + `"unparsed"`) keeps the union clean and `isCitationClaim` (keys on `type === "citation"`) is unaffected.
3. **Embedding text.** `src/utils/embedding-text.ts`: widen the param type to include `TUnparsedCitation`, **preserve** the existing legacy `case "Other"` branch, and change `case "UnparsedURL"` → `case "unparsed"` → return `text` (fallback `url`). Update its test.
4. Tests: `CitationClaim.citation` validates an IEEE ref **and** an unparsed citation and discriminates on `.type`; the embedding-text unparsed case.

## Consuming the unpublished core branch

The new core is on branch `citations/data-model-core` in worktree `/private/tmp/proposit-core-citations-core` (HEAD `d0d52e0`, built `dist/` present, version still `1.11.3`, **gated/unpublished**). Its new subpaths (`extensions/citations/{ieee,unparsed}`) do **not** exist in any published core. To build/test against it, temporarily link it in your shared worktree:

```
pnpm add file:/private/tmp/proposit-core-citations-core
```

This is a **DEV link only** — flag it in your report and do not treat the `file:` `package.json` pin as a deliverable. The real dep bump happens post-publish; the orchestrator runs the canonical tarball consumer-validation (ORCHESTRATOR-AGENTS.md §1) before any publish.

## Working agreement (single durable repo agent)

- You own this repo's #1 work end to end: author your plan (`writing-plans`), implement (TDD), run your **own** internal code-review subagent over the branch diff, integrate. Do not request a separate top-level reviewer.
- All work in an isolated worktree of `proposit-shared` (`using-git-worktrees`).
- `pnpm run check` is the gate; `verification-before-completion` before declaring done.
- **GATED STOP:** NO `pnpm version`, NO publish. Stop when shared is green against the linked core and your internal review is clean; report PUBLISH-readiness.
- Honor shared conventions: ESM `.js` import suffixes, brain-style naming, no co-authoring trailers, no flat root entry, `lib: ES2022` (no Node/DOM globals in `src/`).

## Report back

Worktree path + branch, per-task commits, final `pnpm run check` result, internal-review outcome, the core-link note (and whether `package.json` was left at `^1.7.0`), deviations, and status (DONE / DONE_WITH_CONCERNS / BLOCKED).
