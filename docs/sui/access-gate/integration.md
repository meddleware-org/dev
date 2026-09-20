# Access Gate — Integration guide

## Full purchase → verify flow

### Purchase a pass

```ts
import { Transaction } from '@mysten/sui/transactions'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

const PACKAGE    = import.meta.env.VITE_ACCESS_GATE_PACKAGE
const GATE_ID    = import.meta.env.VITE_GATE_ID
const PLATFORM   = import.meta.env.VITE_PLATFORM_CONFIG_ID

async function buyPass(
  suiClient: SuiClient,
  signer: { address: string; signAndExecute: (tx: Transaction) => Promise<string> },
  priceInMist: bigint,
): Promise<string> {
  const tx = new Transaction()
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(priceInMist)])
  const [pass]  = tx.moveCall({
    target: `${PACKAGE}::access_gate::buy`,
    arguments: [tx.object(GATE_ID), coin, tx.object(PLATFORM)],
  })
  tx.transferObjects([pass], tx.pure.address(signer.address))

  const digest = await signer.signAndExecute(tx)
  return digest
}
```

### Verify a pass off-chain (challenge/proof)

The gateway issues a one-time nonce; the client must sign it with the pass object to prove ownership.

```ts
import { NftGateClient } from '@meddleware/nft-gate-client'

async function getAccessToken(
  gateClient: NftGateClient,
  signer: { address: string; sign: (msg: Uint8Array) => Promise<Uint8Array> },
  gateId: string,
  passId: string,
): Promise<string> {
  // 1. Request a challenge from the gateway
  const { challenge, nonce } = await gateClient.requestChallenge({ gateId, passId })

  // 2. Sign the challenge with the user's wallet
  const signature = await signer.sign(new TextEncoder().encode(challenge))

  // 3. Submit the proof; receive a short-lived JWT
  const { token } = await gateClient.submitProof({
    gateId,
    passId,
    nonce,
    signature,
    address: signer.address,
  })

  return token
}
```

The `token` is a signed JWT issued by the gateway. Present it in the `Authorization: Bearer <token>` header when calling any gated API endpoint.

### Nonce requirements

The `access_gate` Move package requires a minimum nonce length of 8 bytes. The gateway enforces this automatically. If you are calling the contract directly (not via the gateway), generate at least 8 bytes of entropy:

```ts
const nonce = crypto.getRandomValues(new Uint8Array(8))
```

### Check pass validity before gating

```ts
const hasAccess = await gateClient.hasValidPass(gateId, walletAddress)
if (!hasAccess) {
  // Prompt user to purchase
}
```

## Using with dapp-kit

Wire the wallet from `@mysten/dapp-kit`:

```ts
import { useCurrentAccount, useSignPersonalMessage, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'

const account = useCurrentAccount()
const { mutateAsync: signPersonalMessage } = useSignPersonalMessage()
const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction()

const signer = {
  address: account.value!.address,
  sign: async (msg: Uint8Array) => {
    const { signature } = await signPersonalMessage({ message: msg })
    return signature
  },
  signAndExecute: async (tx: Transaction) => {
    const { digest } = await signAndExecuteTransaction({ transaction: tx })
    return digest
  },
}
```

## Error handling

```ts
import { NftGateError, GateNotFoundError, PassExpiredError } from '@meddleware/nft-gate-client'

try {
  const token = await getAccessToken(gateClient, signer, gateId, passId)
} catch (err) {
  if (err instanceof GateNotFoundError) {
    console.error('Gate does not exist:', gateId)
  } else if (err instanceof PassExpiredError) {
    console.error('Pass is expired or consumed')
  } else if (err instanceof NftGateError) {
    console.error('Gateway error:', err.code, err.message)
  }
  throw err
}
```

## Vue composable

```ts
// composables/useAccessGate.ts
import { ref } from 'vue'
import { NftGateClient } from '@meddleware/nft-gate-client'

export function useAccessGate(gateClient: NftGateClient) {
  const checking  = ref(false)
  const hasAccess = ref<boolean | null>(null)
  const token     = ref<string | null>(null)
  const error     = ref<Error | null>(null)

  async function check(gateId: string, address: string) {
    checking.value  = true
    error.value     = null
    try {
      hasAccess.value = await gateClient.hasValidPass(gateId, address)
    } catch (e) {
      error.value = e as Error
    } finally {
      checking.value = false
    }
  }

  async function authenticate(
    gateId: string,
    passId: string,
    signer: { address: string; sign: (msg: Uint8Array) => Promise<Uint8Array> },
  ) {
    error.value = null
    try {
      token.value = await getAccessToken(gateClient, signer, gateId, passId)
    } catch (e) {
      error.value = e as Error
    }
  }

  return { checking, hasAccess, token, error, check, authenticate }
}
```
