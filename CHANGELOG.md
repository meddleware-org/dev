# Changelog — @meddleware/dev

## 0.0.17 (2026-10-03)

- Blob reads use walrus-client's `readBlob` (timeout, size cap, strict consistency check) in the
  Walrus Storage and Sealed Storage samples instead of a bare `fetch`.
- Served with clean URLs and a real 404 page (static-server 0.1.4 `CLEAN_URLS`, `NOT_FOUND_PAGE`).
- `@meddleware/*` dependencies at their latest versions.

## 0.0.16 (2026-10-02)

- Ships the brand favicon (`/favicon.svg`); browsers no longer log a 404 for `/favicon.ico`.

## 0.0.15 (2026-10-02)

- Testnet deployments: the version-gated `access_gate` `0xa55789…` and `seal_policies` `0x61c4aa…`,
  with their shared version objects (`PlatformConfig`, `PolicyConfig`); the superseded packages are
  listed. On-chain pages from `@meddleware/access-gate-sui` 0.0.5 and `@meddleware/seal-policies-sui`
  0.0.6.
- Sealed Storage guides: `SealController` and `buildPublishSealedContentTx` take `policyConfigId`;
  policy signatures include `&PolicyConfig`; custom policies are told to version-gate upgradeable
  packages; the custody note follows the package's `CUSTODY.md` lifecycle.

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

## [0.0.22] - 2026-10-09

### Changed

- Release gate: the release runs the full CI workflow, the image is scanned (fixable CRITICAL/HIGH fail) before it is signed, third-party licence notices are served at /THIRD_PARTY_LICENSES and the lockfile ships in the image for SBOM tools

## [0.0.21] - 2026-10-09

### Changed

- Testnet identifiers now match the 2026-10-09 publications (the previous release built without its docs edits); the audit file is excluded from the site

## [0.0.20] - 2026-10-09

### Changed

- Image base static-server 0.1.7 (Go 1.26.9) and an explicit non-root USER; merged tooling updates; the audit file is excluded from the site (srcExclude)

## [0.0.19] - 2026-10-09

### Changed

- sui-token-template ^1.0.8 on-chain pages

## [0.0.18] - 2026-10-09

### Changed

- Testnet identifiers follow the 2026-10-09 publications (access-gate-sui 0.0.6, seal-policies-sui 0.0.7); ui ^0.1.31, design-tokens ^0.1.9; image base static-server 0.1.6

