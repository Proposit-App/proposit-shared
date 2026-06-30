# Proposit curated arguments

This folder holds **curated arguments** — a small set of arguments published by the
Proposit team, each representing a famous historical work (for example Plato's
_Crito_ or John Stuart Mill's _On Liberty_). In the app they are authored by
staff-curated accounts and carry the Proposit curation badge.

## Why they exist

Turning a long text into a structured propositional argument is not an exact
science. These curated arguments are a **transparent, community-correctable**
record of how Proposit chooses to model well-known arguments and documents. Keeping
the canonical structures here, in a public repository, means anyone can inspect a
representation and propose a better one — rather than treating the app's rendering
as the final word.

## What lives here

- **`historical-figures/`** — the figure author accounts (name, username, avatar,
  `curationId`) and, per figure, the argument structure plus Markdown context:
  `about.md` (the author), `<doc>.md` (the source text), and `<doc>-about.md` (the
  document). The argument is associated to its content by a stable
  `documentCurationId` (the app stores this on the argument as
  `platformData.curationId`, with `platform: "curated"`).
- **`curated-argument/`** — the data types and the `v`/`and`/`or`/`not`/`implies`/
  `iff`/`formula` constructors used to express an argument's propositional
  structure.

## Proposing a change

If you think a curated argument misrepresents the original work:

1. **Open an issue** describing what is wrong and how it should read, or
2. **Edit the relevant fixture and open a pull request.**

[File an issue](https://github.com/Proposit-App/proposit-shared/issues) ·
[Browse the curated arguments](https://github.com/Proposit-App/proposit-shared/tree/main/src/fixtures/historical-figures)

A versioned export/import format for an argument's static representation is being
added so that proposing structural changes does not require hand-editing the
data-module syntax; revisions to a representation are picked up as a new published
version of the argument the next time the showcase is seeded.
