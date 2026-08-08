# Release notes — upcoming

## A grounded claim no longer shows "Unknown" next to a header saying "True"

When a claim you left unassigned was carried to true by the argument's own
reasoning, its chip was supposed to show that. On some arguments the conclusion's
chip kept reading "Unknown" even as the review header beside it read "True" and
"Reaches its conclusion".

The claim was right and the chip was wrong. Behind each claim the engine may
keep more than one variable, and the chip was reading whichever one happened to
come first rather than the one the value had reached. It now takes the value
from any of them, so the chip and the header can no longer disagree.

One case is deliberately left visible rather than smoothed over: if an
argument's reasoning drives the same claim to true one way and false another,
the chip shows unknown and the app is told which claim it was, instead of
quietly picking a side.
