# Release notes — upcoming

## Rejecting the conclusion is no longer offered, because it never did anything

The review let you reject the step inside the argument's own conclusion, both as
a step in the walkthrough and as the first way out of a collision — labelled
"takes the premise out of the reckoning". It did not. That premise is always
evaluated, whatever verdict you record against it, so the reasoning it carries
went on producing the conclusion's value exactly as before.

Three things followed from that. You got no "1 premise rejected" badge, though
rejecting any other premise gives one. The argument line then read "not enough
was settled" — to a reader who had settled everything and just rejected a step.
And taking it made a flagged collision disappear and let the review be finished,
without anything about the collision having changed.

The control is gone from both places. Accepting the conclusion's step still
works and still means something. Where a collision involves the conclusion, the
way out is to change one of the answers behind it — which was always the honest
one, and was already offered alongside.

## The conflict gate survives a reload

The list of claims held both true and false was not being written to storage, so
a review reopened later reconstructed itself as having no conflict at all. That
is precisely the case the list exists for: a claim can be held both ways while
every summary figure beside it reads clean, and the list is the only thing left
to notice it. It is now stored, and the whole stored result is checked field by
field against what the engine produces, so the next field to be added cannot go
missing the same way.

## Editing a finished review re-opens the gate

A review checked and found clean, then edited, kept reporting itself finished
until something re-checked it. The check is now tied to the answers it was run
against: change any of them and the review is held again until a fresh check
clears it.
