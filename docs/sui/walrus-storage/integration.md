# Walrus Storage — Integration guide

## Upload with progress

```ts
import { WalrusRelayClient } from '@meddleware/walrus-client'

async function uploadFile(
  walrus: WalrusRelayClient,
  file: File,
  epochs = 5,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const result = await walrus.store(file, {
    epochs,
    onProgress,
  })
  return result.blobId
}
```

## Upload with wallet signing (gated relay)

When the relay requires an NFT gate proof, supply a `Transaction` signer:

```ts
import { useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit'

const account = useCurrentAccount()
const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

const result = await walrus.store(file, {
  epochs: 5,
  signer: {
    address: account.value!.address,
    signAndExecute: (tx) => signAndExecute({ transaction: tx }),
  },
})
```

The client registers a fresh nonce with the relay, constructs the access-gate proof, submits the transaction, and then uploads the blob — all transparently.

## Read a blob

```ts
const data = await walrus.read(blobId)

// As a Blob for download
const blob = new Blob([data])
const url  = URL.createObjectURL(blob)
```

## Extend blob lifetime

```ts
await walrus.extend(blobId, { extraEpochs: 10, signer })
```

## List owned blobs

```ts
const blobs = await walrus.listOwned(ownerAddress)
// BlobInfo[]: blobId, size, expiryEpoch, owner
```

## Tip estimation

The relay may charge a tip per upload. Estimate the tip before showing a confirmation UI:

```ts
const estimate = await walrus.estimateTip(file.size, epochs)
// { tipMist: bigint, relayUrl: string }
```

Display `estimate.tipMist / 1_000_000_000n` SUI to the user.

## Error handling

```ts
try {
  const result = await walrus.store(file, { epochs })
} catch (err) {
  if (err instanceof WalrusRelayError) {
    switch (err.code) {
      case 'RATE_LIMITED':      // relay rate limit exceeded
      case 'INSUFFICIENT_FUNDS': // wallet balance too low
      case 'NFT_GATE_DENIED':   // no valid access-gate pass
      case 'RELAY_UNAVAILABLE': // relay returned 5xx
    }
  }
  throw err
}
```

## Vue composable pattern

```ts
// composables/useWalrusUpload.ts
import { ref } from 'vue'
import { WalrusRelayClient } from '@meddleware/walrus-client'

export function useWalrusUpload(walrus: WalrusRelayClient) {
  const uploading = ref(false)
  const progress  = ref(0)
  const blobId    = ref<string | null>(null)
  const error     = ref<Error | null>(null)

  async function upload(file: File, epochs = 5) {
    uploading.value = true
    progress.value  = 0
    error.value     = null
    try {
      const result = await walrus.store(file, {
        epochs,
        onProgress: (pct) => { progress.value = pct },
      })
      blobId.value = result.blobId
    } catch (e) {
      error.value = e as Error
    } finally {
      uploading.value = false
    }
  }

  return { uploading, progress, blobId, error, upload }
}
```
