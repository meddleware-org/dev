# Sealed Storage — SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/) | [API reference →](https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/reference)

Sealed Storage combines Walrus blob storage with Seal's decentralised key management and on-chain Move access-control policies. Only addresses that satisfy the policy can decrypt.

## Install

```bash
npm install @meddleware/seal-client @meddleware/walrus-client @mysten/seal @mysten/sui
```

## Initialise the client

```ts
import { SealClient } from '@meddleware/seal-client'
import { WalrusRelayClient } from '@meddleware/walrus-client'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

const suiClient  = new SuiClient({ url: getFullnodeUrl('testnet') })
const walrus     = new WalrusRelayClient({ relayUrl: RELAY_URL, suiClient, network: 'testnet' })
const sealClient = new SealClient({ suiClient, network: 'testnet' })
```

## Three-step flow

Sealed Storage works in three steps:

1. **Encrypt** — the client encrypts the data locally using a Seal key derived from the policy ID.
2. **Store** — the encrypted ciphertext is uploaded to Walrus; a manifest records the `blobId` and policy address.
3. **Decrypt** — the reader presents the manifest; Seal verifies their wallet satisfies the policy and returns the decryption key.

See [Integration guide](./integration) for the full code walkthrough and [Writing policies](./policies) for policy authoring.

## Manifest shape

```ts
interface SealManifest {
  version: 1
  policyId: string      // Move object ID of the access policy
  blobId: string        // Walrus blob ID of the ciphertext
  encryptedKey: string  // base64 — Seal-encrypted data key
  contentType: string
}
```

The manifest itself is public — store it anywhere (Walrus, on-chain, your database). It contains no plaintext.

<!-- white-label: operator guide for running a custom Seal key server committee — planned -->
