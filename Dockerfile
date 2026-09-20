# ── build stage ───────────────────────────────────────────────────────────────
# Static VitePress developer documentation site. The Docker context is this repo root.
# No VITE_* build args: the site is static content with no per-network configuration.
# No TypeDoc/gen-api step: API reference lives in the docs. site; this site links in.
FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# vitepress build → dist/ (outDir is pinned to the repo root dist/ in docs/.vitepress/config.ts)
RUN npm run build

# ── runtime stage ─────────────────────────────────────────────────────────────
FROM quay.io/meddleware-org/static-server:0.1.0

COPY --from=build /app/dist /app/public

ENV SERVE_DIR=/app/public \
    SPA_FALLBACK=true \
    CACHE_IMMUTABLE_PREFIX=/assets/

EXPOSE 8080
