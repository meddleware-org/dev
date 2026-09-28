# Walrus Storage — Integration guide

All examples use a client from [`createWalrusClient`](./#create-a-client) and an executor `exec`
that signs and executes a `Transaction` (in a Vue app: `buildExecutor()` from
`@meddleware/wallet-adapter`).

## Uploading through the NFT-gated relay

Meddleware's relay, `https://sui-walrus-relay-testnet.meddleware.co.uk`, is the Mysten
`walrus-upload-relay` behind an [nft-gate gateway](/sui/access-gate/gateway). Uploads need a
wallet-signed access proof; `GET /v1/tip-config` is public.

The testnet gateway runs in **single-use** mode: each upload spends one use of an access pass, so
the proof must carry the digest of an on-chain `consume` bound to the gateway's challenge nonce:

```ts
import { buildConsumeTx, fetchChallenge, buildAccessProof } from '@meddleware/nft-gate-client'
import { createWalrusClient } from '@meddleware/walrus-client'

const RELAY = 'https://sui-walrus-relay-testnet.meddleware.co.uk'

// 1. Fresh challenge from the gateway
const challenge = await fetchChallenge(RELAY)

// 2. Spend one use on-chain, binding it to that nonce (one wallet approval)
const consume = await exec.signAndExecute(buildConsumeTx(gateConfig, passId, challenge.nonce))
await exec.waitForTransaction(consume.digest)

// 3. Sign the challenge and attach the consume digest
const token = await buildAccessProof({
  address,
  challenge,
  sign: (message) => wallet.signPersonalMessage({ message }),
  consumeDigest: consume.digest,
})

// 4. Upload through the relay with the token
const walrus = createWalrusClient({
  network: 'testnet',
  wasmUrl,
  uploadRelayHost: RELAY,
  uploadRelayAuthToken: token,
})
// …then createBlobUploadFlow / createUploadFlow as in the SDK setup page
```

For a gateway **without** single-use mode, skip step 2 and use the one-call helper
`createRelayAccessToken({ relayHost, address, sign })` from `@meddleware/walrus-client`.

`gateConfig` is the `AccessGateConfig` (`{ packageId, gateId, platformConfigId, nftType, soulbound }`)
of the gate the relay checks, and `passId` a pass the wallet holds for it (see
[Access Gate](/sui/access-gate/)). The ready-made Vue implementation of this flow is
`useAccessGate().consumeAndBuildToken` in
[`@meddleware/walrus-relay`](https://www.npmjs.com/package/@meddleware/walrus-relay).

### Tips

The relay charges a tip on each upload, paid inside the register transaction. Read the schedule from
`GET /v1/tip-config` (`parseTipFromConfig` in `@meddleware/walrus-relay` extracts it), and cap what
the client will pay with `uploadRelayMaxTipMist`. The tip and a per-attempt nonce are embedded in the
register transaction, so a failed attempt is retried with a **fresh** flow — never by resuming an old
registration.

## Extend a blob's lifetime

```ts
import { extendBlobLifetimeTransaction } from '@meddleware/walrus-client'

const tx = extendBlobLifetimeTransaction(walrus, blobObjectId, { epochs: 26 }) // or { endEpoch }
await exec.signAndExecute(tx)
```

`extendBlobLifetime(walrus, blobObjectId, keypair, options)` signs and executes in one call (Node.js).

## Estimate storage cost

```ts
import { estimateStorageCost } from '@meddleware/walrus-client'

const { storageCost, writeCost, totalCost } = await estimateStorageCost(walrus, bytes.length, 53)
```

Costs are in WAL base units; an extension pays only the storage part.

## List a wallet's blobs

```ts
import { fetchOwnedWalrusBlobs } from '@meddleware/walrus-client'

const blobs = await fetchOwnedWalrusBlobs(walrus, walrus, owner)
// [{ objectId, blobId, size, endEpoch, certified }]
```

The first argument is any Sui client with the Core API (the Walrus client is one); the Blob type is
resolved from the live Walrus package, so no address is hard-coded.

## Blob attributes

On-chain key/value metadata on a `Blob` object:

```ts
import { setBlobAttributesTransaction, readBlobAttributes } from '@meddleware/walrus-client'

await exec.signAndExecute(setBlobAttributesTransaction(walrus, blobObjectId, { 'content-type': 'image/png' }))
const attrs = await readBlobAttributes(walrus, blobObjectId) // null when none are set
```

A `null` value deletes that attribute.

## Errors

- **Epoch transitions:** uploads can fail with `RetryableWalrusClientError` (re-exported by
  `@meddleware/walrus-client`) while Walrus changes epoch — retry with a fresh flow.
- **Gateway responses:** `401` — no proof; `403` — bad proof or signature, stale or reused nonce,
  no matching consume, or the wallet holds no valid pass; `409` — that consume was already redeemed
  for an upload, or one is in progress (a failed upload releases it for retry); `429` — per-address
  rate limit; `413` — body above the gateway's `MAX_BODY_BYTES`; `502` — the gateway could not reach
  a Sui fullnode.
- **Reservation too long:** more than 53 epochs in one reservation aborts on-chain; extend instead.
