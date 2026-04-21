# Upcoming release notes

### Internal

- Exports map now declares `default` condition on every subpath. Non-`import`-aware resolvers (Jest's CJS resolver, older bundlers) can now locate the dist files without consumer-side workarounds (e.g. `moduleNameMapper`). Patch-level change; no runtime behavior change.
