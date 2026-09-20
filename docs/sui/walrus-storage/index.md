# Walrus Storage — SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/) | [API reference →](https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/reference)

`@meddleware/walrus-client` wraps the Walrus blob store and the Meddleware relay layer: upload blobs, read them back, extend their storage lifetime, and enumerate blobs owned by an address.

## Install

```bash
npm install @meddleware/walrus-client @mysten/walrus @mysten/sui
```

## Initialise the client

```ts
import { WalrusRelayClient } from '@meddleware/walrus-client'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') })

const walrus = new WalrusRelayClient({
  relayUrl: import.meta.env.VITE_WALRUS_RELAY_URL ?? 'https://walrus-relay.meddleware.co.uk',
  suiClient,
  network: 'testnet',
})
```

The relay URL points at a Meddleware-hosted Walrus relay. For a gated relay, the client constructs an NFT gate proof automatically when you supply a wallet signer (see [Integration guide](./integration)).

## Core types

```ts
// Blob storage result
interface BlobStoreResult {
  blobId: string
  expiryEpoch: number
  cost: bigint         // in MIST
  newlyCreated: boolean
}

// Blob metadata
interface BlobInfo {
  blobId: string
  size: number
  expiryEpoch: number
  owner: string
}
```

## Quick upload

```ts
const file = new File(['Hello, Walrus!'], 'hello.txt', { type: 'text/plain' })
const result = await walrus.store(file, { epochs: 5 })
console.log('Stored at blobId:', result.blobId)
```

## Quick read

```ts
const data = await walrus.read(blobId)
const text = new TextDecoder().decode(data)
```

See [Integration guide](./integration) for detailed patterns, error handling, and wallet signing.

<!-- white-label: operator customization guide (relay domain, tip config, NFT gate setup) — planned -->
