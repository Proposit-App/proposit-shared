# Spec — buildOriginExcerpt

## What it is

A pure function that turns a document and an anchor into the three pieces of a
readable excerpt: the quote, a little of the writing before it, a little after,
and two flags saying whether anything was actually dropped at either end.

```ts
export type TOriginExcerpt = {
    /** Context before the quote. `""` when the window trimmed away, or when
     *  the anchor starts the document. */
    before: string
    /** The anchored passage itself, whole. */
    quote: string
    /** Context after the quote. `""` on the same two conditions. */
    after: string
    /** Text was dropped before `before` — the caller renders a leading `…`. */
    elidedStart: boolean
    /** Text was dropped after `after`. */
    elidedEnd: boolean
}

export function buildOriginExcerpt(
    text: string,
    anchor: Pick<TCoreOriginAnchor, "startCodePoint" | "endCodePoint">,
    contextCodePoints?: number // default 60
): TOriginExcerpt
```

Lives in `src/engine/render/` and is exported from the existing
`./engine/render` subpath, beside `originPassagesFor`. No new `exports` entry.

## The rule

1. **Clamp the anchor.** `start = clamp(anchor.startCodePoint, 0, len)`,
   `end = clamp(anchor.endCodePoint, start, len)`, where `len` is
   `codePointLength(text)`. An out-of-range anchor yields a degraded excerpt, not
   a throw — `originAnchors` carries no constraint tying a span to its document's
   length, so this is a state the reading surface has to survive. (The server's
   `anchorsForTarget` already filters these out, so in practice the caller does
   not pass one; the clamp is here because this function cannot assume that
   caller.)

2. **Take the window.** `windowStart = max(0, start − contextCodePoints)`,
   `windowEnd = min(len, end + contextCodePoints)`. Slice all three pieces with
   `sliceByCodePoints`. A UTF-16 slice is wrong for any text containing an
   astral-plane character and passes every ASCII test.

3. **Snap inward to a word boundary — but only where the window actually cut.**
   Trim `before` from its *leading* edge up to and including the first whitespace
   run **only when `windowStart > 0`**; trim `after` from its *trailing* edge back
   to the last whitespace run **only when `windowEnd < len`**.

   The guard is not decoration. A window that reached offset 0 begins at the
   document's first character, not mid-word — trimming there would silently eat
   the opening word of the source text, and an anchor near the start is the
   commonest thing a reader selects.

   Inward, not outward. Outward — extending to take in the whole partial word —
   cannot be bounded without a second cap, because one "word" can be a
   200-character URL, and the source texts this reads are pasted articles.
   Inward costs at most one word and needs no cap.

   If a piece contains no whitespace at all — the window landed inside a long
   token — it trims to `""`. That is correct and honest: the elision flag still
   fires, so the reader sees `…` with no context, rather than half a URL.

4. **Set the flags.** `elidedStart = windowStart > 0`,
   `elidedEnd = windowEnd < len`. Note these describe the **window**, not the
   trim: an anchor at offset 0 gets `elidedStart: false` and therefore no leading
   `…`, which is the truth. A window that reached offset 0 but whose `before`
   trimmed to `""` also gets `false` — nothing was dropped that a reader would
   miss.

5. **Collapse whitespace** in all three pieces, `/\s+/g → " "`, then trim the
   outer edges of `before` and `after`. `normalizeOriginText` deliberately
   preserves internal whitespace and line breaks — the document is meant to be
   the original — but an excerpt renders in a small box where a paragraph break
   wastes the height. `originPassage` already collapses for the same reason.

   The quote is collapsed too. Collapsing changes no words, and a quote that
   spans a paragraph break otherwise reads as two fragments.

## Acceptance criteria

1. A mid-document anchor returns non-empty `before` and `after`, both flags
   `true`, and no word is cut at either outer edge.
2. An anchor at code point 0 returns `before: ""` and `elidedStart: false`.
2a. An anchor whose window reaches offset 0 without starting there keeps the
   document's **first word** in `before` — the word-boundary trim does not fire
   where the window did not cut.
3. An anchor ending at the last code point returns `after: ""` and
   `elidedEnd: false`.
4. A document whose leading context contains an astral character (📚) returns a
   `before` that ends at the same character a code-point slice would — i.e. the
   emoji is not split into surrogates.
5. Context whose window falls entirely inside a whitespace-free token returns
   `""` for that side with its elision flag still `true`.
6. A quote spanning a paragraph break returns a single-spaced `quote`.
7. An anchor whose `endCodePoint` exceeds the document length returns the text
   that exists, with no throw.
8. An anchor whose `startCodePoint` exceeds `endCodePoint` returns
   `quote: ""` with no throw.
9. `contextCodePoints: 0` returns `before: ""`, `after: ""`, and the flags still
   describing whether text exists either side.

## Out of scope

- Sentence-boundary awareness. `segments` on the document could support it, but a
  Mill sentence runs 80 words and the panel this feeds is height-capped anyway.
- Anything that reads or writes `prefix`/`suffix`.
- Any change to the anchor schema, the document schema, or persistence.

## Release

Folds into the **unpublished v0.56.0**. On landing: append to
`docs/changelogs/v0.56.0.md` and `docs/release-notes/v0.56.0.md`, rebuild, re-pack
the tarball the server consumes, and move the local `v0.56.0` tag to the new
HEAD — as was done for the origin-derivation fix already sitting in that version.
