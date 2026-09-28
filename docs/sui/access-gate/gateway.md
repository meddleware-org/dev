# Deploy the NFT gate gateway

[`nft-gate`](https://github.com/meddleware-org/nft-gate) is a generic **NFT-gated reverse proxy**:
put it in front of any HTTP service (an upload relay, a website, an API) and only holders of an
`access_gate` pass get through. It issues challenge nonces, verifies wallet-signed access proofs and
pass ownership on-chain, rate-limits per address, and proxies authorised requests to the upstream.
It issues no sessions or tokens of its own — every request carries a fresh proof.

## Implementations

Two wire-identical implementations share the same routes, status codes, proof format and variable
names, and are tested against the same [conformance vectors](https://github.com/meddleware-org/nft-gate/tree/main/conformance):

| Implementation | Source | Distributed as | State (nonces, rate limits) |
| --- | --- | --- | --- |
| Cloudflare Workers | `gateway-workers/` | npm `@meddleware/nft-gate-gateway`, `wrangler deploy` | Durable Objects (default) or KV |
| Rust / Axum | `gateway-rust/` | crates.io `nft-gate-gateway`, Docker `meddleware/nft-gate-gateway` | in memory, or Redis/Dragonfly for more than one replica |

Both query the chain over Sui **gRPC**.

## Routes

| Route | Auth | Behaviour |
| --- | --- | --- |
| `GET /v1/challenge` | none | `{ nonce, expiresAt }` — a fresh single-use nonce |
| `PUBLIC_PATHS` (default `/v1/tip-config`) | none | proxied without a proof (the Workers gateway also rate-limits these per client IP and edge-caches `GET`s) |
| everything else | access proof | verified, then proxied to `UPSTREAM_URL` |

The proof travels as `Authorization: Bearer <token>` (or `X-Access-Proof`), where the token is
`base64(JSON { address, nonce, signature, consumeDigest? })` and the signature is a Sui personal
message over `nft-gate:access:<nonce>`. Clients build it with
[`@meddleware/nft-gate-client`](./integration#proving-access-to-a-gateway).

## Configuration

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `UPSTREAM_URL` | ✓ | — | Base URL of the protected service |
| `SUI_RPC_URL` | ✓ | testnet fullnode | Sui fullnode (gRPC) — use a mainnet node in production |
| `NFT_TYPE` | ✓ | — | `<pkg>::access_gate::AccessNFT` or `::SoulboundAccessNFT` |
| `GATE_ID` | | — | Only accept passes minted by this gate |
| `SINGLE_USE` | | `false` | Require an on-chain `consume` bound to the nonce; each consume is redeemed once |
| `PUBLIC_PATHS` | | `/v1/tip-config` | Comma-separated unauthenticated paths |
| `RATE_LIMIT_PER_MIN` | | `30` | Per-address requests per minute (`0` disables) |
| `MAX_BODY_BYTES` | | `262144` | Request body cap (256 KiB) — raise it for uploads |
| `CHALLENGE_TTL_SECS` | | `300` | Nonce lifetime |
| `OWNERSHIP_CACHE_TTL_MS` | | `0` | Cache ownership checks (`0` = check every request) |
| `UPSTREAM_AUTH_HEADERS` | | — | `Name: value` pairs added to upstream requests (e.g. a Cloudflare Access service token) |

Implementation-specific settings (Workers: `NONCE_BACKEND`, `NONCE_SHARD`, quota guard; Rust:
`BIND_ADDR`, `REDIS_URL`, prune interval) are in each implementation's README.

## Deploy on Cloudflare Workers

```bash
git clone https://github.com/meddleware-org/nft-gate.git
cd nft-gate/gateway-workers
npm install
# edit wrangler.toml: [[routes]] pattern + zone, and the non-secret [vars]
npm run deploy                              # first deploy creates the Worker + Durable Object

wrangler secret put UPSTREAM_URL            # https://your-origin.example.com
wrangler secret put NFT_TYPE                # 0x<pkg>::access_gate::SoulboundAccessNFT
wrangler secret put UPSTREAM_AUTH_HEADERS   # only if the origin is Access-locked
curl https://gate.example.com/v1/challenge  # → {"nonce":"…","expiresAt":…}
```

`[vars]` in `wrangler.toml` are overwritten on every deploy; keep credentials in secrets.

A Worker runs at the edge, so `UPSTREAM_URL` must be publicly routable. Lock that origin so only
the gateway can reach it — e.g. a Cloudflare Access application allowing only a service token, whose
headers the gateway sends via `UPSTREAM_AUTH_HEADERS`. Without this, anyone can call the origin
directly and skip the pass check.

## Deploy with Docker (Rust)

```bash
docker run -p 8080:8080 \
  -e UPSTREAM_URL=http://relay:57391 \
  -e SUI_RPC_URL=https://fullnode.testnet.sui.io:443 \
  -e NFT_TYPE=0x<pkg>::access_gate::AccessNFT \
  meddleware/nft-gate-gateway
```

Run one replica with the in-memory nonce store, or set `REDIS_URL` before scaling out — otherwise a
nonce could be accepted once per replica.

## Responses

| Status | Meaning |
| --- | --- |
| `401` | no access proof |
| `403` | malformed proof, bad signature, unknown/expired/reused nonce, missing consume (single-use), or the address holds no matching pass |
| `409` | single-use: that consume was already redeemed, or a request using it is in flight (released again if the upstream fails) |
| `413` | body above `MAX_BODY_BYTES` |
| `429` | rate limit exceeded |
| `502` | the gateway could not query the chain |

Anything else comes from the upstream.

## Trust model

- The gateway, not the chain, enforces nonce freshness and single-use redemption; run one logical
  nonce store per gateway.
- Ownership is checked live unless `OWNERSHIP_CACHE_TTL_MS` is set; with caching, a pass sold or
  burned keeps working until the entry expires.
- A gateway trusts its Sui fullnode; point `SUI_RPC_URL` at a node you trust.

<!-- white-label: operator customization guide (custom domains, rate limits, multiple gates per upstream) — planned -->
