# Sealed Storage — Integration guide

## Full encrypt → store → decrypt flow

### Encrypt and store

```ts
import { SealClient } from '@meddleware/seal-client'
import { WalrusRelayClient } from '@meddleware/walrus-client'

async function encryptAndStore(
  sealClient: SealClient,
  walrus: WalrusRelayClient,
  file: File,
  policyId: string,  // on-chain Move policy object ID
  epochs = 5,
): Promise<SealManifest> {
  // 1. Encrypt locally — key is derived from policyId
  const { ciphertext, encryptedKey } = await sealClient.encrypt(file, { policyId })

  // 2. Upload ciphertext to Walrus
  const result = await walrus.store(
    new File([ciphertext], file.name, { type: 'application/octet-stream' }),
    { epochs },
  )

  // 3. Return the manifest (store this somewhere accessible)
  return {
    version: 1,
    policyId,
    blobId: result.blobId,
    encryptedKey,
    contentType: file.type,
  }
}
```

### Decrypt

```ts
async function decryptManifest(
  sealClient: SealClient,
  walrus: WalrusRelayClient,
  manifest: SealManifest,
  signer: { address: string; sign: (msg: Uint8Array) => Promise<Uint8Array> },
): Promise<Blob> {
  // 1. Request the decryption key from Seal
  //    Seal verifies on-chain that signer.address satisfies the policy
  const key = await sealClient.requestKey({
    policyId: manifest.policyId,
    encryptedKey: manifest.encryptedKey,
    signer,
  })

  // 2. Download the ciphertext from Walrus
  const ciphertext = await walrus.read(manifest.blobId)

  // 3. Decrypt locally
  const plaintext = await sealClient.decrypt(ciphertext, key)
  return new Blob([plaintext], { type: manifest.contentType })
}
```

## Using with dapp-kit

Wire the wallet signer from `@mysten/dapp-kit`:

```ts
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'

const account = useCurrentAccount()
const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()

const signer = {
  address: account.value!.address,
  sign: async (msg: Uint8Array) => {
    const { signature } = await signPersonalMessage({ message: msg })
    return signature
  },
}
```

## Error handling

```ts
try {
  const key = await sealClient.requestKey({ policyId, encryptedKey, signer })
} catch (err) {
  if (err instanceof SealPolicyError) {
    // Wallet does not satisfy the policy
    console.error('Access denied:', err.policyId, err.reason)
  } else if (err instanceof SealKeyServerError) {
    // Key server unavailable or quorum not reached
    console.error('Key server error:', err.message)
  }
  throw err
}
```

## Vue composable

```ts
// composables/useSealDecrypt.ts
import { ref } from 'vue'

export function useSealDecrypt(sealClient: SealClient, walrus: WalrusRelayClient) {
  const decrypting = ref(false)
  const result     = ref<Blob | null>(null)
  const error      = ref<Error | null>(null)

  async function decrypt(manifest: SealManifest, signer: SealSigner) {
    decrypting.value = true
    error.value      = null
    try {
      result.value = await decryptManifest(sealClient, walrus, manifest, signer)
    } catch (e) {
      error.value = e as Error
    } finally {
      decrypting.value = false
    }
  }

  return { decrypting, result, error, decrypt }
}
```
