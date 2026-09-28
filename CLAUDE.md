# CLAUDE.md — @meddleware/dev

Developer documentation site for `dev.meddleware.co.uk`. VitePress 2.0.0-alpha.20.

## Purpose

Developer-facing integration guides, SDK references, and self-host instructions. Covers:

- Getting started (toolchain, local dev)
- Design system (`@meddleware/design-tokens`, `@meddleware/ui`)
- Sui development (environment, PTB patterns, per-service integration guides)

## What this package is NOT

- No TypeDoc / API reference generation — that lives in `repos/docs/`.
- No white-label operator guides — positions annotated only (see below).
- No user-facing product documentation — that lives in `repos/docs/`.

## Build

```bash
npm run build    # vitepress build docs → dist/
npm run dev      # dev server
npm run type-check
```

No `gen:api` (TypeDoc) step. The only prebuild is `gen:onchain` (run automatically by `build`/`dev`):

- **On-chain docs are imported, never authored here.** For the Sui Move packages
  (`access-gate-sui`, `seal-policies-sui`, `sui-token-template`) the canonical on-chain docs live in
  each package repo (`docs/onchain/*.md` + `manifest.json`) and ship in its npm package.
  `scripts/gen-onchain.mjs` (run by `build`/`dev`) copies the pages the manifest assigns to this site
  into a git-ignored subtree and generates the sidebar (`docs/.vitepress/generated/`). Resolution is
  `node_modules` by default, or `ONCHAIN_DOCS_ROOT=..` to preview sibling checkouts. Fails soft
  (placeholder pages for every standard page name). Fix on-chain content in the Move repo, not here;
  hand-written pages link to the imported ones instead of duplicating Move tables.

`npm run build` is the only required CI step.

## White-label annotation convention

White-label content is not published. Positions are annotated only:

- **`docs/.vitepress/config.ts`** — `// TODO white-label: ...` on commented-out nav/sidebar entries.
- **Markdown pages** — `<!-- white-label: ... -->` HTML comment at the end of any section that would benefit from operator guidance. VitePress strips HTML comments from rendered output.

Do not remove these annotations. Do not add rendered white-label content.

## Drafts (unpublished TODO material)

`drafts/` (repo root, outside the VitePress `srcDir`) holds material for future pages that is not
yet true of anything published — currently the retired DAO page and mwSUI vault notes. Each file
opens with a status comment listing what must be verified before it moves into `docs/`. Never link
to drafts from `docs/`.

## Accuracy rule

Every snippet must match the published SDKs (`@mysten/sui` v2 + gRPC: `SuiGrpcClient`, Core API —
no `SuiClient`/`getFullnodeUrl`, no JSON-RPC) and the real `@meddleware/*` exports. Move facts come
from the imported on-chain docs; link to them instead of restating tables.

## Content boundary (docs vs dev)

| Content type | Site |
| --- | --- |
| User guides, UI walkthroughs, FAQ | `repos/docs/` → `docs.meddleware.co.uk` |
| SDK install, integration code, self-host | `repos/dev/` → `dev.meddleware.co.uk` |
| TypeDoc API reference | `repos/docs/` → `docs.meddleware.co.uk/blockchain/sui/` |

Cross-links: `dev.` nav has "API reference" pointing to `docs.`; `docs.` service reference pages have `:::tip` callouts into `dev.`.

## Sister site

`repos/docs/` (`docs.meddleware.co.uk`) is the sister site. k8s manifests live at `post-bootstrap/dev/`. Image: `quay.io/meddleware-org/dev`.
