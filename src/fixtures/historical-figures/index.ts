// Public showcase dataset: historical-figure author accounts and the central
// argument of a canonical text each one wrote.
//
// This is a first-cut, PUBLICLY REVISABLE dataset. Each argument's claims and
// premises were produced by running the source text through Proposit's argument
// ingestion pipeline (the run that generated each structure is recorded verbatim
// in its `provenance` block). The logical structure (claim symbols and premise
// trees) is the pipeline's first pass and is deliberately left faithful rather
// than polished. Revisions that sharpen a claim, restructure a premise tree, or
// correct an attribution are welcome via pull request.
//
// Human-written context — about each figure, and about each source document —
// lives in the per-figure Markdown fixtures under
// `historical-figures/<curationId>/`, bundled into `content.generated.ts` and
// re-exported below as the three `*ByCurationId` string maps. The argument
// `description` field is intentionally empty; that context now lives in the
// Markdown instead.
//
// Each figure's argument is stored as its canonical source of truth in
// `<documentCurationId>.argument.yaml` in the figure folder (exported from the
// seeded DB via the server `export:argument` CLI). `gen:fixtures` parses and
// schema-validates those YAML files and bakes them into `content.generated.ts`
// as `argumentsByFigureCurationId`, which the figures below reference directly —
// so a public revision is a PR against the YAML, not this file.
//
// The full source texts are reproduced as `<documentCurationId>.md` in each
// figure folder; they also live in the `proposit-core` repository under
// `examples/texts/` (see each entry's `provenance.sourceFile`).

import type { CuratedArgument } from "../curated-argument/index.js"
import { argumentsByFigureCurationId } from "./content.generated.js"

export {
    figureAboutByCurationId,
    documentMarkdownByCurationId,
    documentAboutByCurationId,
} from "./content.generated.js"

// The provenance recorded for a single ingestion run that produced a figure's
// argument structure. Re-running the same text under a different model, mode, or
// library version yields a comparable block, so iterations can be diffed. Keeps
// the dataset's public vocabulary, so the name is intentionally not `T`-prefixed.
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface HistoricalFigureProvenance {
    provider: string
    model: string | null
    pipeline: string
    pipelineVersion: string
    mode: string
    runAt: string
    sourceFile: string
    sourcePath: string
    coreVersion: string
    sharedVersion: string
    serverVersion: string
}

// A curated argument carrying the provenance of the ingestion run it was seeded
// from. `HistoricalFigureArgument` keeps the curated-argument vocabulary, so the
// name is intentionally not `T`-prefixed.
// eslint-disable-next-line @typescript-eslint/naming-convention
export type HistoricalFigureArgument = CuratedArgument & {
    // Stable id of the source document this argument was ingested from (the
    // `<documentCurationId>`). Matches the `<documentCurationId>.md` file in the
    // figure folder and the keys of `documentMarkdownByCurationId` /
    // `documentAboutByCurationId`. The server persists it to
    // `platformData.curationId`.
    documentCurationId: string
    provenance?: HistoricalFigureProvenance
}

// A historical-figure author account and the arguments attributed to it.
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface HistoricalFigure {
    name: string
    username: string
    // Stable human-readable id marking this curated author account. Matches the
    // figure's Markdown fixture folder name and the keys of
    // `figureAboutByCurationId`. The server persists it to the user's
    // `curationId`.
    curationId: string
    imageFile: string
    bio?: string
    arguments: HistoricalFigureArgument[]
}

export const historicalFigures: HistoricalFigure[] = [
    {
        name: "Socrates / Plato",
        username: "Socrates / Plato",
        curationId: "historical-figures-socrates",
        imageFile: "socrates-plato.jpg",
        bio: "Socrates was a classical Athenian philosopher (c. 470–399 BCE) whose ideas survive chiefly through the dialogues of his student Plato, including the Crito.",
        arguments:
            argumentsByFigureCurationId["historical-figures-socrates"] ?? [],
    },
    {
        name: "John Stuart Mill",
        username: "John Stuart Mill",
        curationId: "historical-figures-mill",
        imageFile: "john-stuart-mill.jpg",
        bio: "John Stuart Mill (1806–1873) was an English philosopher and political economist, a leading liberal thinker best known for his defense of individual liberty in On Liberty.",
        arguments: argumentsByFigureCurationId["historical-figures-mill"] ?? [],
    },
    {
        name: "James Madison",
        username: "James Madison",
        curationId: "historical-figures-madison",
        imageFile: "james-madison.jpg",
        bio: "James Madison (1751–1836) was an American statesman and political theorist, the fourth U.S. President and \"Father of the Constitution,\" who argued in Federalist No. 10 that a large republic best controls the violence of faction.",
        arguments:
            argumentsByFigureCurationId["historical-figures-madison"] ?? [],
    },
    {
        name: "Peter Singer",
        username: "Peter Singer",
        curationId: "historical-figures-singer",
        imageFile: "peter-singer.jpg",
        bio: "Peter Singer (b. 1946) is an Australian moral philosopher and a leading figure in contemporary applied ethics, best known for his utilitarian arguments on global poverty and animal ethics.",
        arguments:
            argumentsByFigureCurationId["historical-figures-singer"] ?? [],
    },
]
