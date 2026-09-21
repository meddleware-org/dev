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

No `gen:api` step. `npm run build` is the only required CI step.

## White-label annotation convention

White-label content is not published. Positions are annotated only:

- **`docs/.vitepress/config.ts`** — `// TODO white-label: ...` on commented-out nav/sidebar entries.
- **Markdown pages** — `<!-- white-label: ... -->` HTML comment at the end of any section that would benefit from operator guidance. VitePress strips HTML comments from rendered output.

Do not remove these annotations. Do not add rendered white-label content.

## Content boundary (docs vs dev)

| Content type | Site |
| --- | --- |
| User guides, UI walkthroughs, FAQ | `repos/docs/` → `docs.meddleware.co.uk` |
| SDK install, integration code, self-host | `repos/dev/` → `dev.meddleware.co.uk` |
| TypeDoc API reference | `repos/docs/` → `docs.meddleware.co.uk/blockchain/sui/` |

Cross-links: `dev.` nav has "API reference" pointing to `docs.`; `docs.` service reference pages have `:::tip` callouts into `dev.`.

## Sister site

`repos/docs/` (`docs.meddleware.co.uk`) is the sister site. k8s manifests live at `post-bootstrap/dev/`. Image: `quay.io/meddleware-org/dev`.
