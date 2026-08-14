# Changelog — upcoming

<changes starting-hash="8521d4a" ending-hash="8521d4a">

## Changed

**`scripts/first-time-setup.sh` gates on `pnpm run check`, not `pnpm run
build`.** The build-only gate was a workaround for a suite flake — an unhandled
rejection escaping the review store's debounced persist — that was fixed some
time ago, and the script had gone on describing a constraint that no longer
existed while telling the reader to run `check` by hand afterwards. `check` ends
in `build`, so `dist/` is still written; it costs about 37 seconds more on an
installed checkout, less than the `pnpm install` it follows. The closing message
no longer instructs the reader to repeat a step the script already ran.

</changes>
