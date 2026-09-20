# Local development

## Running a specific app

Each app in `repos/` has a local dev server:

```bash
cd repos/walrus-ui && npm run dev    # http://localhost:5173
cd repos/seal-ui   && npm run dev
cd repos/access-gate-ui && npm run dev
cd repos/dao-ui    && npm run dev
```

All apps read environment variables from `.env.local` (git-ignored). Copy the example file to get started:

```bash
cp .env.example .env.local
# Edit VITE_NETWORK=testnet, VITE_DOCS_URL, VITE_DEV_URL, etc.
```

## Running this docs site locally

```bash
cd repos/dev
npm install
npm run dev   # http://localhost:5173
```

For the user-facing docs site:

```bash
cd repos/docs
npm install
npm run dev   # gen:api runs first (requires @meddleware/* SDK packages published)
```

## Environment variables

Common variables shared across apps:

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_NETWORK` | `testnet` | `localnet` \| `testnet` \| `mainnet` |
| `VITE_DOCS_URL` | `https://docs.meddleware.co.uk` | User docs base URL |
| `VITE_DEV_URL` | `https://dev.meddleware.co.uk` | Developer docs base URL |
| `VITE_API_BASE` | `` (same-origin) | Override API host (status-page, etc.) |

Per-service variables (e.g. `VITE_WALRUS_PUBLISHER_URL`, `VITE_NFT_GATE_URL`) are documented in each app's `.env.example`.

## Docker builds

To build and run any service as a Docker image (requires Docker Desktop or similar):

```bash
cd repos/walrus-ui
docker build -t walrus-ui:dev .
docker run -p 8080:8080 walrus-ui:dev
```

The `SPA_FALLBACK=true` env var is baked in — the static-server handles client-side routing.

## Move contracts (localnet)

For local contract development, start a localnet and publish the contracts:

```bash
sui start --with-faucet   # starts localnet on :9000; press Ctrl+C to stop
# In another terminal:
cd blockchain/sui/contracts/core
sui move build --build-env localnet
sui client publish --gas-budget 200000000
```

See [Environment setup](../sui/environment) for a full localnet workflow.
