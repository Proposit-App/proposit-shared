# Release notes — upcoming

## Origin data and enthymeme annotations

An argument can now carry the source text it was built from, and an author can
declare which parts of it go unspoken in the natural-language original.

- **The source text rides on the snapshot both apps already read.** Every
  reactive snapshot now carries an `origin` slice — the document, the link
  holding its stance, and the anchors tying each premise and claim expression to
  the passage it came from, grouped by target. The web view, the mobile view,
  and the markdown export all read the same object they already held.
- **An enthymeme is declared, never derived.** New mutations mark a premise or a
  claim expression unspoken, and unmarking removes the mark entirely rather than
  storing a "no". Nothing marks content automatically.
- **Suggestions, only where absence means something.** An argument that claims
  to _represent_ its source reports each piece of content that traces back to no
  passage, as a suggestion the author may accept or ignore. An argument that
  merely _started_ from its source — and one with no source at all — reports
  none. Content that is both traced to a passage _and_ marked unspoken is
  reported as a contradiction.
- **Attribution without a prompt.** A source text can carry the same structured
  reference a cited source does, so a reader can find the original.
- **A copied argument brings its source text with it.** Copying an argument as a
  document now quotes, beside each part that was linked to the source, the
  passage it came from — and names the source itself at the top. Someone handed
  only the copy can see what each piece was written from, with no offsets or
  identifiers to decode.
- **Source-text limits per tier.** Each account tier now has a ceiling on a
  single source text and on the total stored across an account. Unverified
  accounts get none, as with every other allowance. The two limits are
  optional in this release so an app carrying it keeps working against a
  server that has not deployed yet; they become required in a later one.
