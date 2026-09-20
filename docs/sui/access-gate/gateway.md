# Deploy the NFT Gate gateway

The NFT Gate gateway handles the off-chain challenge/proof protocol. It issues nonces, verifies NFT ownership on-chain, and returns short-lived JWTs. Two implementations are available: a Rust/Axum service and a Cloudflare Workers implementation.

## Implementations

| Implementation | Location | Best for |
| --- | --- | --- |
| Rust/Axum | `services/nft-gate/gateway/` | Self-hosted, k8s, low latency |
| Cloudflare Worker | `services/nft-gate/worker/` | Edge deployment, zero-infra |

---

## Rust/Axum gateway

### Build

```bash
cd services/nft-gate/gateway
cargo build --release
```

### Configuration

The gateway reads environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `SUI_NETWORK` | `testnet` or `mainnet` | `testnet` |
| `SUI_RPC_URL` | Sui gRPC endpoint | testnet default |
| `JWT_SECRET` | HMAC-SHA256 signing secret (≥32 bytes) | — required |
| `CHALLENGE_TTL_SECS` | Nonce expiry | `120` |
| `TOKEN_TTL_SECS` | JWT lifetime | `3600` |
| `LISTEN_ADDR` | Bind address | `0.0.0.0:3000` |
| `LOG_LEVEL` | `debug`/`info`/`warn`/`error` | `info` |

Create `.env`:

```bash
SUI_NETWORK=testnet
JWT_SECRET=<at-least-32-random-bytes-base64>
CHALLENGE_TTL_SECS=120
TOKEN_TTL_SECS=3600
```

### Run

```bash
cargo run --release
# or with .env file
env $(cat .env | xargs) cargo run --release
```

### k8s deployment

A `Deployment` and `Service` manifest live in `post-bootstrap/nft-gate/`. The gateway is exposed via nginx-ingress at `https://nft-gate.meddleware.co.uk`. Secrets are mounted from a k8s `Secret` object:

```yaml
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: nft-gate-secrets
        key: jwt-secret
```

---

## Cloudflare Workers implementation

The Worker implementation lives in `services/nft-gate/worker/`. It is functionally equivalent to the Rust gateway but runs at the Cloudflare edge.

### Prerequisites

- Cloudflare account with Workers enabled.
- Wrangler CLI: `npm install -g wrangler`.

### Configuration

```toml
# services/nft-gate/worker/wrangler.toml
name = "nft-gate"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
SUI_NETWORK = "testnet"
CHALLENGE_TTL_SECS = "120"
TOKEN_TTL_SECS = "3600"
```

Store secrets:

```bash
wrangler secret put JWT_SECRET
# Paste a random ≥32-byte base64-encoded value
```

### Deploy

```bash
cd services/nft-gate/worker
npm install
wrangler deploy
```

---

## API endpoints

Both implementations expose the same HTTP API:

### `POST /challenge`

Request a challenge nonce for a pass.

**Body:**
```json
{ "gateId": "0x...", "passId": "0x..." }
```

**Response:**
```json
{ "challenge": "meddleware-access:v1:<nonce>", "nonce": "<hex>" }
```

### `POST /verify`

Submit the signed challenge and receive a JWT.

**Body:**
```json
{
  "gateId": "0x...",
  "passId": "0x...",
  "nonce": "<hex>",
  "address": "0x...",
  "signature": "<base64>"
}
```

**Response:**
```json
{ "token": "<jwt>", "expiresAt": 1234567890 }
```

### `GET /health`

Returns `{ "status": "ok" }`. Used by the relay registry ping check.

---

## JSON-RPC deprecation notice

::: warning Public fullnodes killed JSON-RPC in September 2026
The gateway uses `@mysten/sui` v2.x which routes through gRPC/GraphQL automatically. Do not configure an RPC URL ending in `/json-rpc` — it will fail. If you are running your own fullnode, ensure the gRPC port is reachable.
:::

<!-- white-label: operator customization guide (custom JWT claims, RBAC, rate limits, enterprise SSO) — planned -->
