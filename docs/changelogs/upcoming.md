# Changelog — upcoming

## Added

- New `./fixtures/curated-argument` entry point: the `ExprNode` /
  `CuratedArgument` data types plus the `v`/`and`/`or`/`not`/`implies`/`iff`/
  `formula` shorthand constructors for hand-authoring propositional argument
  trees (pure data, no runtime deps).
- New `./fixtures/historical-figures` entry point exporting `historicalFigures`:
  three figure author accounts (Socrates/Plato, John Stuart Mill, Martin Luther
  King Jr.) with name/username/`imageFile`/bio and one ingested-then-curated
  argument each, carrying the ingestion-run `provenance` block verbatim. Consumed
  by the server's figure-showcase seed.
