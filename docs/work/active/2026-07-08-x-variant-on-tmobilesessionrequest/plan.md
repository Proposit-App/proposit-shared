# Plan

See [`initial-request.md`](./initial-request.md). TDD: write the four failing cases in `src/schemas/api/auth/__tests__/index.test.ts`, then convert `MobileSessionRequest` to a `Type.Union` discriminated on `provider`. Minor bump to `@proposit/shared`; update changelog + release notes; do not publish.
