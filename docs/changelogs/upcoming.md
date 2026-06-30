# Changelog — upcoming

## Added

- New `./fixtures/curated-argument` entry point: the `ExprNode` /
  `CuratedArgument` data types plus the `v`/`and`/`or`/`not`/`implies`/`iff`/
  `formula` shorthand constructors for hand-authoring propositional argument
  trees (pure data, no runtime deps).
- New `./fixtures/historical-figures` entry point exporting `historicalFigures`:
  two public-domain figure author accounts (Socrates/Plato, John Stuart Mill)
  with `name`/`username`/`curationId`/`imageFile`/bio and one ingested argument
  each (now carrying a `documentCurationId` plus the ingestion-run `provenance`
  block verbatim). The same entry point also exports three string maps —
  `figureAboutByCurationId`, `documentMarkdownByCurationId`, and
  `documentAboutByCurationId` — built from per-figure Markdown fixtures so the
  author/document text ships in `dist`. Consumed by the server's figure-showcase
  seed.
- `curationId` (nullable string) on `UserSchema` / `TUser`: a human-readable id
  marking a synthetic/curated account; `null` for normal users.
- `gen:fixtures` build step that bundles the historical-figure Markdown into the
  committed `content.generated.ts`; runs automatically at the start of `build`.

## Changed

- Argument `description` on historical-figure arguments is now intentionally
  empty; that context lives in the bundled Markdown instead.
