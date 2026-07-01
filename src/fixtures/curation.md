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
  `curationId`) and, per figure, the argument plus Markdown context:
  `<doc>.argument.yaml` (the argument's claims and premises — the file you edit to
  propose a change), `about.md` (the author), `<doc>.md` (the source text), and
  `<doc>-about.md` (the document). The argument is associated to its content by a
  stable `documentCurationId` (the app stores this on the argument as
  `platformData.curationId`, with `platform: "curated"`).
- **`curated-argument/`** — the data types and the `v`/`and`/`or`/`not`/`implies`/
  `iff`/`formula` constructors used to express an argument's propositional
  structure.

## Proposing a change

If you think a curated argument misrepresents the original work:

1. **Open an issue** describing what is wrong and how it should read, or
2. **Edit the relevant `<doc>.argument.yaml` and open a pull request.** The file is
   a readable list of `claims` (each a `symbol`, `title`, and `body`) and
   `premises` (each a `title`, `role`, and a propositional `tree`) — no code, just
   the argument's structure.

[File an issue](https://github.com/Proposit-App/proposit-shared/issues) ·
[Browse the curated arguments](https://github.com/Proposit-App/proposit-shared/tree/main/src/fixtures/historical-figures)

## How a revision goes live

When a change to a `<doc>.argument.yaml` is merged, the next deploy detects that the
published argument no longer matches the file (a content-digest comparison) and
**republishes it as a new version** — reusing each claim's identity where its
`symbol` is unchanged, so existing reactions and citations on those claims carry
forward. Claims you rename or remove are treated as new/removed. No hand-editing of
any data-module syntax is required, and the argument's history is preserved.
