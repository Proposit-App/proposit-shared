# Change request: `getAllArgumentsImpl` strips origin from URL passed to `fetchImpl`

**Date:** 2026-05-04
**Source:** `@proposit/proposit-mobile` agent (Phase 1 / 1F simulator validation)
**Severity:** Critical for any non-browser consumer (React Native, Node)
**Affected version:** `@proposit/shared@0.3.1` (current `^0.3.1` consumers)
**Suggested release:** patch bump (e.g. `0.3.2`)

## Summary

`apiClient.getAllArguments(...)` calls `config.fetchImpl(url.pathname + url.search, ...)` instead of passing the full URL. In the browser this works because `fetch()` resolves path-only inputs against `window.location.origin`. In React Native there is no `window.location`, so the request fails with `TypeError: Network request failed`. Every other endpoint in the same file (`getLatestArgumentImpl`, `getEntireArgumentImpl`, `archiveArgumentImpl`, etc.) correctly passes the absolute URL (`${baseUrl}/...`), so this is an isolated bug in `getAllArgumentsImpl`.

## Symptom

In `proposit-mobile`, the popular-arguments list never resolves out of `loading` state on iOS Simulator (and would fail identically on a TestFlight build or any RN target). Diagnostic logs from `src/arguments/use-arguments-list.ts` show:

```
[useArgumentsList] fetching {"baseUrl": "https://proposit.app"}
[probe] httpbin status: 200                                         ← raw fetch from RN works
[probe] proposit raw status: 200 ok: true                           ← raw fetch to the SAME URL works
[useArgumentsList] await threw: [TypeError: Network request failed] ← only fails through apiClient
```

The "raw" probe was a `fetch("https://proposit.app/api/v1/argument?orderByPopularity=true&limit=20&offset=0")` performed in the same effect, against the same URL, in the same RN bundle. It returns 200 with valid data. Going through `apiClient.getAllArguments(...)` reliably throws.

## Root cause

In the published bundle at `node_modules/@proposit/shared/dist/api-client/argument/index.js:42-49`:

```js
export async function getAllArgumentsImpl(config, params = {}) {
    const baseUrl = resolveBaseUrl(config)
    const url = new URL(`${baseUrl}/api/v1/argument`, "http://localhost")
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            url.searchParams.set(key, String(value))
        }
    }
    return await parseResponse(
        await config.fetchImpl(url.pathname + url.search, { method: "GET" }),
        Type.Array(ArgumentWithMetadataSchema)
    )
}
```

`url.pathname + url.search` discards `url.origin`. The string handed to `fetchImpl` is `/api/v1/argument?orderByPopularity=true&limit=20&offset=0` — a path with no scheme or host.

Browsers resolve path-only URLs against `window.location`, so `proposit-server`'s same-origin web calls work fine. React Native (and Node) have no document context to resolve against, so the call fails at the network layer with `Network request failed`.

## Proposed fix

Replace `url.pathname + url.search` with `url.toString()` so the absolute URL is passed through. The `new URL(absolute, "http://localhost")` form (where the first arg is already absolute) ignores the `"http://localhost"` base and gives a real absolute URL via `url.toString()`.

```diff
 export async function getAllArgumentsImpl(config, params = {}) {
     const baseUrl = resolveBaseUrl(config);
     const url = new URL(`${baseUrl}/api/v1/argument`, "http://localhost");
     for (const [key, value] of Object.entries(params)) {
         if (value !== undefined) {
             url.searchParams.set(key, String(value));
         }
     }
     return await parseResponse(
-        await config.fetchImpl(url.pathname + url.search, { method: "GET" }),
+        await config.fetchImpl(url.toString(), { method: "GET" }),
         Type.Array(ArgumentWithMetadataSchema)
     );
 }
```

The source file in the shared repo is whichever `.ts` compiles to `dist/api-client/argument/index.js`. The dummy `"http://localhost"` base argument can be removed at the same time — when the first argument to `URL()` is already absolute, the second argument has no effect — but that's optional cleanup, not required for the fix.

If you prefer to drop the placeholder base entirely, the equivalent simpler form is:

```ts
const url = new URL(`${baseUrl}/api/v1/argument`)
for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
        url.searchParams.set(key, String(value))
    }
}
return await parseResponse(
    await config.fetchImpl(url.toString(), { method: "GET" }),
    Type.Array(ArgumentWithMetadataSchema)
)
```

This is the shape the rest of the file uses (just `${baseUrl}/...` plus a string template) — adopting it removes the `URL` ceremony entirely. Either form fixes the bug.

## Test case

A regression test for this should call `getAllArgumentsImpl` with a captured `fetchImpl` spy and assert the URL passed to fetch starts with the configured `baseUrl`. Today's tests (if any) likely don't cover this because they're run in jsdom, where path-only fetch works.

```ts
import { getAllArgumentsImpl } from "./index"

it("passes an absolute URL (with origin) to fetchImpl", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = []
    const fetchImpl: typeof fetch = async (url, init) => {
        calls.push({ url: String(url), init })
        return new Response("[]", {
            status: 200,
            headers: { "content-type": "application/json" },
        })
    }
    await getAllArgumentsImpl(
        { baseUrl: "https://example.test", fetchImpl },
        { orderByPopularity: true, limit: 20, offset: 0 }
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe(
        "https://example.test/api/v1/argument?orderByPopularity=true&limit=20&offset=0"
    )
})
```

A non-RN-specific way to lock this in: assert `new URL(calls[0]!.url).origin === "https://example.test"` so the test fails fast for any future endpoint that strips the origin via the same `pathname + search` trap.

Worth scanning the rest of the file (and `api-client/` overall) for the same pattern. A grep for `\.pathname \+ ` or `\.pathname\+` in `node_modules/@proposit/shared/dist/api-client/` is a 30-second audit. As of 0.3.1, only `getAllArgumentsImpl` has this — but a lint rule or test would prevent recurrence if any future endpoint adopts the URL-builder shape.

## Versioning + downstream

- Patch bump (`0.3.2`) — bug fix, no API change.
- After publish + tag:
    - `proposit-server`: bump `@proposit/shared` to `^0.3.2`. Server's same-origin behavior is unchanged (browsers happily handle either path-only or absolute URLs from `fetch`).
    - `proposit-mobile`: bump `@proposit/shared` to `^0.3.2`. The mobile agent will revert the temporary `useArgumentsList` diagnostic + workaround (currently a working-tree change in mobile, not committed) once the new shared version is wired up.

## How this surfaced

`proposit-mobile` Phase 1 / 1F (PR #14) shipped anonymous-read entry, which makes `ArgumentList` the first screen unauthenticated users see on cold launch. With the AuthStack initial route now `ArgumentListScreen`, the simulator validation immediately exercised `apiClient.getAllArguments(...)` end to end for the first time. Up to this point all `getAllArguments` consumption has been web-only, so the bug was masked by browser fetch's relative-URL handling.

## Contact

Mobile agent identity: `@proposit/proposit-mobile`. Coordinator orchestrator: `Proposit-App/orchestrator` at the workspace root. Once `@proposit/shared@0.3.2` is published, broker-DM the mobile agent (`broker send --to '@proposit/proposit-mobile' "READY: shared 0.3.2 published — getAllArguments fix"`) so the dep bump can land.
