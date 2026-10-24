# Deploy the access-gate gateway

[`access-gate-gateway`](https://github.com/meddleware-org/access-gate-gateway) is a generic **NFT-gated reverse proxy**:
put it in front of any HTTP service (an upload relay, a website, an API) and only holders of an
`access_gate` pass get through. It issues challenge nonces, verifies wallet-signed access proofs and
pass ownership on-chain, rate-limits per address, and proxies authorised requests to the upstream.
It issues no sessions or tokens of its own — every request carries a fresh proof.

## Implementations

Two wire-identical implementations share the same routes, status codes, proof format and variable
names, and are tested against the same [conformance vectors](https://github.com/meddleware-org/access-gate-gateway/tree/main/conformance):

| Implementation | Source | Distributed as | State (nonces, rate limits) |
| --- | --- | --- | --- |
| Cloudflare Workers | `gateway-workers/` | npm `@meddleware/access-gate-gateway`, `wrangler deploy` | Durable Objects (default) or KV |
| Rust / Axum | `gateway-rust/` | crates.io `access-gate-gateway`, Docker `meddleware/access-gate-gateway` | in memory, or Redis/Dragonfly for more than one replica |

Both query the chain over Sui **gRPC**.

## Routes

| Route | Auth | Behaviour |
| --- | --- | --- |
| `GET /v1/challenge` | none | `{ nonce, expiresAt }` — a fresh single-use nonce |
| `PUBLIC_PATHS` (default `/v1/tip-config`) | none | proxied without a proof (the Workers gateway also rate-limits these per client IP and edge-caches `GET`s) |
| everything else | access proof | verified, then proxied to `UPSTREAM_URL` |

The proof travels as `Authorization: Bearer <token>` (or `X-Access-Proof`), where the token is
`base64(JSON { address, nonce, signature, consumeDigest? })`. The signature is a Sui personal message
(protocol **`access-gate-gateway:access:v3`**) that binds the proof to this gateway, so a proof made for another
gateway, gate or network is useless here:

```text
access-gate-gateway:access:v3
origin:<GATEWAY_ORIGIN>
gate:<GATE_ID>
network:<NETWORK>
nonce:<nonce>
consume:<base58 digest>      (single-use gateways only)
```

The gateway rebuilds this message from its own configuration, so `GATEWAY_ORIGIN`, `GATE_ID` and
`NETWORK` are required settings. The message grammar and the conformance `vectors.json` are defined
by [`@meddleware/access-gate-gateway-client`](https://github.com/meddleware-org/access-gate-gateway-client#wire-protocol);
clients build it with `buildAccessProof`, see
[proving access to a gateway](./integration#proving-access-to-a-gateway).

## Configuration

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `UPSTREAM_URL` | ✓ | — | Base URL of the protected service (a secret: it is never logged) |
| `GATEWAY_ORIGIN` | ✓ | — | This gateway's canonical public origin (`https://host`, no path, lower-case); signed into every proof, so it must equal the hostname clients call |
| `NETWORK` | ✓ | — | `localnet` \| `devnet` \| `testnet` \| `mainnet`; signed into every proof |
| `SUI_RPC_URL` | ✓ | testnet fullnode (Workers) | Sui fullnode (gRPC) — use a mainnet node in production |
| `NFT_TYPE` | ✓ | — | `<access_gate original id>::access_gate::AccessNFT` or `::SoulboundAccessNFT`; any other type is rejected at startup |
| `GATE_ID` | ✓ | — | The gate whose passes are accepted; also read live, so a paused gate with `pause_blocks_access` denies its holders |
| `SINGLE_USE` | | `false` | Require a `consumeDigest` naming a successful `consume` by the proof address on `GATE_ID`; each digest is redeemable once |
| `PUBLIC_PATHS` | | `/v1/tip-config` | Comma-separated unauthenticated paths |
| `RATE_LIMIT_PER_MIN` | | `30` | Per-address requests per minute (`0` disables) |
| `MAX_BODY_BYTES` | | `262144` | Request body cap (256 KiB) — raise it for uploads |
| `CHALLENGE_TTL_SECS` | | `300` | Nonce lifetime |
| `OWNERSHIP_CACHE_TTL_MS` | | `0` | Cache ownership checks (`0` = check every request) |
| `UPSTREAM_AUTH_HEADERS` | | — | JSON array `[{"name":…,"value":…}]` of headers added to upstream requests (e.g. a Cloudflare Access service token); invalid JSON fails closed |
| `ALLOWED_ORIGINS` | | none | Comma-separated canonical browser origins granted CORS; unset grants none |

The table is a summary, checked against access-gate-gateway 0.0.22 (then named `nft-gate`) (`gateway-workers` and `gateway-rust`); a later
release may add settings, so the READMEs are authoritative and hold the complete tables (timeouts, lease and
retention windows, per-IP budgets):
[Workers](https://github.com/meddleware-org/access-gate-gateway/blob/main/gateway-workers/README.md#full-configuration-reference),
[Rust](https://github.com/meddleware-org/access-gate-gateway/blob/main/gateway-rust/README.md#configuration-environment-variables).
Every value is validated at startup: a bad or missing required value is a refusal to serve, never a weaker mode.

Implementation-specific settings (Workers: `NONCE_BACKEND`, `NONCE_SHARD`, quota guard; Rust:
`BIND_ADDR`, `REDIS_URL`, prune interval) are in each implementation's README.

## Deploy on Cloudflare Workers

```bash
git clone https://github.com/meddleware-org/access-gate-gateway.git
cd access-gate-gateway/gateway-workers
npm install
# edit wrangler.toml: [[routes]] pattern + zone, and the public [vars]:
#   GATEWAY_ORIGIN = "https://gate.example.com"   (the route's hostname)
#   NETWORK        = "testnet"
#   NFT_TYPE       = "0x<access_gate original id>::access_gate::SoulboundAccessNFT"
#   GATE_ID        = "0x<gate id>"
npm run deploy                              # first deploy creates the Worker + Durable Object

wrangler secret put UPSTREAM_URL            # https://your-origin.example.com
wrangler secret put UPSTREAM_AUTH_HEADERS   # only if the origin is Access-locked
curl https://gate.example.com/v1/challenge  # → {"nonce":"…","expiresAt":…}
```

`[vars]` in `wrangler.toml` are overwritten on every deploy; they hold public values only (origin, network, the pass type and gate id). Keep credentials and the upstream URL in secrets. Until the required values are set the Worker answers `500 gateway misconfigured`.

A Worker runs at the edge, so `UPSTREAM_URL` must be publicly routable. Lock that origin so only
the gateway can reach it — e.g. a Cloudflare Access application allowing only a service token, whose
headers the gateway sends via `UPSTREAM_AUTH_HEADERS`. Without this, anyone can call the origin
directly and skip the pass check.

## Deploy with Docker (Rust)

```bash
docker run -p 8080:8080 \
  -e GATEWAY_ORIGIN=https://gate.example.com \
  -e NETWORK=testnet \
  -e UPSTREAM_URL=http://relay:57391 -e ALLOW_INSECURE_HTTP=1 \
  -e SUI_RPC_URL=https://fullnode.testnet.sui.io:443 \
  -e NFT_TYPE=0x<access_gate original id>::access_gate::AccessNFT \
  -e GATE_ID=0x<gate id> \
  meddleware/access-gate-gateway
```

`ALLOW_INSECURE_HTTP=1` is needed only for an `http://` upstream inside your own network; otherwise
both URLs must be `https://`. Run one replica with the in-memory nonce store, or set `REDIS_URL` before
scaling out — otherwise a nonce could be accepted once per replica. With `SINGLE_USE=true` the Rust
gateway requires `REDIS_URL` (spent consumes must survive a restart).

The Rust gateway is kept at parity with the Workers one; the Meddleware deployment runs the Workers
gateway.

## Responses

| Status | Meaning |
| --- | --- |
| `401` | no access proof |
| `403` | malformed proof, bad signature, unknown/expired/reused nonce, missing consume (single-use), or the address holds no matching pass |
| `409` | single-use: body `code` is `redeemed` (that consume was already spent) or `leased` (a request using it is in flight; released again if the upstream fails) — `GATEWAY_CONFLICT_CODES` in `access-gate-gateway-client` |
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
