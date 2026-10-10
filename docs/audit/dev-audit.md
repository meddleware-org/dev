# Security Audit — `dev`

**Classification:** Internal security review
**Project:** `repos/dev` — `@meddleware/dev`, VitePress developer documentation (`dev.meddleware.co.uk`): integration guides, PTB patterns, gateway and relay self-hosting, design system, imported on-chain developer pages
**Project type:** Static site (VitePress)
**Template:** AUDIT_TEMPLATE.md (2026-10-08) + AUDIT_TEMPLATE_TS.md (2026-10-08) + AUDIT_TEMPLATE_VUE.md (2026-10-08, hosting-header rows) + AUDIT_TEMPLATE_IMG.md (2026-10-08) + AUDIT_TEMPLATE_SITE.md (2026-09-30)
**Package manager / lockfile:** npm 11, committed (also copied into the image for SBOM tools)   **Module format:** ESM (build scripts `.mjs`, VitePress config and theme TypeScript)   **Publish model:** image + npm package (ships `docs/`, `scripts/` and config; `NPM_PUBLISH` opt-in, enabled — `@meddleware/dev` 0.0.22 is on npm)
**Runtime targets:** browser (static HTML); Node 24 for the build   **Peer dependencies:** none
**Generator:** vitepress 2.0.0-alpha.20 (vue 3.5.43, TypeScript 6.0.3); no TypeDoc step (the API reference is on `docs.`)
**Generated sources:** `scripts/gen-onchain.mjs` — the Move packages' `docs/onchain` pages from `@meddleware/access-gate-sui` 0.0.6, `seal-policies-sui` 0.0.7, `sui-token-template` 1.0.8 (lockfile; `ONCHAIN_DOCS_ROOT` is a local preview override only)
**Audience:** developers and operators (user-facing documentation is `docs.meddleware.co.uk`)
**Unpublished material:** `drafts/` (retired DAO page, vault notes) sits outside `srcDir`, is not in the npm `files` list and is never linked; this audit lives in `docs/audit/` and is excluded from the site by `srcExclude: ['audit/**']` (live `/audit/dev-audit` answers 404) but not yet from the npm package (F9); white-label content is annotation-only (HTML comments, stripped by VitePress)
**Images:** `quay.io/meddleware-org/dev:0.0.22@sha256:dfad63d6…ee1c` (Docker Hub mirror; cosign keyless, SPDX SBOM attestation, build provenance; cosign-verified 2026-10-09, `verify-digests.sh` 16/16)
**Base images:** build `node:24-slim@sha256:0e0ff40c…f9b6`; runtime `quay.io/meddleware-org/static-server:0.1.7@sha256:2e227311…2379` (Go 1.26.9)
**Runtime user:** `USER 65534:65534`   **Runtime FS:** read-only root, no writable mounts
**Deployed by:** `post-bootstrap/dev/overlays/default`; digest from `config/images.yaml`
**Build args:** `CSP` only (the Content-Security-Policy string) — not secret, not a test switch; no `VITE_*`
**Deployment status:** npm v0.0.22 and image `quay.io/meddleware-org/dev` 0.0.22 serving `dev.meddleware.co.uk` (`sha256:dfad63d6…`, deployed 2026-10-09; live `/sui/` carries the republished testnet ids `access_gate` `0xd7ddaa94…`, PlatformConfig `0x3f81489d…`, `seal_policies` `0x0c8f7349…`, PolicyConfig `0xee0403ba…`)
**Review date:** 2026-10-03 (first pass) · re-verified 2026-10-09
**Reviewer:** Internal review
**Severity ceiling:** Low — static content. Its code samples are copied into other people's apps, so a sample that teaches an unsafe pattern is the realistic harm.
**Status:** re-verified 2026-10-09

---

## Executive summary

The developer counterpart of the docs site, built the same way: hand-written guides, on-chain pages
imported from the Move packages (`gen:onchain`), a hash-pinned CSP checked at build time, and a signed
image on static-server. Every `@meddleware/*` import in its code samples resolves to a real export of
the current packages (checked mechanically for this pass).

This first pass found, and fixed in 0.0.17:

- **F1 (Low)** — the blob-read samples used a bare `fetch` of the aggregator URL, teaching readers to
  skip the timeout, size cap and consistency check that walrus-client's `readBlob` provides.
- **F2 (Low)** — the same SPA-fallback serving as the docs site (docs F11): deep links returned the
  home page and unknown paths returned 200. Fixed with static-server 0.1.4's clean URLs and 404 page.
- **F3 (Low)** — the blocking external link check could not resolve root-relative links with the
  current lychee; given an absolute root it checks external links only.

Re-verified 2026-10-09 (0.0.22; type-check clean, CSP check over 29 pages, audit gate 1 allowlisted /
0 open; live site `dev.meddleware.co.uk` read the same week). F1–F5 hold. The republished testnet ids
(`access_gate` `0xd7ddaa94…`, `seal_policies` `0x0c8f7349…`) are what the site shows. Fixed since the
first pass:

- **F11 (Low, RESOLVED 0.0.20–0.0.22)** — the image release now runs the full CI workflow, scans the
  published image before cosign signs it, ships the lockfile for SBOM tools, serves
  `/THIRD_PARTY_LICENSES` (HTTP 200 live), runs as an explicit `USER 65534:65534` on static-server 0.1.7,
  and the pod sets `automountServiceAccountToken: false`.

The newly applicable lens checks, and re-reading the samples against the current packages, found defects
that are **not yet fixed** (content and workflow changes are outside this alignment; each is a small
edit for the next patch release): **F7 (Low, DEFERRED)** code samples out of step with the current client
signatures (the access-proof, gated-upload and Seal samples), the realistic harm named in the severity
ceiling; **F8 (Low, DEFERRED)** the gateway guide still describes the pre-v2 proof message and
configuration; **F6 (Low, DEFERRED)** the testnet id table is typed by hand although `SECURITY.md` says it
is generated; **F9 (Low, DEFERRED)** the npm package carries generated copies of other packages' pages
and would carry the audit file; **F10 (Info, DEFERRED)** `node-ci.yml` has no `npm test` step (the site has
no tests today, so nothing is skipped); **F12 (Info, DEFERRED)** the template range; **F17 (Info, DEFERRED)**
contributor documents. Accepted or maintainer items: **F13** blanket `connect-src https:`, **F14** the
cosign identity pins the repository not the workflow, **F16** the npm job's gate is a subset of CI
(ACCEPTED-RISK); **F15** registry mirror and credential inventory (DEFERRED, maintainer).

The severity ceiling stays Low.

## Threat model / trust boundaries

| Actor | Holds / proves | Can do | Bounded by |
| --- | --- | --- | --- |
| Developer reader | nothing | copy samples into their app | samples use the hardened client APIs (F1); imports checked against exports |
| Content author | PR access | change guides | review; build dead-link check; CSP hash check |
| Build inputs | installed Move packages | shape on-chain pages | lockfile-pinned; read from `node_modules` only |
| Publish path | registry tokens; npm OIDC | push an altered image or package | tag-gated CI; Trivy then cosign; SBOM and provenance attestations |
| Base-image publisher, registry | image layers, the manifest served for a tag | ship altered bytes | digest pinning (build and runtime base, deployment by digest); signature verified by `verify-digests.sh` |
| Upstream packages the generator reads | on-chain pages, ids shown to developers | change what readers see | lockfile-pinned versions (F5); generated output git-ignored; the id table typed by hand is the gap (F6) |
| Client packages the samples describe | the call shapes developers copy | leave samples behind the API | import-name check by hand; argument drift is F7 |
| External link targets | content behind every outbound link | send readers elsewhere | weekly blocking lychee run (F3) |
| Build environment | which drafts or local overrides reach the output | ship a draft or a preview-root build | `drafts/` outside `srcDir`; `srcExclude`; `ONCHAIN_DOCS_ROOT` unset in CI and the image; `.dockerignore` excludes local env files |

## Severity scale

Critical / High / Medium / Low / Info / Positive.

## Scope

- **In scope (0.0.22):** `docs/**` (guides, design system, getting started, Sui sections),
  `docs/.vitepress/**`, `scripts/{gen-onchain,check-csp-inline,third-party-licenses}.mjs`, `Dockerfile`,
  `.dockerignore`, workflows, `.github/{audit-gate.mjs,audit-allowlist.json,dependabot.yml}`, `SECURITY.md`,
  `CLAUDE.md`, `post-bootstrap/dev/` (read-only).
- **Out of scope:** the packages documented (own audits); `drafts/` (not built, not published).
- **Environment (2026-10-09):** `tsc --noEmit` (clean); `check-csp-inline.mjs` against the 0.0.22 `dist`
  (29 HTML files, all inline scripts covered); audit gate (1 allowlisted advisory, 0 open); sample
  imports re-checked by script against the installed `@meddleware/*` packages (0 unknown names; argument
  shapes read by hand, F7); `npm pack --dry-run` (62 files) and the published 0.0.22 tarball (44 files)
  listed; live headers, `/THIRD_PARTY_LICENSES`, deep links, the 404 page and the testnet ids of
  `dev.meddleware.co.uk` (HTTP reads 2026-10-10). The site has no test suite (`package.json` has no
  `test` script). Earlier (2026-10-03): stylelint, eslint, html-validate green; lychee over external
  links, 0 errors.

## Findings

### F1 — Samples read blobs with a bare `fetch`

**Severity:** Low   **Disposition:** RESOLVED (0.0.17)
**Where:** `docs/sui/walrus-storage/index.md`, `docs/sui/sealed-storage/integration.md`
**Issue / impact:** `await fetch(walrusBlobUrl(…))` has no timeout, no size limit and no
`strict_consistency_check`; readers copying it inherit an unbounded read of attacker-chosen blobs.
**Remediation / evidence:** both samples use `readBlob(blobId, { aggregator:
WALRUS_AGGREGATOR_HOSTS.testnet })` from `@meddleware/walrus-client/http` (walrus-client F10), and
keep `walrusBlobUrl` only for links and `<img src>`. Re-checked 2026-10-09: the only `readBlob` uses are in
those two pages and the only bare `fetch` left is the gateway call in the access-proof sample.

### F2 — SPA fallback on a multi-page site

**Severity:** Low   **Disposition:** RESOLVED (0.0.17; static-server 0.1.4)
**Where:** `Dockerfile`, `post-bootstrap/dev/base/deployment.yaml`
**Issue / impact:** as docs F11 — clean URLs were answered with the home page, and unknown paths
(e.g. the `/sui/dao/` and `/treasury/` links two apps carried) returned 200.
**Remediation / evidence:** `CLEAN_URLS=true`, `NOT_FOUND_PAGE=/404.html`, no SPA fallback; the
apps' dead dev links were fixed (dao-ui 0.1.28, treasury-ui 0.0.11). Re-checked 2026-10-09 on the live
site (static-server 0.1.7 now): `/sui/no-such` answers 404, deep links answer 200, and the deployment
still sets the three variables.

### F3 — External link check could not run

**Severity:** Low   **Disposition:** RESOLVED (`dev` main, CI only)
**Where:** `.github/workflows/node-ci.yml`
**Issue / impact:** lychee 0.24 refuses root-relative links without a root directory, so the check
errored on the site's own links rather than testing external ones.
**Remediation / evidence:** `--root-dir ${{ github.workspace }}/docs` with `--scheme https --scheme
http`: internal links stay with the VitePress build, lychee tests external links (0 errors locally).
Re-read 2026-10-09: both lychee steps in `node-ci.yml` are unchanged (npmjs.com excluded,
`--accept 200,206,429`; report-only on push, blocking weekly).

### F4 — Static site hardening

**Severity:** Positive — no off-origin scripts; VitePress's inline bootstrap scripts allowed by hash
and checked on every build (re-checked 2026-10-09: 29 pages covered; the live header adds only
static-server's per-response nonce); no source maps or secrets (grep over the tracked Markdown and theme:
no secret, internal host or key text); signed, attested, digest-pinned image.

### F5 — On-chain pages imported, not authored

**Severity:** Positive — the Move packages own their developer pages; `gen:onchain` copies the pages
their manifests assign to this site from the installed (lockfile-pinned) packages. Re-checked
2026-10-09: the generator reads `node_modules` only; the id table in `docs/sui/index.md` is not part of
the generated pages (F6).

### F6 — Testnet ids in the guides are typed by hand

**Severity:** Low   **Disposition:** DEFERRED (next patch release; a build-time drift check, below)
**Where:** `docs/sui/index.md:40-41` (the "Testnet deployments" table); `docs/sui/sealed-storage/index.md:52-55`
(Seal key-server object ids)
**Issue:** the `access_gate` and `seal_policies` package ids and the `PlatformConfig` and `PolicyConfig`
object ids are literals in the table, although `SECURITY.md` invariant 1 says on-chain facts are "generated
from the published packages on every build, never hand-typed", and the SITE lens requires the same. The
values are correct today: they match `Published.toml` of `@meddleware/access-gate-sui` 0.0.6 and
`seal-policies-sui` 0.0.7, the `deployments` exports of `access-gate-client` 0.0.8 and `seal-client`
0.0.19, and the live `/sui/` page (read 2026-10-10: only `0xd7ddaa94…`, `0x3f81489d…`, `0x0c8f7349…`,
`0xee0403ba…`; no superseded id). The key-server ids match `seal-ui/src/config.ts`. Nothing detects
drift: 0.0.20 shipped without its id edits and 0.0.21 had to follow (CHANGELOG 0.0.21).
**Impact:** after the next republication the table would show the previous package; a developer copying
an id would call a superseded package. `SECURITY.md` overstates what the build guarantees.
**Remediation / evidence:** a `scripts/check-onchain-ids.mjs` step in `build` that compares the table with
`ACCESS_GATE_DEPLOYMENTS` and `SEAL_POLICIES_DEPLOYMENTS` (add the two clients as devDependencies), or
generate the table from them; until then reword `SECURITY.md` invariant 1 to say that the imported
pages are generated and the table is checked by hand.

### F7 — Code samples no longer match the current client signatures

**Severity:** Low   **Disposition:** DEFERRED (next patch release; edit the samples and add a type-check, below)
**Where:** `docs/sui/access-gate/integration.md:29-56` (`buildAccessProof`);
`docs/sui/walrus-storage/integration.md:18-35` (`createGatedAccess`) and `:57` (`createRelayAccessToken`);
`docs/sui/sealed-storage/index.md:36-58` and `integration.md:6-25` (`SealController`, `encrypt`)
**Issue:** every imported name exists in the installed packages (checked by script 2026-10-09:
`access-gate-client` 0.0.8, `seal-client` 0.0.19, `walrus-client` 0.0.26, `nft-gate-client` 0.0.16, `ui`,
`design-tokens`; `useWallet` in `wallet-adapter`), but several call shapes are the pre-2026-10-08 ones:
- `buildAccessProof({ address, challenge, sign })` — since nft-gate-client 0.0.16 (protocol v2) it also
  requires `gateway`, `gateId` and `network` (the signed message binds them); the sample does not
  compile and would be refused at runtime.
- `createGatedAccess({ … })` and `createRelayAccessToken({ … })` — walrus-client now requires `gateId` and
  `network` (signed into every proof).
- the Seal sample builds `SealController` without `accessGateOriginalId`, so `encrypt('nft-gate', …)` does
  not read the gate, and the guide never says that sealing to a gate that mints **transferable** passes is
  refused by default (seal-client 0.0.18; `allowTransferableGates` opts in): a holder can freeze or share
  such a pass and the content becomes effectively public. Sample and text teach sealing to any gate.
- `parseSealedManifest(untrustedJson)` omits the registry argument that validates a manifest's `params`
  at import (seal-client 0.0.17; optional, but the safer form).
**Impact:** the realistic harm named in the severity ceiling: a developer copies a sample that does not
run, or that seals content to a gate whose passes can be made public. No user funds are involved.
**Remediation / evidence:** pass the three extra fields in the access and Walrus samples; set
`accessGateOriginalId` in the Seal sample and add one sentence and a warning on soulbound-only sealing;
pass `registry` to `parseSealedManifest`. To stop recurrence, extract the fenced `ts` blocks and
type-check them against the installed packages in CI (the earlier import-name check was manual and could
not see argument drift).

### F8 — The gateway guide describes the pre-v2 protocol and configuration

**Severity:** Low   **Disposition:** DEFERRED (next patch release; edit `gateway.md`, `index.md`)
**Where:** `docs/sui/access-gate/gateway.md:28-31` and `:36-50`, `docs/sui/access-gate/index.md:35`
**Issue:** the pages say the wallet signs `nft-gate:access:<nonce>` and list `GATE_ID` as optional. Since
nft-gate 0.0.19 / nft-gate-client 0.0.16 the signed message is `nft-gate:access:v2`, multi-line, binding
the gateway origin, gate id, network, nonce and (single-use) consume digest, and the Workers gateway
requires `GATE_ID`, `GATEWAY_ORIGIN` (a canonical https origin) and `NETWORK` (`gateway-workers/src/config.ts`
`req(...)`). The responses table omits that `409` carries `code: redeemed | leased`. The Docker snippet
for the Rust gateway has the same gaps; that gateway is kept at parity but is not deployed.
**Impact:** an operator following the guide deploys a gateway that refuses to start, or a client builds a
v1 message that every v2 gateway rejects. Both fail closed.
**Remediation / evidence:** describe the v2 message by pointing at nft-gate-client's README (the message
and `vectors.json` are defined there), add the three required variables, and list the `409` codes
(`GATEWAY_CONFLICT_CODES` in nft-gate-client).

### F9 — The npm package carries generated and internal files

**Severity:** Low   **Disposition:** DEFERRED (next patch release; add an `.npmignore`)
**Where:** `package.json` `files` (`"docs"`); there is no `.npmignore`
**Issue:** `files` whitelists all of `docs/`, and the repository has no `.npmignore`, so
`docs/sui/onchain/` and `docs/.vitepress/generated/` (copies of the Move packages' pages, produced by
`gen:onchain`) ship in the tarball: the published 0.0.22 lists nine such files (44 files in all). The
next release would also ship `docs/audit/dev-audit.md` (`npm pack --dry-run`, 2026-10-09: 62 files). The
published 0.0.22 does not contain an audit (the file was relocated afterwards and is untracked until
committed). The site is unaffected: `srcExclude: ['audit/**']` and the live `/audit/dev-audit` answers
404, but no build step asserts that the page is absent from `dist/`.
**Impact:** duplicates of other packages' documentation under this package's name (stale after the source
package moves on), and an internal review in a public package (SITE-M4, SITE *Drafts & unpublished
material*, *Generated-content integrity*: generated output must stay out of published artefacts).
**Remediation / evidence:** add `.npmignore` with `docs/audit/`, `docs/sui/onchain/` and
`docs/.vitepress/generated/` (the docs repo's `.npmignore` already excludes its generated subtrees), and
extend `check-csp-inline.mjs`'s walk over `dist/` to fail on an `audit` page.

### F10 — The CI workflow has no `npm test` step

**Severity:** Info   **Disposition:** DEFERRED (one line in `node-ci.yml`, when the site gains a test)
**Where:** `.github/workflows/node-ci.yml`; `docker-publish.yml` `verify` calls it; `npm-publish.yml` `verify`
**Issue:** `node-ci.yml` runs the audit gate, type-check, the three linters, the build and the licence
check, but no `npm test`; the image release's `verify` job is a call to it (0.0.22, `22e82bb`), so unit
tests would no longer gate the release, and the comment in `docker-publish.yml` ("type-check, lint,
tests, build, licences") overstates it. The npm job's `verify` runs `npm run test --if-present`.
**Impact:** none today: `package.json` defines no `test` script and the repository has no test files, so
no test is skipped. The first test added (for example the sample type-check of F7) would not run in CI or
in the release gate (TS lens: every test project that exists runs in CI).
**Remediation / evidence:** add `- run: npm test --if-present` to `node-ci.yml` and correct the comment.
Verified by reading all three workflows and `package.json` 2026-10-09.

### F11 — Image release gate, scan, notices and runtime user

**Severity:** Low   **Disposition:** RESOLVED (0.0.20 `439bfed`, 0.0.22 `22e82bb`)
**Where:** `.github/workflows/docker-publish.yml`, `Dockerfile`, `scripts/third-party-licenses.mjs`, `post-bootstrap/dev/base/deployment.yaml`
**Issue:** the image release was gated by a subset of CI, the published image was not scanned before
signing, the lockfile was not in the image (the SBOM saw only the base), no third-party licence texts were
served with the bundled npm code, and the runtime user was only inherited from the base.
**Impact:** a tag could ship what CI would have refused; an SBOM that misses the bundled dependencies;
redistributed MIT/Apache code without its notices.
**Remediation / evidence:** `verify` calls `node-ci.yml` (`workflow_call`) and all four build jobs `need`
it; the public job runs Trivy on the pushed digest (CRITICAL/HIGH, fixable only, `exit-code: 1`) before
`cosign sign`, then an SPDX SBOM attestation and build provenance for quay.io and Docker Hub, with no
`continue-on-error` on the public path; the Dockerfile runs `npm run licenses` in the build stage, copies
`package-lock.json` to `/usr/share/doc/dev/`, and CI runs `check:licenses`; `/THIRD_PARTY_LICENSES`
returns HTTP 200 live (2026-10-10); the runtime base is static-server 0.1.7 (Go 1.26.9) with an explicit
`USER 65534:65534`; the pod sets `automountServiceAccountToken: false`, `runAsNonRoot` uid 65534,
read-only root, all capabilities dropped, `RuntimeDefault` seccomp, probes and limits; the digest is
identical in `config/images.yaml` and the overlay; all images cosign-verified 2026-10-09
(`verify-digests.sh`, 16/16). Not run: a Trivy *config* scan of the Dockerfile and manifests (the image
scan runs at release).

### F12 — The template dependency range does not name the resolved version

**Severity:** Info   **Disposition:** DEFERRED (next patch release; bump and re-lock)
**Where:** `package.json` (`@meddleware/sui-token-template ^1.0.7`)
**Issue:** the range resolves to 1.0.8 (the latest published; lockfile and `npm ls` 2026-10-09), which the
on-chain pages need (supply and metadata policies applied in the coin's `init`), but the manifest does not
say so. Every other first-party range is at its latest published version (access-gate-sui `^0.0.6`,
seal-policies-sui `^0.0.7`, ui `^0.1.31`, design-tokens `^0.1.9`).
**Impact:** a lockfile regeneration could resolve either version; documentation accuracy only.
**Remediation / evidence:** set `^1.0.8` and regenerate the lockfile.

### F13 — `connect-src` allows any https origin

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `Dockerfile` (`CSP` argument); live header read 2026-10-10
**Issue:** `connect-src 'self' https:` and `img-src 'self' data: blob: https:` are blanket allowances,
copied from the application images; the Dockerfile comment justifies them with operator-configured RPC
and relay hosts, which this static site does not have.
**Impact:** an injected script could send data to any https host. Script injection is the prerequisite,
and `script-src 'self'` with two hashes and a nonce, no off-origin script (F4) and no `v-html`/`eval` in
the theme is the control on that; the site holds no secret or session.
**Remediation / evidence:** accepted for now (same decision as docs F19); tightening `connect-src` to
`'self'` needs a browser probe of the local search first (not done).

### F14 — The cosign identity pins the repository, not the workflow

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `bootstrap/images/verify-digests.sh` (workspace); this repository publishes no verify command
**Issue:** the cluster check accepts any workflow identity of `github.com/meddleware-org/dev`.
**Impact:** a workflow added by someone with write access could sign an image the check would accept.
**Remediation / evidence:** the repository is the signing boundary; anchoring to
`docker-publish.yml@refs/tags/v*` is a `COSIGN_IDENTITY_REGEXP` override in the workspace script. The
deployed digest verified 2026-10-09 (16/16).

### F15 — Self-hosted registry mirror and registry credentials

**Severity:** Info   **Disposition:** DEFERRED (maintainer; `OPERATOR_TASKS.md` "Image registry credentials — record scope and rotation")
**Where:** `docker-publish.yml` private build and merge jobs (`continue-on-error: true`); `QUAY_TOKEN`, `DOCKERHUB_TOKEN`
**Issue:** the mirror jobs fail without registry credentials and never sign; the quay.io and Docker Hub
tokens are long-lived and not yet inventoried.
**Impact:** the mirror may lag; a leaked token could push an unsigned tag (the cluster pins digests and
verifies signatures, so it would not run).
**Remediation / evidence:** the mirror is listed as best-effort; the public jobs have no
`continue-on-error`. The credential inventory (scope, holder, expiry, rotation) is the maintainer item.

### F16 — The npm publish gate is a subset of CI

**Severity:** Low   **Disposition:** ACCEPTED-RISK
**Where:** `.github/workflows/npm-publish.yml`
**Issue:** the npm job's `verify` runs `npm ci`, the audit gate, type-check and `npm run test
--if-present`, not the full CI workflow (linters, build, licence check). The image release (F11) does run
the full workflow on the same tag.
**Impact:** a tag could publish the source package while the image job refuses the same commit. The
package is source (`docs/`, `scripts/`), not the built site.
**Remediation / evidence:** accepted: OIDC-published with provenance, tag == version checked, idempotent,
opt-in through `NPM_PUBLISH` (enabled; `@meddleware/dev` 0.0.22 is on npm). Calling `node-ci.yml` from
`npm-publish.yml` would close it; not required for safety.

### F17 — Contributor documents disagree with the pipeline

**Severity:** Info   **Disposition:** DEFERRED (next patch release; documentation)
**Where:** `CLAUDE.md` ("`npm run build` is the only required CI step"); `SECURITY.md` invariant 1 (F6)
**Issue:** CI also runs the audit gate, type-check, three linters and the licence check, and the image
build runs the CSP check; `SECURITY.md` says ids are never hand-typed (F6). `CLAUDE.md` and the audit
agree on the white-label and drafts rules, which hold (`drafts/` is outside `srcDir`, absent from `files`
and from the site).
**Impact:** documentation only.
**Remediation / evidence:** reword both after F6 is fixed.

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | Static content only | source | build | HOLDS |
| I2 | Samples import only real exports and use the hardened APIs | content | export check; review | HOLDS (F1) |
| I3 | Every inline script allowed by the CSP hashes | `check-csp-inline.mjs` | build | HOLDS (F4) |
| I4 | Internal links resolve; external links checked | VitePress; lychee | CI | HOLDS (F3) |
| I5 | Each URL serves its own page; unknown URLs 404 | static-server options | docs image probe (same configuration) | HOLDS (F2) |
| I6 | Generated pages from pinned inputs | `gen-onchain.mjs` | lockfile | HOLDS (F5) |
| I7 | On-chain ids shown to readers equal the recorded deployment | typed literals in `docs/sui/index.md` and `sealed-storage/index.md` | manual comparison 2026-10-09 against `Published.toml`, client `deployments`, `seal-ui` config and the live page; no automated check | HOLDS (code-only) — F6 |
| I8 | Samples call the current client signatures | content | names checked by script; arguments by hand | GAP — see F7 |
| I9 | The gateway guide matches the deployed protocol and configuration | content | read against nft-gate-client 0.0.16 and gateway-workers 0.0.21 | GAP — see F8 |
| I10 | Drafts and the audit file are absent from every published artefact | `drafts/` outside `srcDir`, `srcExclude` (site); nothing for the npm package | live `/audit/dev-audit` 404; `npm pack` lists the audit and generated pages | GAP — see F9 |
| I11 | The unit tests run on every change and every release | none (`node-ci.yml` has no test step) | none; the site has no tests | GAP (nothing to run today) — see F10 |
| I12 | The release ships only what full CI accepted, scanned and signed | `docker-publish.yml` `verify` → `node-ci.yml`; Trivy before cosign | workflow read 2026-10-09 | HOLDS (F11) |

### Lens categories

| Lens | Category | Status |
| --- | --- | --- |
| SITE | Generated-content integrity | HOLDS (I6) — the generator reads lockfile-pinned installed packages; output (`docs/sui/onchain/`, `.vitepress/generated/`) is git-ignored and `.dockerignore`d; `ONCHAIN_DOCS_ROOT` is a local preview override only. The generator fails soft (placeholder pages) |
| SITE | On-chain facts | GAP — typed literals (I7, F6); the generated on-chain pages come from the packages |
| SITE | Drafts & unpublished material | site HOLDS (`drafts/` outside `srcDir`, `srcExclude`, live 404); npm package GAP (I10, F9); no build-output check |
| SITE | No sensitive content | HOLDS — no secret, internal host or private-key text in the tracked Markdown; audience separation stated (developers here, end users on `docs.`); white-label content is annotation-only |
| SITE | Links | HOLDS (I4) — VitePress fails on internal dead links; weekly blocking lychee run, npmjs.com excluded |
| SITE | Inline scripts | HOLDS (I3) — two hashes in the `CSP` argument, `check-csp-inline.mjs` in the image build; the live header adds only static-server's nonce |
| SITE | Accuracy against code | GAP — imported pages are generated; hand-written samples have drifted from the client signatures (I8, F7) and the gateway guide from protocol v2 (I9, F8) |
| SITE | Serving semantics | HOLDS (I5) |
| VUE | Hosting headers | HOLDS — live (2026-10-10): CSP (`default-src 'self'`, `script-src 'self'` + two hashes + nonce, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `upgrade-insecure-requests`), HSTS 1 year, nosniff, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`; blanket `connect-src https:` is F13 |
| TS | Compiler strictness, assertions, validation, money, network I/O, encoding, dynamic code | HOLDS — `strict: true` over the VitePress config and theme (`tsc --noEmit` in CI); the script is `.mjs` and reads `node_modules` only; no `v-html`, `eval` or `fetch` in the theme; the guides' samples are Markdown, not compiled (F7) |
| TS | Supply chain | HOLDS — `npm ci`, audit gate in CI and the npm job (1 allowlisted, 0 open), `npm@11.20.0` pinned in publish; packaging F9; first-party range F12 |
| TS | Test projects in CI | N/A today — the site has no tests; the CI workflow has no test step (F10) |
| IMG | Base images, build context, reproducible build, no secrets, runtime user, scan, SBOM and notices | HOLDS (F11) — digest-pinned `node:24-slim` and static-server 0.1.7; `.dockerignore` excludes `node_modules`, `dist`, caches, generated output, `.git`, `.github` and `.env*.local`; `npm ci`; the only `ARG` is the public `CSP`; Trivy before cosign; lockfile in the image; `/THIRD_PARTY_LICENSES` served |
| IMG | Verification command | GAP accepted — the identity pins the repository (F14) |
| IMG | Deployment pinning | HOLDS — digest in `config/images.yaml` and the overlay; the base manifest's tag (`0.0.1`) is overridden by the overlay digest and is cosmetic |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned version | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| `vitepress` | 2.0.0-alpha.20 (lockfile) | build only | clean | pre-release; the CSP check fails the build when its inline scripts change |
| `@meddleware/access-gate-sui`, `seal-policies-sui`, `sui-token-template` | `^0.0.6`, `^0.0.7` (latest), `^1.0.7` (resolves 1.0.8, the latest) | build only | clean | on-chain pages; F12 |
| `@meddleware/ui`, `design-tokens` | `^0.1.31`, `^0.1.9` (latest) | theme | clean | |
| `@mysten/*` | none (the samples use them; they are not installed here) | — | — | ADR-0001 baseline `@mysten/sui ^2.33.1` is what the samples assume |
| Link checker | lychee-action pinned by SHA | none | — | CI only |
| `node:24-slim` / `static-server` | digest-pinned / 0.1.7 | build / runtime | Trivy at release (F11); Go 1.26.9 | — |
| dev tooling | lockfile | no | GHSA-vfj7-8cjw-p6xm allowlisted to 2027-01-01 | TS lens B.TS-3 |

Install-time code (TS B.TS-2): the lockfile has one lifecycle script, `fsevents` (dev, optional, macOS
only); no `allowScripts`, no `overrides`, no `prepare`/`postinstall`. `files`: `docs`, `tsconfig.json`,
`CHANGELOG.md`, `scripts` (`npm pack --dry-run` 2026-10-09: 62 files, 2.3 MB; no tests, fixtures or
`.env*`; generated pages and the audit file, F9). Node range `^22.18.0 || >=24.12.0`; CI and the image use 24.

### B.2 Publish authority, capabilities & secret custody

| Authority / secret | Where held | Custody | Gates | Rotation |
| --- | --- | --- | --- | --- |
| npm publish | GitHub Actions | OIDC + provenance | package | n/a |
| `QUAY_TOKEN`, `DOCKERHUB_TOKEN`, `PRIVATE_REGISTRY_*` | GitHub secrets | long-lived robot accounts (inventory: `OPERATOR_TASKS.md`) | image push | F15 |
| image signing | GitHub Actions | cosign keyless | images | n/a |

CI & release integrity: actions pinned by SHA (workflows read 2026-10-09); explicit `permissions:` per
workflow and job (`id-token`/`attestations` only on the signing job, `id-token` only on the npm publish
job); OIDC publish with a tag == version check and an idempotent registry check; npm client pinned
(`npm@11.20.0`); image release = full CI via `workflow_call` + Trivy + cosign + SPDX SBOM attestation +
provenance, no `continue-on-error` on the public path (F11; the CI workflow has no test step, F10; the npm
gate is a subset, F16); `npm ci` everywhere; audit gate in CI and the npm job; Dependabot weekly and
grouped for npm, Docker and Actions (`.github/dependabot.yml`); no test-only build mode exists; no job
spends real funds.

### B.VUE-1 Hosting headers

Live headers on `dev.meddleware.co.uk`, read 2026-10-10: `Content-Security-Policy` (`default-src 'self'`,
`script-src 'self'` with the two VitePress hashes and a per-response nonce, `style-src 'self'
'unsafe-inline'`, `img-src 'self' data: blob: https:`, `connect-src 'self' https:`, `worker-src 'self'
blob:`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`,
`upgrade-insecure-requests`), `Strict-Transport-Security` (1 year, includeSubDomains),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`. The CSP is static-server's
(`CONTENT_SECURITY_POLICY` from the `CSP` build argument); no static host and no `_headers` file.
`'unsafe-inline'` is for styles only. The blanket `https:` in `connect-src` and `img-src` is F13. The
inline-script rule is enforced at build time by `check-csp-inline.mjs` (SITE and VUE lenses).

### B.VUE-2 / B.IMG Build inputs and artifacts

`node:24-slim@sha256:0e0ff40c…` builder and `static-server:0.1.7@sha256:2e227311…` runtime, both
digest-pinned (Dependabot Docker group); `npm ci`; `.dockerignore` excludes local installs, build output,
VCS data and every `.env*.local`; `npm run build && npm run licenses` run in the build stage; the runtime
stage copies `dist` and the lockfile only; `USER 65534:65534`; the only `ARG` is the public `CSP`;
VitePress emits no source maps for the production build; the deployment is read-only root,
`runAsNonRoot` uid 65534, no privilege escalation, all capabilities dropped, `RuntimeDefault` seccomp,
`automountServiceAccountToken: false`, probes, and requests/limits; digest `sha256:dfad63d6…` in both
`config/images.yaml` and the overlay; cosign signature verified 2026-10-09 (F14). Not run: a Trivy
*config* scan of the Dockerfile and manifests (F11).

### B.SITE Generator inputs

| Input | Version / pin | Used for |
| --- | --- | --- |
| vitepress | 2.0.0-alpha.20 (lockfile) | site build |
| access-gate-sui, seal-policies-sui, sui-token-template | 0.0.6, 0.0.7, 1.0.8 (lockfile) | `gen-onchain.mjs` |
| lychee | `lycheeverse/lychee-action` v2.9.0 (SHA) | external-link check |

Latest-ID rule: the generated pages and the typed table show a package id that is both published-at and
original-id (first versions of the republished packages); the table labels the two columns and says
"same (v1)".

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — N/A (static content)

No unit tests exist (framework: none; `package.json` has no `test` script). The gates are type-check, three
linters (stylelint, eslint with vuejs-accessibility, html-validate over the theme components), the
build's internal dead-link check, the CSP hash check (29 pages; image build), the licence-notice check
and the external link checks, all in `node-ci.yml` except the CSP check. The sample-import check is a
manual script (names only), not CI; it cannot see argument drift (F7). The production build and the
generator run from a clean checkout in CI.

### C.2 Hermetic vs. live paths

| Path | Hermetic? | Deferred to | Tracking |
| --- | --- | --- | --- |
| Build and checks | yes | — | CI |
| Samples against the current client signatures | no (needs the packages installed) | manual today | F7 |
| External links | no | CI (weekly, blocking) | lychee |
| Served behaviour (clean URLs, 404, headers, notices) | no | deployment | live probe 2026-10-09/10 (deep links 200, unknown path 404, headers, `/THIRD_PARTY_LICENSES` 200) |

## Section D — Deployment-readiness gates

### pre-localnet

- [x] build, type-check and linters green; no secrets in source (2026-10-09)
- [x] generator reads pinned inputs (lockfile); generated output git-ignored; drafts outside the published tree (`drafts/`, `srcExclude`)

### pre-testnet

- [x] deployed with digest pinning; CSP and HSTS verified
- [x] 0.0.22 deployed by digest; live probe of a deep link and an unknown path, headers and `/THIRD_PARTY_LICENSES` (2026-10-10)
- [x] inline scripts hash-covered and checked at build time (`check-csp-inline.mjs`, 29 pages); link check in CI (F3)
- [x] image: digest-pinned bases, non-root, restricted pod, probes and limits, signed with SBOM and provenance, scanned before signing (F11)
- [ ] on-chain facts generated from the canonical record — typed literals today (F6, next patch)
- [ ] samples match the current client signatures; gateway guide matches protocol v2 (F7, F8, next patch)
- [ ] every test project runs in CI — F10 (nothing to run today; next patch)
- [ ] the audit file and generated pages are excluded from the npm package — F9 (next patch)

### pre-mainnet

- [ ] mainnet identifiers in the integration guides once published — mainnet-blocked
- [x] no sensitive or operator-only content published; audience separation stated (developers here, end users on `docs.`)
- [ ] API/flag/env pages generated or version-stamped — the gateway configuration table is hand-written and stale (F8, next patch)
- [ ] registry credential inventory and rotation (F15) — `OPERATOR_TASKS.md` "Image registry credentials"
- [ ] external review — maintainer item (`OPERATOR_TASKS.md` "Funding, grants and an external audit")

## Cross-project themes

- **Samples are code** — guides teach the hardened client APIs, not raw requests (F1).
- **Retired features** — no dev pages for DAO or Treasury; apps link the Access Gate guide instead.
- **Supply chain & release integrity** — lockfile (also shipped in the image); first-party libraries at
  their latest versions (F12 for the template range); signed images with SBOM and provenance, Trivy
  before signing, SHA-pinned actions, grouped Dependabot; expiring audit allowlist; publish authority in B.2.
- **Wire-format coupling** — the gateway proof message is defined in nft-gate-client and pinned by its
  `vectors.json`; this site restates it by hand and is behind (F8).
- **On-chain-truth boundary** — the guides state no accounting; fees and terms come from the generated
  on-chain pages; the typed ids are F6.
- **Deployment readiness** — Section D.
- **Chain-access layering** — the guides teach the layered clients (`access-gate-client`, `seal-client`,
  `walrus-client`); ids shown are the latest on-chain version, typed by hand (F6).

## Normative requirements (MUST / MUST NOT)

- **TS-M1–TS-M9** — hold where applicable (the lens's rule that every test project runs in CI is vacuous
  today, F10; TS-M7 packaging has gaps, F9).
- **IMG-M1–IMG-M8** — hold; IMG-M8's verification command pins the repository only (F14).
- **VUE-M8** — holds (CSP and HSTS on the one hosting path, B.VUE-1).
- **SITE-M1, M4, M5** — hold; **SITE-M2** (on-chain facts from the canonical record) is not met
  mechanically (F6); **SITE-M3** holds for the site, not for the npm package (F9). The *Accuracy against
  code* category is not met for the samples and the gateway guide (F7, F8).

## Implementation suggestions (SHOULD / MAY)

- SHOULD type-check the fenced `ts` samples against the installed packages in CI (F7); the import-name
  check alone cannot see argument drift.
- SHOULD tighten `connect-src` to `'self'` after a browser probe of search and the footer (F13).
- MAY run a Trivy configuration scan of the Dockerfile and manifests in CI.

## Open questions (`OQ#`)

None.

## Risks

- **Sample drift** — samples fall behind API changes; type-checking them is not automated (F7, F8 are
  instances).
- **Pre-release generator** — VitePress is an alpha; a bump can change the emitted inline scripts (the
  build check fails closed) or the page structure.
- **Registry tokens** — long-lived robot tokens for image pushes (F15).
- **Upstream package liveness** — the build needs the registry to resolve the pinned packages; a missing
  generator input degrades to placeholder pages rather than failing (F5).

## Re-verification log

- 2026-10-03 — first full pass under AUDIT_TEMPLATE.md + TS + VUE + IMG + SITE (Phase 7). F1, F2
  RESOLVED in 0.0.17 (static-server 0.1.4); F3 RESOLVED in CI.
- 2026-10-03 — deployed 0.0.17 with the manifest change; live: `/sui/dao/` 404. The re-dispatched blocking link check is green after excluding npmjs.com pages (403 to CI runners).
- 2026-10-08 — Lens dates reconciled with the registry (`check-template-dates.mjs`): base 2026-10-08, and SUI_CLIENT/GO 2026-10-08 and TS 2026-10-03 where cited. The changes (AUTH/PLATFORM/MCP/DB registered, the GO token row moved to AUTH, JSR in trusted publishing, layered injection guards) alter no disposition here.
- 2026-10-09 — re-verified against 0.0.22 (releases 0.0.18 to 0.0.22): every finding re-checked against the
  code, workflows, manifests, the published tarball and the live site. Template dates now cite the
  registry (TS, VUE, IMG 2026-10-08, SITE 2026-09-30); front matter gained the SITE, TS and IMG fields and
  a current deployment status (0.0.22, `sha256:dfad63d6…`, republished testnet ids). F1–F5 hold with fresh
  evidence (F2 re-probed live). New: F6 (typed ids; contradicts `SECURITY.md` invariant 1; DEFERRED), F7
  (samples behind the current `buildAccessProof`, `createGatedAccess`, `createRelayAccessToken` and Seal
  signatures; sealing to transferable gates not mentioned; DEFERRED), F8 (gateway guide describes the
  pre-v2 message and configuration; DEFERRED), F9 (npm package carries generated pages, would carry the
  audit; DEFERRED), F10 (`node-ci.yml` has no `npm test` step — the known gap; the site has no tests, so
  nothing is skipped today; DEFERRED), F11 (release gate, Trivy, lockfile, notices, `USER 65534`;
  RESOLVED 0.0.20–0.0.22), F12 (template range; DEFERRED), F13 (blanket `connect-src`; ACCEPTED-RISK),
  F14 (cosign identity; ACCEPTED-RISK), F15 (mirror and credentials; DEFERRED, maintainer), F16 (npm gate
  subset; ACCEPTED-RISK), F17 (contributor documents; DEFERRED). Verified: sui-token-template resolves
  1.0.8 in the lockfile; the live `/sui/` page shows only the new ids; CSP hash check over 29 pages; audit
  gate 1 allowlisted / 0 open. Section D ticked with evidence; unticked: the next-patch items and the
  mainnet/maintainer items.
