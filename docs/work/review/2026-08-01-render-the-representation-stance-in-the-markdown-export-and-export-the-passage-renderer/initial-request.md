# Render the representation stance in the markdown export and export the passage renderer

## Product changes

A QA pass on the shipped origin-data feature found that the `representation`
stance is invisible to readers on every surface, the markdown export included.
It renders only in the web app's author-gated editing panel. A reader handed the
exported markdown cannot tell a faithful representation of the source from a
loose jumping-off point — which is the whole distinction the stance exists to
draw.

The user has approved showing it to readers on all three surfaces. This node
owns the export; web and mobile add equivalent reader-visible indicators in
parallel.

## Technical changes

1. `serializeArgumentToMarkdown` (`src/engine/render/markdown.ts`) states the
   fidelity claim when the origin link's stance is `representation`. `seed` is
   the unremarkable default and emits nothing.
2. Export the origin passage renderer from `@proposit/shared/engine/render`,
   folding in the root-inbox escalation
   `2026-07-31-export-the-origin-passage-renderer-from-the-render-module`
   (filed by `proposit-mobile`, which keeps a byte-identical private copy of
   `ORIGIN_LEAD` / `originPassage` kept in step only by a comment).

## Meta changes

None.
