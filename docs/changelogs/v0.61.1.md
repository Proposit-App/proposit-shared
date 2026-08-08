# Changelog — upcoming

<changes starting-hash="b7b67bd" ending-hash="HEAD">

## Added

- **`WORKED_EXAMPLE_HEADING`, `WORKED_EXAMPLE_DISCLAIMER`,
  `WORKED_EXAMPLE_RESULT_LABEL`** in
  `@proposit/shared/engine/review/explainer` — the chrome a `TWorkedExample` is
  presented in, moved here from the one client that had it.

    An example is drawn with the same primitives as the argument under review, so
    the only thing separating the two is what is said around it. The web app had
    authored a disclaimer locally
    (`assessment-explainer.tsx`) and mobile had none, and mobile labelled its
    result line `Result:` where the web said `Result of this example:` — a label
    that reads as the reader's _own_ result. A reader who takes an illustration
    for their own argument has been told something false about their review, so
    this is a correctness problem rather than a styling one, and it cannot be a
    per-client string for the same reason the definitions are not.

    The disclaimer is the web's wording verbatim; the result label is the web's,
    because the bare `Result:` is the confusion being fixed. Both clients drop
    their local copies and read these.

- Tests asserting all three strings are non-empty, that the disclaimer states
  plainly that the example is not part of the reviewed argument and that nothing
  in it is the reader's, and that the result label scopes itself to the example.

No definition, example or reference changed.

</changes>
