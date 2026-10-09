# ── build stage ───────────────────────────────────────────────────────────────
# Static VitePress developer documentation site. The Docker context is this repo root.
# No VITE_* build args: the site is static content with no per-network configuration.
# No TypeDoc/gen-api step: API reference lives in the docs. site; this site links in.
# Content-Security-Policy served by static-server (verified 2026-09-30: production build loaded in
# Chromium under this policy with zero violations). script-src stays 'self' plus the sha256 hashes of VitePress's two inline bootstrap scripts (checked at build time by scripts/check-csp-inline.mjs); connect-src allows
# any https origin because RPC, relay, aggregator and Seal key-server hosts are partly operator- or
# chain-configured; img-src allows https:/data:/blob: for on-chain images and local previews.
ARG CSP="default-src 'self'; script-src 'self' 'sha256-2xX7WPApihAEgY57fPwQ4HRaWtCTrsAryoGVYhwtsA0=' 'sha256-ng8W1FnGVqbzCCV1hV2EGXSMN/WlYnkoQZy8x1kkcsM='; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests"

FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# vitepress build → dist/ (outDir is pinned to the repo root dist/ in docs/.vitepress/config.ts)
RUN npm run build
ARG CSP
# Every inline <script> VitePress emits must be allowed by the CSP hash list above.
RUN node scripts/check-csp-inline.mjs "${CSP}" dist

# ── runtime stage ─────────────────────────────────────────────────────────────
FROM quay.io/meddleware-org/static-server:0.1.7@sha256:2e2273115b7575acbeb01c6d75f867be67125405f1bda5d956ae512d13c92379
ARG CSP
ENV CONTENT_SECURITY_POLICY="${CSP}"

COPY --from=build /app/dist /app/public

# A generated multi-page site: each clean URL is served from its own .html file and an unknown path
# gets VitePress's 404 page with a real 404 status (no SPA fallback, which would answer 200 with
# the home page).
ENV SERVE_DIR=/app/public \
    CLEAN_URLS=true \
    NOT_FOUND_PAGE=/404.html \
    CACHE_IMMUTABLE_PREFIX=/assets/

# The base image already runs as nobody; say so here too so the Dockerfile is self-describing.
USER 65534:65534

EXPOSE 8080
