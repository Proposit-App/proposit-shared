# Release notes — upcoming

## A review that saves itself as you leave no longer throws into the void

The review wizard saves the reviewer's work 200 ms after each answer, so a
burst of edits costs one write instead of ten. If the page went away inside
that window — a navigation, an unmount, a server-side render, a test
environment shutting down — the save had nothing left to write to, and the
resulting failure escaped with no one listening. In an app that surfaces as an
unexpected `unhandledrejection`; in this repo's own suite it was an
intermittent test run that exited non-zero with every test passing.

Storage simply not being there is now treated as what it is: expected, and
nothing the app can act on. It is discarded quietly. A save that fails for a
real reason — the browser's storage quota is full, the state would not
serialize — is still reported, now as a `console.warn` reading
`review-engine: persist failed`, so a genuine persist failure does not
disappear along with the benign case.

Nothing exported changed, and the two evaluation paths that save and wait
(`runEvaluation`, `runValidityCheck`) still surface their failures to the
caller as before.

## One shared answer to "is this source text too long to read in place?"

A source text of any real length is unreadable embedded in an argument, and the
two apps disagreed about where "long" begins — the mobile app clamped at 600
characters, the web app had no threshold at all. Both now ask the same question
of the same rule:

```ts
import {
    isLargeOriginDocument,
    LARGE_ORIGIN_DOCUMENT_CODE_POINTS,
} from "@proposit/shared/engine/render"

isLargeOriginDocument(document.text) // → true past 1500 code points
```

**The unit is code points, not words.** A whitespace word count cannot see a
script that does not put spaces between words: a 40,000-character Chinese or
Japanese source text scores as roughly one word and would render in place, which
is the failure the threshold exists to prevent, in the case where it is worst.
Code points are also what the rest of the origin surface already counts —
anchors, offsets, excerpt context — so there is no second unit to keep in step.

1500 code points is roughly 260 words of English; the curated source texts in
this package run 5.3–6.0 characters per word. The four of them measure 15,561 to
97,032 characters, so every one is well past the line. The counting goes through
`codePointLength` rather than `String.prototype.length`, so an emoji-dense
document is not measured at twice its real size.

Moving the line is a one-line change to one constant.

## `buildOriginRuns` and `anchorsForTarget` are now importable

`@proposit/shared/engine/render` exports the two functions that turn a snapshot's
source text and its anchors into something a reading surface can paint:

```ts
import {
    anchorsForTarget,
    buildOriginRuns,
    type TOriginRun,
} from "@proposit/shared/engine/render"

buildOriginRuns(snapshot)
// → [{ text: "Socrates", anchorIds: ["a1", "a2"], targetIds: ["e1", "e2"] },
//    { text: " is mortal.", anchorIds: [], targetIds: [] }]

anchorsForTarget(snapshot, expressionId) // → the anchors recorded against one target
```

`buildOriginRuns` splits the document into ordered runs, each either plain or
covered by one or more anchors. Anchors sharing a span collapse into one run and
overlapping spans **merge rather than nest** — a highlight inside a highlight is
nothing a reader can act on, and a claim used in two premises is anchored at both
of its expressions, so overlap is the common case. Every slice is by code point,
so an astral character is never cut in half.

`anchorsForTarget` applies the same span-validity filter, so both ends of the
pairing agree on what an anchor is: an anchor whose span leaves the document
produces neither a highlight nor a cue advertising one.

Both were previously the web app's own, which left the mobile app unable to
highlight or sequence traced passages without a second copy of the same
code-point arithmetic.

## Repinning

Purely additive. No signature changed, no schema changed, and the new exports sit
on the existing `./engine/render` subpath. Also carries the review-persist fix
above, which changed no export.
