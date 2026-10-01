# Changelog — @meddleware/dev

## 0.0.14 (2026-10-01)

- Runs on static-server 0.1.3 (per-response CSP script nonce for Cloudflare JavaScript
  Detections, HSTS, Permissions-Policy).
- Sealed Storage guide: `SealController` takes `originalId` + `publishedAt` from
  `@meddleware/seal-client/deployments` (the old `packageId` option no longer exists).
- Deployments table lists original ID and published-at (seal_policies v2).

## 0.0.1

Initial release. Developer documentation site at `dev.meddleware.co.uk` covering:

- Getting started: toolchain prerequisites, local development
- Design system: consuming `@meddleware/design-tokens` and `@meddleware/ui`
- Sui development: environment setup, PTB patterns
- Per-service integration guides: Walrus Storage, Sealed Storage, Access Gate, DAO
