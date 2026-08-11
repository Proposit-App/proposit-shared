# Release notes — upcoming

## The review surface's words live in one place

The web app and the mobile app each wrote out the review screen's own copy —
the assignment labels, the tooltip explaining where a value the reader never
set came from, the stance words. They were only ever the same by coincidence,
and where they had already drifted apart, nothing noticed.

Those strings now come from the library, at
`@proposit/shared/ui/argument/review/consts`, alongside a small vocabulary of
review icon names at `…/review/icons` that lets each app check, at build time,
that it has drawn every mark the review surface names. Both apps adopt them
next; readers will see one wording on either.

Two of the words settle a disagreement rather than freezing one. A value the
reader did not set is explained as deriving from how a claim is used, ending
with the claims "the argument still has to reach" — the other app's phrasing
used "awaiting support", which reads like the reader's own support for a claim.
And that explanation now reads as one sentence rather than restarting after the
dash.
