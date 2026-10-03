# Walrus Storage — SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/) | [API reference →](https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/reference)

[`@meddleware/walrus-client`](https://www.npmjs.com/package/@meddleware/walrus-client) wraps
`@mysten/walrus`: a configured client factory, upload flows that work with wallet pop-ups, lifetime
extension, on-chain blob attributes, owned-blob queries, and access tokens for NFT-gated upload
relays.

## Install

```bash
npm install @meddleware/walrus-client @mysten/walrus @mysten/sui
```

## Create a client

```ts
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url' // browser (Vite) only
import { createWalrusClient } from '@meddleware/walrus-client'

const walrus = createWalrusClient({
  network: 'testnet',          // 'testnet' | 'mainnet'
  wasmUrl: walrusWasmUrl,      // required in the browser; ignored in Node.js
  // uploadRelayHost: 'https://…',  // default: the public Mysten relay for the network
  // uploadRelayAuthToken: token,   // Bearer token for an NFT-gated relay (see the integration guide)
  // uploadRelayMaxTipMist: 1_000_000,
})
```

The client is a Sui gRPC client extended with Walrus (`walrus.walrus.*`); pass it wherever a Sui
client is needed.

## Storage lifetime

Walrus is **not** permanent storage: every blob expires after its reserved epochs (≈ 2 weeks each).
One reservation covers at most `MAX_SINGLE_RESERVATION_EPOCHS` (53); reaching `LONG_TERM_EPOCHS`
(200, ≈ 7.7 years) needs periodic renewal with `extendBlobLifetime`.

## Upload in the browser

Uploading takes two wallet signatures — register, then certify — around the upload to storage
nodes. `createBlobUploadFlow` stores the raw bytes, so `…/v1/blobs/<blobId>` serves the file
itself (use it for images and anything linked directly); `createUploadFlow` stores a quilt of named
files instead.

```ts
import { createBlobUploadFlow, walrusBlobUrl } from '@meddleware/walrus-client'

const flow = createBlobUploadFlow(walrus, bytes)
await flow.encode()

const registerTx = flow.register({ epochs: 53, owner: address, deletable: false })
const { digest } = await exec.signAndExecute(registerTx)   // wallet approval 1
await exec.waitForTransaction(digest)
await flow.upload({ digest })                               // to storage nodes (via the relay)

const cert = await exec.signAndExecute(flow.certify())      // wallet approval 2
await exec.waitForTransaction(cert.digest)
const { blobId } = await flow.getBlob()
console.log(walrusBlobUrl('testnet', blobId))
```

`exec` is any executor that signs and executes a `Transaction` — in Meddleware apps,
`buildExecutor()` from `@meddleware/wallet-adapter`.

## Upload from Node.js

```ts
import { createWalrusClient, LONG_TERM_EPOCHS, MAX_SINGLE_RESERVATION_EPOCHS } from '@meddleware/walrus-client'
import { uploadLocalFile } from '@meddleware/walrus-client/node'

const walrus = createWalrusClient({ network: 'testnet' })
const { blobId } = await uploadLocalFile(walrus, 'assets/icon.png', 'icon.png', keypair, {
  epochs: MAX_SINGLE_RESERVATION_EPOCHS,
})
```

## Read a blob

Blobs are public: read them from any Walrus aggregator. `readBlob` adds a timeout, a size cap
(100 MiB by default; `maxBytes` to change it) and the aggregator's strict consistency check;
`walrusBlobUrl` gives a plain URL for `<img src>` and links.

```ts
import { WALRUS_AGGREGATOR_HOSTS, walrusBlobUrl } from '@meddleware/walrus-client'
import { readBlob } from '@meddleware/walrus-client/http'

const bytes = await readBlob(blobId, { aggregator: WALRUS_AGGREGATOR_HOSTS.testnet })
const href = walrusBlobUrl('testnet', blobId)
```

See the [integration guide](./integration) for lifetime management, owned-blob listing, attributes
and uploads through the NFT-gated relay, and [Self-host a relay](./relay-self-host) to run your own.

<!-- white-label: operator customization guide (relay domain, tip config, NFT gate setup) — planned -->
