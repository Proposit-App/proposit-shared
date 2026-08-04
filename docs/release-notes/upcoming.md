# Release notes — upcoming

## Curated argument premises now name the reasoning step

Every premise in the four curated showcase arguments — Socrates, Madison, Mill,
and Singer — carries a new title.

The old titles simply spelled the premise back out: `If "Escape would wrong the
laws" and "The laws formed Socrates" and … then "Socrates must not escape"`.
Because the app renders a premise's title as a header and then lists those very
same claims as rows directly underneath it, the header said nothing the rows
did not already say.

Each is now a short phrase naming what the step _does_ in the argument — `The
laws' claim on Socrates`, `Controlling effects, not causes`, `The argument from
fallibility` — so a reader scanning the headers can follow the shape of the
reasoning before reading a single claim.

Only the titles changed. The claims, the logical structure, and the record of
the run that produced each argument are untouched.

## Curated arguments can declare the axioms they rest on

A curated argument's claims can now say that they rest on a self-evident basis —
a definition, a stipulation, a logical or mathematical principle, a rule of the
domain, or a background assumption the argument never proves. A claim declares
it inline, as one word, and the app wires up the supporting axiom for it.

An argument whose claims declare nothing looks and behaves exactly as before.

## Version history now shows a renamed premise

Comparing two versions of an argument used to miss a premise whose title was
edited. If a new version only renamed its premises, the comparison came back
empty and the version looked identical to the one before it.

Renaming a premise now shows up the same way any other edit to that premise
does — the premise is highlighted as the place the change happened.
