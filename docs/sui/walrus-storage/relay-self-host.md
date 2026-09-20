# Self-host a Walrus relay

The Meddleware Walrus relay is an HTTP gateway that accepts blob uploads, pays Walrus storage fees on behalf of the uploader (recovering costs via tips), and optionally gates uploads behind an NFT access pass.

The relay source lives at `repos/walrus-relay-ui/` (frontend) and `services/walrus-relay/` (backend). The backend is a Cloudflare Worker.

## Architecture

```
Client → CF Worker relay
               │ tip payment (on-chain)
               │ Walrus upload (Walrus publisher)
               └─→ Walrus storage network
```

The relay:
1. Receives an upload request with an optional NFT gate proof.
2. Verifies the proof on-chain (if gate is configured).
3. Accepts a tip payment via a PTB signed by the client.
4. Forwards the blob to a Walrus publisher.
5. Returns the `blobId` to the client.

## Deploying on Cloudflare Workers

### Prerequisites

- A Cloudflare account with Workers enabled.
- A Sui address funded with enough SUI to cover Walrus storage fees.
- A Walrus publisher URL (testnet: `https://publisher.walrus-testnet.walrus.space`).

### Configuration

```toml
# wrangler.toml (in services/walrus-relay/)
name = "walrus-relay"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
WALRUS_PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space"
WALRUS_AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space"
SUI_NETWORK = "testnet"
# Optional: NFT gate contract address for access-gated relay
NFT_GATE_PACKAGE_ID = ""
```

Store secrets securely — never commit them:

```bash
wrangler secret put RELAY_PRIVATE_KEY   # base64-encoded Ed25519 key for tip collection
wrangler secret put TIP_RECIPIENT       # Sui address that receives tips
```

### Deploy

```bash
cd services/walrus-relay
npm install
wrangler deploy
```

### Tip configuration

The relay uses a `tip_config` object to determine the tip amount per byte per epoch. Update this via the DAO or directly in the Worker KV if you run your own relay.

```ts
const tipConfig = {
  minTipMist: 1_000_000n,      // minimum tip regardless of size (1 mSUI)
  perBytePerEpoch: 100n,       // tip in MIST per byte per storage epoch
  maxEpochs: 52,               // maximum epochs the relay will accept
}
```

## Registering your relay URL

To surface your relay in the Meddleware relay picker UI, add it to the relay registry config. The relay must respond to `GET /health` with `{ status: "ok" }`.

::: tip Register fresh, never resume
The relay embeds a tip+nonce in the register transaction. Never resume a partially-completed registration. Always call the register endpoint fresh — it is idempotent on success.
:::

<!-- white-label: operator customization guide (custom domain, branding, fee collection address, gate config) — planned -->
