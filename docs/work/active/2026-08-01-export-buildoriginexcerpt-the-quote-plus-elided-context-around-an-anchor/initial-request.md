# Export buildOriginExcerpt: the quote plus elided context around an anchor

Asked for by `proposit-server` on 2026-08-01, to back a source-excerpt popover on
the claim card
(`proposit-server/2026-08-01-show-a-claim-s-source-excerpt-in-a-popover-on-the-card`).

## Product changes

A reader who wants to know where a claim came from currently has two settings:
the quoted passage alone, in the cue's accessible name and in the export, or the
entire source text in the sidebar pane. Nothing in between.

The passage alone reads as a fragment — it starts mid-clause and stops
mid-clause, because that is what an anchor is. What a reader actually wants at a
glance is the passage *with a little of the writing around it*, enough to see
where it sat.

That is a rendering decision, and more than one surface will make it: the web
claim-card popover is the first, the mobile reading surface is the obvious
second, and the argument's markdown export is a plausible third. This is the same
reason `originPassagesFor` was exported in v0.56.0 rather than left private to
the markdown renderer.

## Technical changes

One pure function in `src/engine/render/`, exported from `./engine/render`
alongside `originPassagesFor`:

```ts
export function buildOriginExcerpt(
    text: string,
    anchor: Pick<TCoreOriginAnchor, "startCodePoint" | "endCodePoint">,
    contextCodePoints = 60
): TOriginExcerpt

export type TOriginExcerpt = {
    before: string
    quote: string
    after: string
    elidedStart: boolean
    elidedEnd: boolean
}
```

Parts rather than a string, so each surface styles the quote its own way — the
web panel paints it with the origin highlight accent, mobile would not.

Only dependency is core's `sliceByCodePoints`, so it stays inside the
`lib: ["ES2022"]` constraint with no feature gate.

The full rule is in this item's `spec.md`.

**Do not read the anchor's stored `prefix`/`suffix`.** Those exist to re-locate a
quote that occurs more than once, are fixed at a 32-code-point window that cuts
mid-word, and are optional — absent on an anchor at offset 0. The caller has the
document text.

## Meta changes

**Folds into the unpublished v0.56.0**, at the requester's direction — that
version is cut and tagged locally but was never published, so this costs no
extra release cycle. The consequence, accepted knowingly: the origin-derivation
fix already in 0.56.0 stays unpublished until this lands.

Consumer impact is `proposit-server` first; `proposit-mobile` may adopt it later,
which is the reason it is here rather than in the server's route-local view
model.

Related: epic
[origin data and enthymeme annotations](tcw://W/proposit-app/2026-07-29-argument-origin-data-and-enthymeme-annotations).
