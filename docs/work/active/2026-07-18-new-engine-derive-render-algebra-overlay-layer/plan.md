# Plan — engine derive/render/algebra/overlay layer

Golden-first TDD. Every relative import ends in `.js`; no DOM/Node globals in
`dist` source. Comments carry technical rationale only — no slice/epic labels.

## 1. Golden fixtures (write first)

`src/engine/__tests__/derived-view-goldens.ts` — a shared fixture module exporting
a small set of realistic `TProjectReactiveSnapshot` + `TTextTreeItem[]` inputs
(reuse the EXPR_BASE/CLAIM_BASE builder pattern from `argument-metrics.test.ts`),
plus IEEE-reference sample objects. This module is exported so SV/MV can import the
same inputs to prove their swap. Golden *outputs* are captured inline in each
module's test via `toEqual` / `toMatchInlineSnapshot` (byte-identical strings).

## 2. Modules (port byte-identical from canonical sources per spec)

- `engine/derive/{counterargument,lone-conclusion,repairs,index}.ts`
  - shared `unwrapFormulaLayer` helper (server + mobile copies are identical).
  - `index.ts` re-exports the three files + `getClaimProofState`/`TClaimProofState`
    from `../argument-metrics.js`.
- `engine/render/{formula,markdown,text,citation,index}.ts`
- `engine/algebra/{changeset-merge,variable-symbol,index}.ts`
- `engine/overlay/{atv-items,ghosts,skeleton-overlay,index}.ts`

Convert every `@proposit/shared/...` import in the ported code to the shared-local
relative `.js` path. `describeSource`'s unused `capitalize` helper is dropped (it is
dead in the source too — verify with the compiler / lint no-unused).

## 3. Tests (co-located `__tests__/`)

One test per module proving byte-identical output on the golden inputs:
- derive: counterargument partition set, tab split, lone conclusion, repair set.
- render: formula string + legend, markdown string, plain-text string, citation
  labels (humanize map spot-checks, getInlineSourceLabel per representative type,
  describeSource, parseByline separators).
- algebra: merge bucket reconciliation (added∩modified, added∩removed,
  modified∩removed, roles/argument precedence), variable-symbol P..O + X-fallback.
- overlay: buildAtvEditableItems slot placement, applySkeletonOverlay empty-premise
  + wrap, nextSkeletonOperator cycles.

## 4. package.json exports

Add explicit `types`+`import`+`default` triples for `./engine/derive`,
`./engine/render`, `./engine/algebra`, `./engine/overlay` (directory index; the
`./engine/*` wildcard only resolves single files). Verify resolution from a Node
ESM consumer and an RN-style CJS `require`.

## 5. Nits + docs

- `engine.ts:546` + `mutations/premises.ts:1108`: `crypto.randomUUID()` →
  `globalThis.crypto.randomUUID()`.
- Taxonomy note via `tcw taxonomy` (import vs ingestion vocab). Prettify
  `docs/taxonomy/**` if it trips prettier.

## 6. Verify + cut

- `pnpm run check` green (typecheck + lint + test + build).
- `pnpm version minor` → 0.44.0; rotate release-notes/changelog upcoming → v0.44.0;
  fresh empty upcoming.md.
- Commit, `git tag v0.44.0`, `pnpm run build && pnpm pack`. Report tarball path +
  confirm packed peerDep reads `^3.0.0`.
- HARD STOP: no publish, no push.

## 7. Folded item A — stance optimistic math (golden-first port)

- Append stance goldens to `src/engine/__tests__/derived-view-goldens.ts`
  (start state, scripted op sequence, floor-case start; structurally typed).
- Locked test `src/engine/optimistic/__tests__/claim-stance-state.test.ts` → RED.
- Port `src/engine/optimistic/claim-stance-state.ts` byte-identical from mobile
  (rewrite only the two import paths to shared-local `.js`); re-export the five
  symbols from `optimistic/index.ts` → GREEN.

## 8. Folded item B — publish/archive conflict envelope (test-first)

- Schema test `src/schemas/api/__tests__/mutation-conflict.test.ts` + guard test
  `src/api-client/__tests__/mutation-conflict.test.ts` → RED.
- Add `src/schemas/api/mutation-conflict.ts` (schema + types) and
  `src/api-client/mutation-conflict.ts` (`isMutationConflictError`, re-exported
  from `api-client/index.ts`); add the `./schemas/api/mutation-conflict` exports
  triple to `package.json` → GREEN.
- Record server-emit shape + mobile-consume snippet in outcome.md (no
  server/mobile edits).

## 9. Re-cut UNRELEASED v0.44.0 in place

0.44.0 was never published/pushed. Do NOT bump to 0.45.0. Delete the local tag,
append both items to `docs/{release-notes,changelogs}/v0.44.0.md`, commit, re-tag
`v0.44.0` at the new HEAD, rebuild + re-pack (overwriting the prior tarball).
HARD STOP: no publish, no push, no tag push.
