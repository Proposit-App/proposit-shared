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
// The full source texts are reproduced as `<documentCurationId>.md` in each
// figure folder; they also live in the `proposit-core` repository under
// `examples/texts/` (see each entry's `provenance.sourceFile`).

import type { CuratedArgument } from "../curated-argument/index.js"

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
        arguments: [
            {
                title: "Trial of Socrates: Crito",
                description: "",
                documentCurationId: "socrates-01",
                claims: [
                    {
                        symbol: "harmful_cowardice_fear",
                        title: "Zeal can be dangerous",
                        body: "Socrates says Crito’s eagerness helps only if it is right; if wrong, great zeal increases danger and must be checked by reflection.",
                    },
                    {
                        symbol: "follow_divine_will",
                        title: "Socrates follows God’s will",
                        body: "Socrates ends by leaving the matter to God’s will and following wherever that guidance leads.",
                    },
                    {
                        symbol: "atonement_over_escape",
                        title: "Socrates must not escape",
                        body: "Socrates decides that escaping would violate justice, break his agreements with the laws, and wrong his country, friends, and himself.",
                    },
                    {
                        symbol: "no_willful_wrongdoing",
                        title: "Wrongdoing is never right",
                        body: "Socrates maintains that one must never intentionally do wrong, and that injustice is always evil and dishonorable.",
                    },
                    {
                        symbol: "laws_must_be_obeyed_or_persuaded",
                        title: "Laws require obedience or persuasion",
                        body: "The laws assert that a citizen must obey them or persuade them they are wrong; otherwise he must endure their punishments without resistance.",
                    },
                    {
                        symbol: "socrates_obeys_reason",
                        title: "Reason governs Socrates",
                        body: "Socrates says he has always followed the best reasoning available to him and will not abandon his principles unless better ones are found.",
                    },
                    {
                        symbol: "many_lack_moral_power",
                        title: "The many cannot do greatest evil",
                        body: "Socrates argues that the many cannot make a person wise or foolish, so they can do neither the greatest good nor the greatest evil.",
                    },
                    {
                        symbol: "wealth_can_fund_escape",
                        title: "Escape is affordable",
                        body: "Crito says Socrates can be freed at little cost because his own money and money from other supporters are available.",
                    },
                    {
                        symbol: "justice_first_life_second",
                        title: "Justice outranks life",
                        body: "Socrates concludes that one must value a good, just, and honorable life above mere survival, so consequences like death or loss do not decide the moral question.",
                    },
                    {
                        symbol: "no_retaliation_rule",
                        title: "Retaliation is unjust",
                        body: "Socrates holds that one must not injure in return or repay evil with evil, because doing evil to another is itself wrong.",
                    },
                    {
                        symbol: "escape_protects_friends",
                        title: "Escape could harm friends",
                        body: "Crito fears that helping Socrates escape could expose him and the other friends to legal trouble, financial loss, and disgrace.",
                    },
                    {
                        symbol: "do_what_one_deems_right",
                        title: "One must do the right",
                        body: "A person ought to do what he judges right and must not betray the right once he recognizes it.",
                    },
                    {
                        symbol: "escape_injures_laws",
                        title: "Escape would wrong the laws",
                        body: "Socrates reasons that escaping without the Athenians’ consent would injure the laws and the city rather than merely avoid punishment.",
                    },
                    {
                        symbol: "escape_harms_friends_and_city",
                        title: "Escape would damage others",
                        body: "The laws say escaping would exile or impoverish Socrates’s friends, make him an enemy of well-governed cities, and confirm the judges’ condemnation.",
                    },
                    {
                        symbol: "dream_means_phthia",
                        title: "The dream predicts departure",
                        body: "Socrates’s dream of a woman saying “The third day hence to fertile Phthia shalt thou go” points to his death occurring after a short delay.",
                    },
                    {
                        symbol: "citizen_contract_obedience",
                        title: "Residence implies agreement",
                        body: "The laws claim that an adult who remains in the city after knowing its ways has implicitly agreed to obey its commands or persuade it otherwise.",
                    },
                    {
                        symbol: "escape_preserves_children",
                        title: "Escape would aid his children",
                        body: "Crito argues that Socrates should escape so he can raise and educate his children rather than abandoning them to orphanhood.",
                    },
                    {
                        symbol: "shipArrivalImpends",
                        title: "The Delos ship nears arrival",
                        body: "The ship from Delos has not yet arrived, but it will probably arrive that day; therefore the next day will be Socrates’s last day of life.",
                    },
                    {
                        symbol: "escape_would_save_socrates",
                        title: "Crito urges escape",
                        body: "Crito urges Socrates to escape from prison, offering money, help, and exile as practical means to avoid execution.",
                    },
                    {
                        symbol: "escape_help_available",
                        title: "Helpers stand ready",
                        body: "Several people, including Simmias, Cebes, and others, are prepared to provide money and assistance for Socrates’s escape.",
                    },
                    {
                        symbol: "thessaly_safe_refuge",
                        title: "Thessaly offers refuge",
                        body: "Crito says Socrates can live safely with friends in Thessaly, where no one will trouble him.",
                    },
                    {
                        symbol: "socrates_long_residency",
                        title: "Socrates accepted the city",
                        body: "The laws argue that Socrates stayed in Athens for seventy years, rarely traveled, and therefore showed continued attachment to the city and its laws.",
                    },
                    {
                        symbol: "socrates_accepts_divine_will",
                        title: "Socrates accepts divine will",
                        body: "Socrates is willing to die if that is God’s will, though he thinks the ship’s arrival will be delayed by a day.",
                    },
                    {
                        symbol: "laws_bring_citizen_up",
                        title: "The laws formed Socrates",
                        body: "The laws claim they brought Socrates into existence, regulated his upbringing and education, and gave him the benefits of civic order.",
                    },
                    {
                        symbol: "public_opinion_unworthy",
                        title: "The many are not authoritative",
                        body: "Socrates holds that the opinion of the many should not guide action; only the judgment of good and wise people deserves regard.",
                    },
                ],
                premises: [
                    {
                        title: 'If "The many are not authoritative" and "The many cannot do greatest evil" then "Zeal can be dangerous"',
                        role: "supporting",
                        tree: {
                            type: "operator",
                            operator: "implies",
                            children: [
                                {
                                    type: "formula",
                                    children: [
                                        {
                                            type: "operator",
                                            operator: "and",
                                            children: [
                                                {
                                                    type: "variable",
                                                    symbol: "public_opinion_unworthy",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "many_lack_moral_power",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "harmful_cowardice_fear",
                                },
                            ],
                        },
                    },
                    {
                        title: "Socrates must not escape",
                        role: "conclusion",
                        tree: {
                            type: "variable",
                            symbol: "atonement_over_escape",
                        },
                    },
                    {
                        title: 'If "Reason governs Socrates" and "Zeal can be dangerous" and "Wrongdoing is never right" and "Retaliation is unjust" and "One must do the right" then "Justice outranks life"',
                        role: "supporting",
                        tree: {
                            type: "operator",
                            operator: "implies",
                            children: [
                                {
                                    type: "formula",
                                    children: [
                                        {
                                            type: "operator",
                                            operator: "and",
                                            children: [
                                                {
                                                    type: "variable",
                                                    symbol: "socrates_obeys_reason",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "harmful_cowardice_fear",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "no_willful_wrongdoing",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "no_retaliation_rule",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "do_what_one_deems_right",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "justice_first_life_second",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "The Delos ship nears arrival" and "Socrates accepts divine will" and "The dream predicts departure" then "Socrates follows God’s will"',
                        role: "supporting",
                        tree: {
                            type: "operator",
                            operator: "implies",
                            children: [
                                {
                                    type: "formula",
                                    children: [
                                        {
                                            type: "operator",
                                            operator: "and",
                                            children: [
                                                {
                                                    type: "variable",
                                                    symbol: "shipArrivalImpends",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "socrates_accepts_divine_will",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "dream_means_phthia",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "follow_divine_will",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "Escape would wrong the laws" and "The laws formed Socrates" and "Residence implies agreement" and "Socrates accepted the city" and "Escape would damage others" and "Justice outranks life" and "Laws require obedience or persuasion" then "Socrates must not escape"',
                        role: "supporting",
                        tree: {
                            type: "operator",
                            operator: "implies",
                            children: [
                                {
                                    type: "formula",
                                    children: [
                                        {
                                            type: "operator",
                                            operator: "and",
                                            children: [
                                                {
                                                    type: "variable",
                                                    symbol: "escape_injures_laws",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "laws_bring_citizen_up",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "citizen_contract_obedience",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "socrates_long_residency",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "escape_harms_friends_and_city",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "justice_first_life_second",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "laws_must_be_obeyed_or_persuaded",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "atonement_over_escape",
                                },
                            ],
                        },
                    },
                ],
                provenance: {
                    provider: "openai",
                    model: null,
                    pipeline: "scribe",
                    pipelineVersion: "1.0.0",
                    mode: "fast",
                    runAt: "2026-06-30T16:39:25.958Z",
                    sourceFile: "01-crito.txt",
                    sourcePath:
                        "/Users/brian/Projects/Proposit-App/proposit-core/examples/texts/01-crito.txt",
                    coreVersion: "2.4.0",
                    sharedVersion: "0.30.0",
                    serverVersion: "0.32.0",
                },
            },
        ],
    },
    {
        name: "John Stuart Mill",
        username: "John Stuart Mill",
        curationId: "historical-figures-mill",
        imageFile: "john-stuart-mill.jpg",
        bio: "John Stuart Mill (1806–1873) was an English philosopher and political economist, a leading liberal thinker best known for his defense of individual liberty in On Liberty.",
        arguments: [
            {
                title: "On Liberty",
                description: "",
                documentCurationId: "mill-01",
                claims: [
                    {
                        symbol: "NoExtremeException",
                        title: "No exception for certainty",
                        body: "Permitting free discussion only for doubtful matters while forbidding scrutiny of supposedly certain doctrines still assumes that one’s own judges of certainty are infallible.",
                    },
                    {
                        symbol: "FallibleTruthNeedsTesting",
                        title: "Truth needs open testing",
                        body: "The beliefs with the strongest warrant are those that remain open to the whole world’s challenge; if challenge fails, they attain the best certainty fallible beings can have.",
                    },
                    {
                        symbol: "SilencingStealsTruth",
                        title: "Silencing robs mankind",
                        body: "Suppressing an opinion harms the human race because it prevents exchange of error for truth when the opinion is right and prevents clearer truth through collision with error when it is wrong.",
                    },
                    {
                        symbol: "FreedomNeedsOpenDissent",
                        title: "Dissent sustains mental life",
                        body: "Open dissent keeps intellects courageous and active, while social intolerance produces conformity, timidity, and suppression of genuine thought.",
                    },
                    {
                        symbol: "DebateClarifiesPartialTruth",
                        title: "Debate reveals partial truth",
                        body: "Many received opinions contain only part of the truth, and opposing opinions often supply the neglected remainder; diversity of opinion is therefore useful to reach fuller truth.",
                    },
                    {
                        symbol: "UtilityDependsOnTruth",
                        title: "Utility depends on truth",
                        body: "The usefulness of an opinion is itself disputable, and truth is part of utility; therefore discussion cannot fairly protect utility while barring debate over truth.",
                    },
                    {
                        symbol: "ChristianMoralityIsIncomplete",
                        title: "Christian morality is incomplete",
                        body: "Christian morality, as historically formed by the church, is one-sided and incomplete; secular ethical elements and non-Christian moral insights are needed alongside it.",
                    },
                    {
                        symbol: "MajorityMayNotSilenceMinority",
                        title: "Majority may not silence one",
                        body: "Mankind is not justified in silencing a lone dissenter even if all others share the opposite opinion; the power to silence opinion is illegitimate.",
                    },
                    {
                        symbol: "JudgmentNeedsDiscussion",
                        title: "Judgment needs criticism",
                        body: "Human judgment becomes trustworthy through open criticism, discussion, and experience; without free contradiction and refutation, no rational assurance of being right is possible.",
                    },
                    {
                        symbol: "p1",
                        title: "Press liberty resists tyranny",
                        body: "Liberty of the press serves as a security against corrupt or tyrannical government, and governments should not prescribe opinions or determine what doctrines people may hear.",
                    },
                    {
                        symbol: "ModerationRuleInsufficient",
                        title: "Temperate speech is not enough",
                        body: "The free expression of opinion should not be restricted by vague demands of temperance, because unfairness and intemperance are judged asymmetrically and cannot be policed consistently by law.",
                    },
                    {
                        symbol: "SocialPenaltyActsAsPersecution",
                        title: "Social stigma persecutes opinion",
                        body: "Modern societies still persecute opinions through legal penalties and social stigma, which can deter expression as effectively as imprisonment for those dependent on public approval.",
                    },
                    {
                        symbol: "NoIntellectualSlumber",
                        title: "Truth should stay contested",
                        body: "When opinions stop being disputed, people stop thinking about them and their truth becomes stale; therefore even true doctrines benefit from being openly contested.",
                    },
                    {
                        symbol: "FreeDiscussionNeededForTruth",
                        title: "Discussion keeps truth living",
                        body: "Even when an opinion is true, it must be freely discussed to be held as a living truth rather than a dead dogma or mere prejudice.",
                    },
                    {
                        symbol: "PersecutionCanSuppressTruth",
                        title: "Persecution can suppress truth",
                        body: "Persecution often succeeds in suppressing truth for long periods, and only eventual rediscovery, not any inherent immunity, lets truth prevail in the long run.",
                    },
                    {
                        symbol: "SuppressionAssumesInfallibility",
                        title: "Suppression assumes infallibility",
                        body: "All silencing of discussion presumes infallibility, because no person or authority can claim certainty enough to exclude others from judging an opinion.",
                    },
                    {
                        symbol: "SocratesChristAureliusExamples",
                        title: "History condemns persecution",
                        body: "The deaths of Socrates and Jesus, and Marcus Aurelius’s persecution of Christianity, show that sincere and respectable people can persecute profound truth in error.",
                    },
                ],
                premises: [
                    {
                        title: 'If "Utility depends on truth" and "Temperate speech is not enough" and "Dissent sustains mental life" then "Debate reveals partial truth"',
                        role: "supporting",
                        tree: {
                            type: "operator",
                            operator: "implies",
                            children: [
                                {
                                    type: "formula",
                                    children: [
                                        {
                                            type: "operator",
                                            operator: "and",
                                            children: [
                                                {
                                                    type: "variable",
                                                    symbol: "UtilityDependsOnTruth",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "ModerationRuleInsufficient",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "FreedomNeedsOpenDissent",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "DebateClarifiesPartialTruth",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "Suppression assumes infallibility" and "Judgment needs criticism" and "Truth needs open testing" and "No exception for certainty" then "Discussion keeps truth living"',
                        role: "supporting",
                        tree: {
                            type: "operator",
                            operator: "implies",
                            children: [
                                {
                                    type: "formula",
                                    children: [
                                        {
                                            type: "operator",
                                            operator: "and",
                                            children: [
                                                {
                                                    type: "variable",
                                                    symbol: "SuppressionAssumesInfallibility",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "JudgmentNeedsDiscussion",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "FallibleTruthNeedsTesting",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "NoExtremeException",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "FreeDiscussionNeededForTruth",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "History condemns persecution" and "Persecution can suppress truth" and "Social stigma persecutes opinion" then "Dissent sustains mental life"',
                        role: "supporting",
                        tree: {
                            type: "operator",
                            operator: "implies",
                            children: [
                                {
                                    type: "formula",
                                    children: [
                                        {
                                            type: "operator",
                                            operator: "and",
                                            children: [
                                                {
                                                    type: "variable",
                                                    symbol: "SocratesChristAureliusExamples",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "PersecutionCanSuppressTruth",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "SocialPenaltyActsAsPersecution",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "FreedomNeedsOpenDissent",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "Discussion keeps truth living" and "Debate reveals partial truth" and "Truth should stay contested" then "Christian morality is incomplete"',
                        role: "supporting",
                        tree: {
                            type: "operator",
                            operator: "implies",
                            children: [
                                {
                                    type: "formula",
                                    children: [
                                        {
                                            type: "operator",
                                            operator: "and",
                                            children: [
                                                {
                                                    type: "variable",
                                                    symbol: "FreeDiscussionNeededForTruth",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "DebateClarifiesPartialTruth",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "NoIntellectualSlumber",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "ChristianMoralityIsIncomplete",
                                },
                            ],
                        },
                    },
                    {
                        title: "Christian morality is incomplete",
                        role: "conclusion",
                        tree: {
                            type: "variable",
                            symbol: "ChristianMoralityIsIncomplete",
                        },
                    },
                    {
                        title: 'If "Press liberty resists tyranny" and "Majority may not silence one" and "Silencing robs mankind" and "Suppression assumes infallibility" then "Social stigma persecutes opinion"',
                        role: "supporting",
                        tree: {
                            type: "operator",
                            operator: "implies",
                            children: [
                                {
                                    type: "formula",
                                    children: [
                                        {
                                            type: "operator",
                                            operator: "and",
                                            children: [
                                                {
                                                    type: "variable",
                                                    symbol: "p1",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "MajorityMayNotSilenceMinority",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "SilencingStealsTruth",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "SuppressionAssumesInfallibility",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "SocialPenaltyActsAsPersecution",
                                },
                            ],
                        },
                    },
                ],
                provenance: {
                    provider: "openai",
                    model: null,
                    pipeline: "scribe",
                    pipelineVersion: "1.0.0",
                    mode: "fast",
                    runAt: "2026-06-30T16:41:08.873Z",
                    sourceFile: "02-on-liberty-ch2.txt",
                    sourcePath:
                        "/Users/brian/Projects/Proposit-App/proposit-core/examples/texts/02-on-liberty-ch2.txt",
                    coreVersion: "2.4.0",
                    sharedVersion: "0.30.0",
                    serverVersion: "0.32.0",
                },
            },
        ],
    },
]
