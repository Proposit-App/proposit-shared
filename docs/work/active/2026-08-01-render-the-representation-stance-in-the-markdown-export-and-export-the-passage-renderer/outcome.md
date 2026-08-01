# Outcome — Render the representation stance in the markdown export and export the passage renderer

## What shipped

### 1. The fidelity claim in the export

`renderHeader` in `src/engine/render/markdown.ts` emits one line, inside the
existing `if (originDocument)` block, after the passage and attribution lines:

```
> The author says this argument represents that text faithfully.
```

Emitted only when `snapshot.origin?.link?.stance === "representation"`. `seed`
emits nothing, as specified — no disclaimer, no empty line.

Three deliberate choices, each recorded as a comment on the constant or the
branch rather than here:

- **"The author says…"** — nothing verifies the claim, so a reader should know
  whose assertion it is rather than infer it from a turn of phrase. Standardised
  across all three surfaces (mobile shipped this wording first, web is being
  changed to match), so exporting an argument and then opening it on a phone
  does not present two different-sounding claims. This was a coordinator
  correction to an earlier draft that hedged with "sets out to" instead.
- **"that text"** — the preceding line has already named the source, either by
  quoting a whole-argument passage or by naming the reference, so the sentence
  does not re-introduce it.
- **Guarded on the document, not the link.** A fidelity claim about a source the
  export never names says nothing to a reader. This is the guard the
  `documentless` fixture exists to pin.

No stance vocabulary reaches the reader: the words "stance", "representation",
and "seed" appear nowhere in the output.

### 2. `originPassagesFor` exported

```ts
export function originPassagesFor(
    snapshot: Pick<TProjectReactiveSnapshot, "origin"> | undefined,
    targetId: string
): string[]
```

Re-exported from `src/engine/render/index.ts`. `originPassage` became a
file-level export too but is deliberately **not** on the public surface — no
consumer has asked for the bare-anchor form, and `originPassagesFor` is the
shape the escalation preferred precisely because it absorbs the optional-`origin`
chaining that a consumer getting it wrong crashes on.

`anchorsFor` is gone; both former call sites (`renderHeader`, `renderLogic`) go
through the exported function, so the export and every reading surface are the
same code by construction rather than by comment.

The parameter is a `Pick`, not the full snapshot, so `proposit-mobile` can pass
its `TProvenanceSnapshot` (`Pick<…, "premises" | "origin">`) and its
`| undefined` call sites directly — without that, mobile would keep a wrapper,
which is the copy this change exists to delete.

No `package.json` change: `./engine/render` already existed and already declared
`types` / `import` / `default`.

## Shipped behaviour is ahead of the capability ledger

This item records `arguments/copy-to-clipboard` as `changed:`, which covers the
export. It does **not** cover the reading-side capability the stance now needs —
that a reader can see whether an argument claims to represent its source
faithfully. Three separate inbox requests describe that one gap (this node's, the
mobile agent's, and the server agent's), filed independently for the same
finding. The orchestrator is merging them before adoption; they are deliberately
untouched here.

Until that lands, the shipped behaviour is ahead of the ledger: the export states
the claim, and no capability entry yet says a reader can see it.

## Escalation folded in

`2026-07-31-export-the-origin-passage-renderer-from-the-render-module` (filed by
`proposit-mobile`, root inbox) is satisfied by change 2 in its preferred shape.
Folded into this item rather than tracked separately — both changes touch the
same twenty lines. Every test case it asked for is covered. The inbox doc itself
lives in the root repo and is the orchestrator's to clear.

Its "Related" note — `TTextTreeItem`'s `operator` variant carrying no
`expressionId` — is explicitly out of scope there and here; a separate root-inbox
item already tracks it.

## Verification

`pnpm run check` — clean. 115 test files, 1118 tests, all passing; typecheck,
prettier, eslint, and build all green.

### Byte-identity

The guard that mattered. Rather than trusting the inline snapshot alone, the
pre-change renderer was checked out from `8db4625` (the v0.55.0 cut) alongside
the new one and both were run over the same fixtures:

```
IDENTICAL  no origin slice at all                 (429 bytes)
IDENTICAL  origin slice present but empty         (429 bytes)
IDENTICAL  representation link, no document       (429 bytes)
IDENTICAL  document + anchors, stance seed        (608 bytes)
```

The fourth is the one worth noting: a full origin document with three anchors
under stance `seed` exports byte-identically to before, so the change is inert on
everything except the stance it was asked to surface.

### Tarball resolution

`pnpm pack` into a scratch directory (never the package root — a stray `.tgz`
there makes a later `pnpm publish` fail with `EUSAGE`), installed into a
throwaway consumer, then resolved under both conditions:

- **ESM** (`import` condition): `originPassagesFor` is a function; returns `[]`
  for `undefined`; collapses a newline-spanning passage to one line.
- **CJS** (`default` condition): a `.cjs` module resolves with conditions
  `["require", "node"]`, so the `import` branch *cannot* match and only `default`
  can. `require.resolve` landed on `dist/engine/render/index.js`, and the module
  behaved identically.

Resolution, not a read of the exports map — three conditions being present is
not proof a resolver finds the file.

## Tests added

In `src/engine/__tests__/derived-view.test.ts`:

- `seed` emits no fidelity sentence, and equals the `representation` output with
  that one line removed. Asserting the *relationship* rather than a second full
  inline snapshot, so the two fixtures cannot drift apart in anything but stance.
- A `representation` link with no document renders nothing extra.
- `originPassagesFor` returns `[]` for `undefined`, for a snapshot with no
  `origin` slice, for an empty slice, and for an unknown target.
- `originPassagesFor` collapses whitespace across a newline and trims.

Two existing expectations changed, each by exactly one line, reviewed by hand
rather than `vitest -u`. Every no-origin assertion was left untouched and stayed
green.

New fixtures in `derived-view-goldens.ts`: `seedOriginGoldenSnapshot` (built by
mutating the existing origin fixture's link, so only the stance can differ) and
`documentlessOriginGoldenSnapshot`. `originLink` took a defaulted stance
parameter, so no existing caller changed.

## Is it purely additive?

Yes. `serializeArgumentToMarkdown`'s signature is unchanged, `originPassage`'s
behaviour is unchanged, and `originPassagesFor` is a new named export on an
existing subpath. Nothing breaks on repinning.

The export's *output* changes for arguments that already carry a `representation`
link — which is the change that was asked for, not an API break.

## Not done here

Version bump, tag, publish, push — the release is cut separately. The core pin is
untouched. Mobile deleting its copy is mobile's adoption, gated on this
publishing.
