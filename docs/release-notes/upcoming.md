# Release notes — upcoming

## A review that saves itself as you leave no longer throws into the void

The review wizard saves the reviewer's work 200 ms after each answer, so a
burst of edits costs one write instead of ten. If the page went away inside
that window — a navigation, an unmount, a server-side render, a test
environment shutting down — the save had nothing left to write to, and the
resulting failure escaped with no one listening. In an app that surfaces as an
unexpected `unhandledrejection`; in this repo's own suite it was an
intermittent test run that exited non-zero with every test passing.

Storage simply not being there is now treated as what it is: expected, and
nothing the app can act on. It is discarded quietly. A save that fails for a
real reason — the browser's storage quota is full, the state would not
serialize — is still reported, now as a `console.warn` reading
`review-engine: persist failed`, so a genuine persist failure does not
disappear along with the benign case.

Nothing exported changed, and the two evaluation paths that save and wait
(`runEvaluation`, `runValidityCheck`) still surface their failures to the
caller as before.

## Repinning

Behavioral fix only. No signature, export, or schema changed; repinning needs
no consumer work.
