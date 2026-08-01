# Release notes — upcoming

## The representation stance reaches the reader

An argument's origin link records whether the author is claiming to reproduce
the source text faithfully (`representation`) or merely started from it
(`seed`). Until now that decision surfaced in exactly one place — the web app's
author-gated editing panel — so a reader handed a copied argument could not tell
the two apart. That distinction is the point of the feature.

The markdown export now says it. When the link's stance is `representation`, the
header blockquote carries:

> The author says this argument represents that text faithfully.

`seed` emits nothing. It is the default an author never has to choose, and a
line disclaiming fidelity would be noise on nearly every export. An argument
with no source text at all exports exactly what it exported before.

The web and mobile apps show the same sentence on their own reading surfaces.
The wording is coordinated deliberately: someone who exports an argument and then
opens it on a phone should not meet two different-sounding claims. Each surface
keeps its own copy rather than importing a shared constant, since only the
sentence is common — the presentation around it is not.

## `originPassagesFor` is now importable

`@proposit/shared/engine/render` exports the origin passage renderer:

```ts
import { originPassagesFor } from "@proposit/shared/engine/render"

originPassagesFor(snapshot, premiseId)
// → ['Based on origin text "Socrates is a man."']
```

Whether a passage reads that way at all, and whether the source text's
whitespace is collapsed, is a rendering decision more than one surface has to
agree on — the same reason `getInlineSourceLabel` and `describeSource` are
exported from there. A consumer that was keeping its own copy in step with the
export by comment can now delete it.

The snapshot argument is `Pick<TProjectReactiveSnapshot, "origin"> | undefined`,
so a partial snapshot or none is accepted, and the optional `origin` slice is
chained internally — a snapshot rehydrated from pre-origin wire data returns
`[]` rather than throwing.

## Repinning

Purely additive. No signature changed, the new export sits on the existing
`./engine/render` subpath, and the export's output changes only for arguments
that already carry a `representation` origin link.
