
# Origin data schemas, mutations, and capability master

Epic: [Argument origin data and enthymeme annotations](tcw://W/proposit-app/2026-07-29-argument-origin-data-and-enthymeme-annotations)

Slice **C** of the epic. Ships in **one** `@proposit/shared` release together with
the sibling slice *Quote origin passages in the markdown export* (J), which
depends on this one in code — do not start J first.

**Blocked by:** the `@proposit/proposit-core` release carrying the epic's slice A
(*Origin data library and enthymeme annotation*).

---

## Problem

Core will hold the origin-data model, but neither consumer app can reach it:
there are no app-level schemas over it, no mutation functions to change it, no
API bodies or client methods to move it across the wire, and no derivation of the
two things the product actually shows — enthymeme *suggestions* and the
*contradiction* warning.

## What changes

**1. Schemas.** Re-export and app-extend the new core schemas under
`src/schemas/model/`, following `claims.ts` / `citations.ts`, which compose core
literals into app shapes (`src/schemas/model/claims.ts:1-19`). Add API body
schemas under `src/schemas/api/argument/` for attach / set-stance / anchor /
mark / attribute.

**2. Origin data on the reactive snapshot.** `TProjectReactiveSnapshot`
(`src/engine/engine.ts:62-71`) already extends core's reactive snapshot with
`claims`, `citations`, and `validationIssues`. Add the origin slice the same way,
so every existing consumer — web view, mobile view, markdown export — reads it
from the snapshot they already hold. **This is what makes slice J a one-function
change and the two reading surfaces symmetric; get it right here.**

**3. Mutations.** Follow the idiom in `src/engine/mutations/` — a function taking
the engine, calling engine methods, returning `ProjectChangeset` where the
propositional tables are touched (`mutations/claims.ts`, `mutations/types.ts`).
Note the split:

- `enthymeme` lives on premises and expressions, which **are** changeset
  entities → those mutations return a changeset and persist through
  `persistChangeset`.
- Origin documents, links, and anchors are a separate library → they follow the
  `claimCitations` precedent and persist through their own model surface, not
  the changeset.

Say which is which in the mutation JSDoc; the server slice depends on the
distinction and the engine-driven-persistence rule makes getting it wrong a
review failure.

**3a. Two new tier limits.** Extend `UserTierLimits`
(`src/consts/user-tiers.ts:20-51`) — it already carries `maxArguments`,
`maxStatementsPerArg`, `maxCitationsPerArg`, `maxTokensPerMonth`, so this is a
new entry in an existing structure, not a new mechanism:

- `maxSourceTextChars` — per document, measured on the **normalized** text.
- `maxStoredSourceTextChars` — aggregate across one user's documents.

Pick values per tier alongside the existing ones (`UNVERIFIED` is 0 across the
board and should stay 0 here). Shared owns the numbers; the server owns
enforcement, on a single write path both the import and manual-attach routes
call.

**4. Derivation — the product logic.** Runtime-agnostic, pure over the snapshot,
in `src/engine/`:

- **Suggestions.** Under stance `representation`, unanchored claim expressions
  and premises produce enthymeme *suggestions*. Under `seed`, and when there is
  no document, produce **zero**. Suggestions mutate nothing.
- **Contradiction.** Content both anchored and marked unspoken is reported under
  `representation`.

**The governing invariant: an enthymeme is declared, never derived.** No code
path may mark content unspoken without an explicit human action. Stance governs
only whether *absence* is meaningful — provenance highlighting works under either
stance, because "this came from here" is true regardless.

**5. API client.** Add the client functions under `src/api-client/argument/`,
registered in `factory.ts`, using `strictFetch`. If any new coded error envelope
is introduced, it needs a matching detection branch in `parseResponse` at the
root normalizer — a schema plus a type guard alone leaves the guard unreachable.

**6. The capability master — nine new entries, two changed.** This slice owns
them; no other node may declare them. Seed every new entry `Status: Missing` (a
runtime-agnostic library asserts no support of its own) and set the `Planning
doc` back-pointer.

```bash
tcw capabilities add arguments/see-the-original-source-text   "See the original source text"        --status Missing
tcw capabilities add arguments/see-where-content-came-from    "See where argument content came from" --status Missing
tcw capabilities add arguments/see-what-goes-unspoken         "See what an argument leaves unspoken" --status Missing
tcw capabilities add arguments/see-the-source-texts-citation  "See the source text's citation"       --status Missing
tcw capabilities add authoring/attach-a-source-text           "Attach a source text"                 --status Missing
tcw capabilities add authoring/link-content-to-the-source     "Link argument content to the source text" --status Missing
tcw capabilities add authoring/declare-the-sources-role       "Declare the source text's role"       --status Missing
tcw capabilities add authoring/mark-content-as-unspoken       "Mark content as unspoken"             --status Missing
tcw capabilities add authoring/attribute-the-source-text      "Attribute the source text to a real source" --status Missing
```

Then `--field "Planning doc=2026-07-29-argument-origin-data-and-enthymeme-annotations"`
on each, `Feature=argument-browse` on the four `arguments/*` entries and
`Feature=argument-authoring` on the five `authoring/*` entries.

Changed, to be reworded rather than created: `authoring/import-from-source`
(`cap-4cac18`) — an import now also retains the source text and the provenance
the pipeline derives, and a platform import fills in the citation with no prompt;
stance is seeded `seed`, never `representation`. And `arguments/copy-to-clipboard`
(`cap-778431`) — reworded by slice **J**, not here.

## Verification

- `pnpm run check`.
- Suggestion/contradiction derivation unit-tested across the full matrix: no
  document; `seed` + unanchored; `representation` + unanchored; `representation`
  + anchored-and-marked. Zero suggestions in the first two.
- A test asserting no derivation path ever writes an `enthymeme` value.
- `tcw capabilities check` passes with the nine new entries.
- `lib: ["ES2022"]` holds — no DOM or Node-only access in anything reaching
  `dist/`.

## Documentation Sync (expected to fire)

- `README.md` [Public-API] — new sub-path exports. Every new subpath in
  `package.json` `exports` declares `types`, `import`, **and** `default`; the
  mobile CJS resolver needs the third.
- `docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md`.

## Consumer impact

- `proposit-server` — persistence, REST, ingestion capture, and both web surfaces
  (slices D, E, F, G) build directly on this slice.
- `proposit-mobile` — the read-only surface (slice H) consumes this snapshot
  extension and slice J's export.

Both shared slices ship in **one** release. Consumer-side tarball validation runs
before `pnpm publish` and is coordinated at the workspace root — do not publish
from this node. Verify installs **by content** (assert a new export exists in
`node_modules/@proposit/shared/dist/**`), never by version string, which a rebuild
leaves unchanged.

Mobile is behind on its shared and core pins. That drift is pre-existing and is
not a regression from this epic — do not block the publish on mobile's consumer
gate.
