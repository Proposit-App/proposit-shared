# Spec — Render the representation stance in the markdown export and export the passage renderer

## Capability changes

**Changed:** `arguments/copy-to-clipboard` (`cap-778431`, Status `Missing`,
Feature `argument-browse`). The sibling slice
(`2026-07-31-quote-origin-passages-in-the-markdown-export`) made its body say the
export carries the anchored source passages. It now also has to say the export
states, when the author claims it, that the argument represents the source text
faithfully. Recorded in this item's `capabilities.yaml` under `changed:` in the
bare `arguments/…` path form — a `shared/…` prefix makes `tcw work complete`
fail closed.

No new capabilities. Status stays `Missing`: this node produces the string; the
surfaces that let a user *invoke* the copy live in server and mobile.

## Problem

### 1. The stance is invisible to readers

`stance` on the origin link is `representation | seed`. `representation` is a
public claim that the argument faithfully represents its source text; `seed`
means the author merely used the text as a starting point. That distinction is
the point of the feature.

It renders in exactly one place: the web app's author-gated editing panel
(`proposit-server/.../controls/origin-authoring-panel.tsx`), whose two options
read "A representation" / "A starting point" with help text. A reader never sees
either. The markdown export reads `snapshot.origin.document` and
`snapshot.origin.anchors` and never reads `snapshot.origin.link` at all, so
someone handed the markdown cannot tell a faithful representation from a loose
jumping-off point.

### 2. The passage renderer is copied, not shared

`ORIGIN_LEAD` and `originPassage` are module-private in
`src/engine/render/markdown.ts`. `proposit-mobile` carries a byte-identical copy
in `src/arguments/argument-inspect.ts`, kept in step only by a comment that
states the contract it cannot enforce ("Kept identical so the exported document
and the screen say the same thing"). Escalation
`2026-07-31-export-the-origin-passage-renderer-from-the-render-module` (root
inbox) asks for the export; folded into this item rather than tracked
separately, since both changes touch the same twenty lines.

There is no drift today — the copies were verified identical. This is filed
before it happens.

## Goals

- An exported argument whose origin link carries stance `representation` states
  the fidelity claim, in plain language, once, near the source attribution.
- An exported argument with stance `seed` emits nothing extra.
- An exported argument with no origin document is **byte-identical to before this
  change**.
- `originPassagesFor` is exported from `@proposit/shared/engine/render`, so
  mobile deletes its copy and server never grows a third.

## Non-goals

- **No wording contract with the other surfaces.** Web and mobile add their own
  reader-visible indicators in parallel; they match the *meaning*, and will not
  import this string. Exporting the sentence would over-fit an export voice
  ("This argument…", full stop, blockquote line) onto a chip or a badge.
- No offsets, no jargon, no stance vocabulary in the reader-facing string. A
  reader has never seen the words "stance", "representation", or "seed"; the
  export states the claim, it does not name the enum.
- No new package `exports` subpath. `./engine/render` already exists and already
  declares `types` / `import` / `default`.
- No change to `serializeArgumentText` (the plain-text export). It takes a
  header + items pair, not a snapshot, so it cannot reach origin data at all —
  widening its signature is a separate call, unchanged from the sibling slice's
  reasoning.
- No behaviour change to `originPassage` itself. The extraction is
  behaviour-preserving; the existing goldens prove it.

## Design

### The stance line

Emitted inside the existing `if (originDocument)` block in `renderHeader`, so it
rides in the same blockquote as the version line and the origin passages, and so
it cannot dangle: a stance with no document to be faithful *to* says nothing
worth saying.

Wording:

> This argument sets out to represent that text faithfully.

"sets out to" rather than "does" because the stance is the author's claim, not a
verified fact — the same hedge the authoring panel's help text carries. "that
text" rather than "the origin text" because the preceding line has already named
the source, either by quoting a whole-argument passage or by naming the
reference.

Placement: last line of the header blockquote, after the passage/attribution
lines. The passages establish *what* text; the stance then qualifies the
relationship to it.

`seed` emits nothing. It is the default an author never has to choose, and a
line saying an argument does not claim fidelity is noise on the overwhelming
majority of exports.

### The stance read

```ts
snapshot.origin?.link?.stance === "representation"
```

`origin` is optional and `link` within it is `T | undefined` (a snapshot
rehydrated from wire data written before origin data existed omits the slice
entirely), so both hops optional-chain. No `?? "seed"` default is needed — the
comparison against the one interesting value already treats every other state as
`seed`, which is the correct fallback.

### The exported renderer

Two functions move from module-private to exported, both staying in
`markdown.ts` (the file is private; `engine/render/index.ts` is the public path,
so a consumer never sees which module the function was authored in — and a new
file for twenty lines buys nothing):

```ts
export function originPassage(anchor: Pick<TOriginAnchor, "exact">): string
export function originPassagesFor(
    snapshot: Pick<TProjectReactiveSnapshot, "origin"> | undefined,
    targetId: string
): string[]
```

Only `originPassagesFor` is re-exported from `engine/render/index.ts` — the
escalation's preferred shape, on the grounds that the optional-`origin` chaining
discipline is itself worth centralising, and that a consumer that gets it wrong
crashes on any pre-origin snapshot. `getInlineSourceLabel` and `describeSource`
are already exported from there for the same reason, so this follows an
established precedent rather than inventing one.

Parameter type notes:

- `Pick<TProjectReactiveSnapshot, "origin"> | undefined` rather than the full
  snapshot. Mobile's calling type is `Pick<TProjectReactiveSnapshot, "premises"
  | "origin">` and its call sites pass `| undefined`; a full-snapshot signature
  would force mobile to keep a wrapper, which is the copy this change exists to
  delete. A full snapshot satisfies the narrower type, so nothing is lost.
- `Pick<TOriginAnchor, "exact">` on `originPassage` so a caller holding only the
  quoted text (a test fixture, a projection) need not synthesise a whole anchor.

`anchorsFor`, the third private helper, is subsumed: `renderHeader` and
`renderLogic` call `originPassagesFor` and it goes away.

## Acceptance criteria

- [ ] Stance `representation` with an origin document: the export contains the
      fidelity sentence exactly once.
- [ ] Stance `seed` with an origin document and anchors: the export contains no
      fidelity sentence, and is otherwise unchanged from today's golden.
- [ ] No origin document at all: the export is byte-identical to the no-origin
      golden. Pinned by the existing test asserting the empty-origin snapshot and
      the plain golden serialize to the same string, plus the plain golden's own
      inline snapshot.
- [ ] `originPassagesFor` is importable from `@proposit/shared/engine/render`.
- [ ] `originPassagesFor(undefined, id)` and a snapshot with no `origin` slice
      both return `[]` rather than throwing.
- [ ] `originPassagesFor` collapses whitespace across newlines and trims.
- [ ] The tarball resolves `originPassagesFor` under both the ESM `import`
      condition and the CJS `default` condition.
- [ ] `pnpm run check` passes.

## Risks

- **The byte-identity guard.** The sibling slice's stray-empty-section bug is the
  reason that assertion exists. Emitting the stance line outside the
  `if (originDocument)` guard, or defaulting the stance to a rendered value,
  reintroduces it. Mitigated by keeping both existing no-origin assertions
  untouched and running them against the new code.
- **Purely additive?** Yes for the export surface —
  `serializeArgumentToMarkdown`'s signature and `originPassage`'s behaviour are
  unchanged, and `originPassagesFor` is a new named export on an existing
  subpath. The *output* of the export changes for arguments that already carry a
  `representation` link, which is the point of the change and not an API break.
