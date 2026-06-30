// Public showcase dataset: historical-figure author accounts and the central
// argument of a canonical text each one wrote.
//
// This is a first-cut, PUBLICLY REVISABLE dataset. Each argument's claims and
// premises were produced by running the source text through Proposit's argument
// ingestion pipeline (the run that generated each structure is recorded verbatim
// in its `provenance` block) and then lightly curated — only the human-written
// one-line `description` and the figure `bio` were added by hand. The logical
// structure (claim symbols and premise trees) is the pipeline's first pass and is
// deliberately left faithful rather than polished. Revisions that sharpen a
// claim, restructure a premise tree, or correct an attribution are welcome via
// pull request.
//
// The source texts live in the `proposit-core` repository under
// `examples/texts/` (see each entry's `provenance.sourceFile`).

import type { CuratedArgument } from "../curated-argument/index.js"

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
    provenance?: HistoricalFigureProvenance
}

// A historical-figure author account and the arguments attributed to it.
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface HistoricalFigure {
    name: string
    username: string
    imageFile: string
    bio?: string
    arguments: HistoricalFigureArgument[]
}

export const historicalFigures: HistoricalFigure[] = [
    {
        name: "Socrates / Plato",
        username: "socrates-plato",
        imageFile: "socrates-plato.jpg",
        bio: "Socrates was a classical Athenian philosopher (c. 470–399 BCE) whose ideas survive chiefly through the dialogues of his student Plato, including the Crito.",
        arguments: [
            {
                title: "Socrates must not escape",
                description:
                    "Socrates argues that he must not escape prison to avoid his execution: doing so would wrong the laws of Athens that raised him and break his lifelong agreement to obey or persuade the city. Because acting justly matters more than merely staying alive, and one must never return a wrong for a wrong, he chooses to accept the verdict rather than flee.",
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
        username: "john-stuart-mill",
        imageFile: "john-stuart-mill.jpg",
        bio: "John Stuart Mill (1806–1873) was an English philosopher and political economist, a leading liberal thinker best known for his defense of individual liberty in On Liberty.",
        arguments: [
            {
                title: "Christian morality is incomplete",
                description:
                    "Mill argues that silencing any opinion presumes our own infallibility, and that even true beliefs harden into dead dogma when shielded from challenge. Free discussion therefore cannot rightly be suppressed, and on that ground a Christian morality treated as complete is shown to be only a partial truth that open debate is needed to correct.",
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
    {
        name: "Martin Luther King Jr.",
        username: "martin-luther-king-jr",
        imageFile: "martin-luther-king-jr.jpg",
        bio: "Martin Luther King Jr. (1929–1968) was an American Baptist minister and the foremost leader of the civil rights movement, awarded the Nobel Peace Prize in 1964.",
        arguments: [
            {
                title: "Freedom will ultimately prevail",
                description:
                    "King defends nonviolent direct action against segregation: because injustice anywhere threatens justice everywhere, unjust laws may be disobeyed openly and lovingly as a higher respect for law, and the demand for justice cannot wait while the white moderate prefers order to justice. He concludes that freedom will ultimately prevail because it is bound to the nation's destiny and to God's will.",
                claims: [
                    {
                        symbol: "FreedomWillPrevail",
                        title: "Freedom will ultimately prevail",
                        body: "He says Birmingham and the nation will reach freedom because America’s goal is freedom, his destiny is tied to America’s, and God’s will supports the struggle.",
                    },
                    {
                        symbol: "WhiteModerateIsProblem",
                        title: "The white moderate is the obstacle",
                        body: "He says his greatest disappointment is the white moderate, who prefers order to justice, accepts a negative peace, and urges Negroes to wait.",
                    },
                    {
                        symbol: "HeroicSitInners",
                        title: "Birmingham protesters are heroes",
                        body: "He praises the sit-in participants and marchers as courageous, disciplined heroes who stand for the American dream and Judaeo-Christian values.",
                    },
                    {
                        symbol: "InterrelatedJustice",
                        title: "Injustice anywhere harms justice everywhere",
                        body: "He argues that all communities are interrelated, so injustice in one place threatens justice everywhere and makes every U.S. resident a concerned party.",
                    },
                    {
                        symbol: "UnjustLawDefinedByMajority",
                        title: "Minorities cannot fairly make the law",
                        body: "He says a law is unjust when a majority compels a minority to obey a rule it does not impose on itself, or when a disfranchised minority had no part in enacting it.",
                    },
                    {
                        symbol: "JustAndUnjustLaws",
                        title: "Laws can be just or unjust",
                        body: "He distinguishes just laws, which align with moral or divine law and uplift human personality, from unjust laws, which conflict with moral law and degrade personality.",
                    },
                    {
                        symbol: "PoliceProtectSegregation",
                        title: "The police enforce segregation",
                        body: "He says the Birmingham police used force and humiliation against nonviolent Negroes and deserve no praise for maintaining order in service of segregation.",
                    },
                    {
                        symbol: "NegotiationFailedInBirmingham",
                        title: "City leaders refused good-faith negotiation",
                        body: "He says Negro leaders tried to negotiate with Birmingham officials, but the officials consistently refused to engage in good-faith negotiation.",
                    },
                    {
                        symbol: "p1",
                        title: "Demonstrations arise from injustice",
                        body: "He says the Birmingham demonstrations are unfortunate, but the city’s white power structure left the Negro community no alternative, so the underlying causes matter more than the protests themselves.",
                    },
                    {
                        symbol: "BirminghamRacialInjustice",
                        title: "Birmingham is deeply segregated",
                        body: "He asserts that racial injustice engulfs Birmingham, describing it as highly segregated, brutal, unjust in the courts, and marked by many unsolved bombings of Negro homes and churches.",
                    },
                    {
                        symbol: "DirectActionCreatesTension",
                        title: "Direct action creates constructive tension",
                        body: "He argues that nonviolent direct action seeks to create a crisis and constructive tension that forces negotiation and brings ignored issues into the open.",
                    },
                    {
                        symbol: "TimeIsNeutral",
                        title: "Time can help or hinder",
                        body: "He says time itself is neutral, and progress comes only through active effort; otherwise time becomes an ally of stagnation.",
                    },
                    {
                        symbol: "BrokenPromiseLedToDirectAction",
                        title: "Broken promises led to direct action",
                        body: "He says merchants made promises, including removing humiliating racial signs, but broke them, so the movement prepared for direct action as the only remaining option.",
                    },
                    {
                        symbol: "InvitedAndConnectedInBirmingham",
                        title: "He is in Birmingham by invitation",
                        body: "He says he is in Birmingham because he was invited there and because he has organizational ties there through the Southern Christian Leadership Conference and its affiliate.",
                    },
                    {
                        symbol: "ChurchShouldSupportJustice",
                        title: "Churches should oppose injustice",
                        body: "He says ministers should proclaim that integration is morally right and that the Negro is their brother, rather than retreating into an otherworldly religion.",
                    },
                    {
                        symbol: "InjusticeCompelsAction",
                        title: "Injustice is his reason for being there",
                        body: "He says he is in Birmingham because injustice is there, and he feels compelled to carry the gospel of freedom beyond his home town.",
                    },
                    {
                        symbol: "PatienceIsUnreasonable",
                        title: "Black impatience is understandable",
                        body: "He describes the long history of segregation, humiliation, poverty, and fear as the reason Negroes cannot simply wait calmly for justice.",
                    },
                    {
                        symbol: "AnswerCriticismPatiently",
                        title: "Answers criticism patiently",
                        body: "He chooses to answer the clergymen’s criticism in patient, reasonable terms because he regards their criticism as sincere and well intentioned.",
                    },
                    {
                        symbol: "IllegalCanBeMoral",
                        title: "Legal action can be immoral",
                        body: "He says Hitler’s legal acts were evil and the Hungarian freedom fighters’ illegal acts were noble, showing that legality and morality do not always align.",
                    },
                    {
                        symbol: "SegregationLawsAreUnjust",
                        title: "Segregation laws are unjust",
                        body: "He says segregation statutes are unjust because they distort the soul, damage personality, and are morally wrong and sinful.",
                    },
                    {
                        symbol: "ActionWasDelayedForPolitics",
                        title: "Action was delayed for political timing",
                        body: "He says the campaign was postponed for the mayoral election and runoff, but continued delays made further postponement impossible.",
                    },
                    {
                        symbol: "ChurchHasFailedJustice",
                        title: "The church has disappointed him",
                        body: "He says the white church has largely been silent or complicit, though he still loves the church and values the exceptions that supported integration.",
                    },
                    {
                        symbol: "TensionCanAdvanceJustice",
                        title: "Constructive tension is necessary",
                        body: "He argues that nonviolent activists do not create the hidden tension but expose it, and that society needs that tension to move from injustice toward justice.",
                    },
                    {
                        symbol: "FaithSupportsTheStruggle",
                        title: "Some religious leaders support the struggle",
                        body: "He says some clergy and believers have joined the freedom struggle, shared its risks, and preserved the true meaning of the gospel through their witness.",
                    },
                    {
                        symbol: "PeaceWithoutJusticeIsWrong",
                        title: "Condemning peaceful protest is illogical",
                        body: "He rejects the idea that peaceful action should be condemned because it may trigger violence, arguing that responsibility lies with the violent responder, not the protester.",
                    },
                    {
                        symbol: "ExtremismDependsOnCause",
                        title: "The issue is what kind of extremism",
                        body: "He says the real question is not whether people will be extremists, but whether they will be extremists for hate or for love, injustice or justice.",
                    },
                    {
                        symbol: "NonviolentCampaignSteps",
                        title: "Nonviolent campaigns follow four steps",
                        body: "He says nonviolent campaigns involve collecting facts, negotiation, self-purification, and direct action, and that Birmingham followed all four steps.",
                    },
                    {
                        symbol: "CivilDisobedienceIsRespectForLaw",
                        title: "Open unjust-law breaking honors law",
                        body: "He says one should break unjust laws openly, lovingly, and with acceptance of punishment, because such civil disobedience shows the highest respect for law.",
                    },
                    {
                        symbol: "NonviolenceMeansPureMeans",
                        title: "Means must match ends",
                        body: "He argues that nonviolence requires pure means, so it is wrong to use moral means to preserve immoral ends such as racial injustice.",
                    },
                    {
                        symbol: "ChurchShouldBeAForce",
                        title: "The church should transform society",
                        body: "He says the early church was a strong moral force, and that today’s church must recover that sacrificial spirit or lose its authenticity and relevance.",
                    },
                    {
                        symbol: "FreedomRequiresPressure",
                        title: "Freedom requires pressure",
                        body: "He says civil rights gains have never come without determined legal and nonviolent pressure, and oppressed people must demand freedom because oppressors do not give it voluntarily.",
                    },
                    {
                        symbol: "UnjustApplicationOfPermits",
                        title: "Neutral ordinances can be misused",
                        body: "He says a parade-permit ordinance is not wrong in itself, but it becomes unjust when used to preserve segregation and block peaceful assembly and protest.",
                    },
                    {
                        symbol: "WaitMeansNever",
                        title: "Delaying justice means denying it",
                        body: "He argues that the repeated command to wait usually means never, and that justice delayed too long becomes justice denied.",
                    },
                    {
                        symbol: "NowIsTheTimeForJustice",
                        title: "Now is the time for justice",
                        body: "He urges immediate action to fulfill democracy’s promise and lift the nation from racial injustice to human dignity.",
                    },
                    {
                        symbol: "CivilDisobedienceHasHistory",
                        title: "Civil disobedience has precedent",
                        body: "He points to Shadrach, Meshach, Abednego, the early Christians, Socrates, and the Boston Tea Party as examples of civil disobedience against unjust authority.",
                    },
                ],
                premises: [
                    {
                        title: 'If "Laws can be just or unjust" and "Segregation laws are unjust" and "Minorities cannot fairly make the law" and "Neutral ordinances can be misused" and "Legal action can be immoral" then "Open unjust-law breaking honors law"',
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
                                                    symbol: "JustAndUnjustLaws",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "SegregationLawsAreUnjust",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "UnjustLawDefinedByMajority",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "UnjustApplicationOfPermits",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "IllegalCanBeMoral",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "CivilDisobedienceIsRespectForLaw",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "Nonviolent campaigns follow four steps" and "Action was delayed for political timing" and "The white moderate is the obstacle" and "Constructive tension is necessary" and "Now is the time for justice" then "Demonstrations arise from injustice"',
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
                                                    symbol: "NonviolentCampaignSteps",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "ActionWasDelayedForPolitics",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "WhiteModerateIsProblem",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "TensionCanAdvanceJustice",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "NowIsTheTimeForJustice",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "p1",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "Freedom requires pressure" and "Delaying justice means denying it" and "Black impatience is understandable" and "The white moderate is the obstacle" and "Time can help or hinder" then "Now is the time for justice"',
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
                                                    symbol: "FreedomRequiresPressure",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "WaitMeansNever",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "PatienceIsUnreasonable",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "WhiteModerateIsProblem",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "TimeIsNeutral",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "NowIsTheTimeForJustice",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "Direct action creates constructive tension" and "Constructive tension is necessary" then "Now is the time for justice"',
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
                                                    symbol: "DirectActionCreatesTension",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "TensionCanAdvanceJustice",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "NowIsTheTimeForJustice",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "Injustice anywhere harms justice everywhere" and "Freedom requires pressure" and "Freedom will ultimately prevail" then "The issue is what kind of extremism"',
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
                                                    symbol: "InterrelatedJustice",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "FreedomRequiresPressure",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "FreedomWillPrevail",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "ExtremismDependsOnCause",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "City leaders refused good-faith negotiation" and "Broken promises led to direct action" and "Demonstrations arise from injustice" then "Direct action creates constructive tension"',
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
                                                    symbol: "NegotiationFailedInBirmingham",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "BrokenPromiseLedToDirectAction",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "p1",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "DirectActionCreatesTension",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "Injustice anywhere harms justice everywhere" and "Birmingham is deeply segregated" then "Injustice is his reason for being there"',
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
                                                    symbol: "InterrelatedJustice",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "BirminghamRacialInjustice",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "InjusticeCompelsAction",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "He is in Birmingham by invitation" and "Injustice is his reason for being there" then "Answers criticism patiently"',
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
                                                    symbol: "InvitedAndConnectedInBirmingham",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "InjusticeCompelsAction",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "AnswerCriticismPatiently",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "The church has disappointed him" and "Churches should oppose injustice" and "The church should transform society" and "Some religious leaders support the struggle" then "Freedom will ultimately prevail"',
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
                                                    symbol: "ChurchHasFailedJustice",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "ChurchShouldSupportJustice",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "ChurchShouldBeAForce",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "FaithSupportsTheStruggle",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "FreedomWillPrevail",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "The church has disappointed him" and "The church should transform society" and "Some religious leaders support the struggle" then "Churches should oppose injustice"',
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
                                                    symbol: "ChurchHasFailedJustice",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "ChurchShouldBeAForce",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "FaithSupportsTheStruggle",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "ChurchShouldSupportJustice",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "Open unjust-law breaking honors law" and "Civil disobedience has precedent" then "Means must match ends"',
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
                                                    symbol: "CivilDisobedienceIsRespectForLaw",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "CivilDisobedienceHasHistory",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "NonviolenceMeansPureMeans",
                                },
                            ],
                        },
                    },
                    {
                        title: "Freedom will ultimately prevail",
                        role: "conclusion",
                        tree: {
                            type: "variable",
                            symbol: "FreedomWillPrevail",
                        },
                    },
                    {
                        title: 'If "The police enforce segregation" and "Birmingham protesters are heroes" then "Condemning peaceful protest is illogical"',
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
                                                    symbol: "PoliceProtectSegregation",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "HeroicSitInners",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "PeaceWithoutJusticeIsWrong",
                                },
                            ],
                        },
                    },
                    {
                        title: 'If "Laws can be just or unjust" and "Segregation laws are unjust" and "Open unjust-law breaking honors law" and "Means must match ends" then "Legal action can be immoral"',
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
                                                    symbol: "JustAndUnjustLaws",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "SegregationLawsAreUnjust",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "CivilDisobedienceIsRespectForLaw",
                                                },
                                                {
                                                    type: "variable",
                                                    symbol: "NonviolenceMeansPureMeans",
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    type: "variable",
                                    symbol: "IllegalCanBeMoral",
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
                    runAt: "2026-06-30T16:41:07.033Z",
                    sourceFile: "03-letter-from-birmingham-jail.txt",
                    sourcePath:
                        "/Users/brian/Projects/Proposit-App/proposit-core/examples/texts/03-letter-from-birmingham-jail.txt",
                    coreVersion: "2.4.0",
                    sharedVersion: "0.30.0",
                    serverVersion: "0.32.0",
                },
            },
        ],
    },
]
