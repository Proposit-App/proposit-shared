# Plan: Promote the origin-authoring decision helpers into @proposit/shared

A move, so the test comes over first and must fail on a module that does not
exist yet.

## Task 1 — Port the suite, against a module that is not there

`src/engine/__tests__/origin-authoring.test.ts`, ported from
`proposit-server/src/app/view/[argumentId]/[version]/util/__tests__/origin-authoring.test.ts`
with its assertions intact, plus new cases for the two functions the server
suite does not reach:

- `allAnchorsForTarget` — returns every anchor recorded against a target,
  including one whose span no longer addresses the document (the authoring
  surface has to be able to remove exactly the anchor the reading surface
  refuses to draw).
- `isAttributionEditable` — `null`, `undefined`, an `unparsed` reference, a
  parsed IEEE reference.

**Fixtures are local to the test file.** The server's `origin-fixtures.ts` is
shared with its view-model suite, which does not come over; this repo's existing
`src/engine/__tests__/origin-fixtures.ts` stands up a real engine, which is
machinery none of these seven functions has any use for, and
`src/engine/render/__tests__/origin-runs.test.ts` already set the precedent of a
hand-built origin slice for exactly that reason. Port `snapshotWith` and
`premiseWithVariable` (which `origin-runs.test.ts`'s local copy lacks — it has no
premises or variables).

**Fails for the right reason first:** the import path does not resolve, so the
file cannot even load. Confirm before writing the module.

## Task 2 — The module

`src/engine/origin-authoring.ts`. Seven exports plus the private
`premiseHolding`. Bodies copied unchanged; only the import paths move
(`./engine.js`, `../schemas/model/origin.js`) and `isAttributionEditable`'s
parameter widens to `TOriginDocument["reference"] | null | undefined`.

Comments come over as written — they carry the reasoning (why only a claim-bound
variable is markable, why an empty selection is absence rather than an error) and
that reasoning is what a second consumer most needs. One edit: the module
docstring's pointer to `origin-view-model.ts` becomes a pointer to
`./render/origin-runs.js`, since the file it named does not exist in this repo.

No `package.json` change — `./engine/*` already reaches it.

**Verified by:** Task 1's cases pass.

## Task 3 — Confirm the subpath actually resolves

After `pnpm run build`, resolve `@proposit/shared/engine/origin-authoring`
through the real `exports` map rather than assuming the wildcard covers it.

## Task 4 — Green the pipeline

`pnpm run check`.

## Documentation Sync

- **`AGENTS.md` — does not fire.** It lists `./engine/*` as a file-flavoured
  wildcard sub-path without enumerating its members, so one more member changes
  nothing it asserts.
- **Release notes / changelog** — deferred to the version cut at epic closeout.

## Verification

Covered: all seven functions, including the astral-plane divergence and the
empty/backwards span cases the escalation named.

Not covered, and recorded as such rather than implied:

- **That the server's existing suite passes against the shared import.** It
  cannot be run from here — the server has to repin first. What is done instead
  is stronger than re-running it would be cheap: its cases are ported verbatim,
  so a behaviour change breaks them here.
- **That `isAttributionEditable` and the server's `isAttributionProvisional`
  still agree.** The two live in different repos and no test can span them until
  the server adopts this function. The ported case pins the shared side against
  the rule as the server writes it; the durable fix is the follow-up.
- **That mobile's copy is really identical.** Mobile's file is on an unmerged
  branch and was not readable at this repo's HEAD. Its deletion is the mobile
  slice's own step.
