# Access Gate — SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/access-gate/) | [API reference →](https://docs.meddleware.co.uk/blockchain/sui/access-gate/reference)

The Access Gate lets operators create on-chain NFT pass systems. Each gate can mint unlimited-use or single-use passes, optionally soulbound to the buyer's address. Operators and the platform earn commission on each sale.

## Install

```bash
npm install @meddleware/nft-gate-client @mysten/sui
```

## Initialise the client

```ts
import { NftGateClient } from '@meddleware/nft-gate-client'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

const suiClient   = new SuiClient({ url: getFullnodeUrl('testnet') })
const gateClient  = new NftGateClient({
  suiClient,
  network: 'testnet',
  gatewayUrl: import.meta.env.VITE_NFT_GATE_URL ?? 'https://nft-gate.meddleware.co.uk',
})
```

## Key concepts

| Term | Description |
| --- | --- |
| `Gate` | On-chain object representing an access system (price, supply, commission config) |
| `AdminCap` | Capability object held by the gate operator; required for privileged operations |
| `AccessPass` | NFT minted when a user buys access |
| Soulbound | A pass bound to one address — non-transferable |
| Challenge/proof | Off-chain protocol: gateway issues a nonce; client signs it with the pass |

## Quick start

Check whether an address holds a valid pass for a gate:

```ts
const hasAccess = await gateClient.hasValidPass(gateId, walletAddress)
```

Buy a pass:

```ts
import { Transaction } from '@mysten/sui/transactions'

const tx = new Transaction()
const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(priceInMist)])
const [pass]  = tx.moveCall({
  target: `${ACCESS_GATE_PACKAGE}::access_gate::buy`,
  arguments: [tx.object(gateId), coin, tx.object(PLATFORM_CONFIG_ID)],
})
tx.transferObjects([pass], tx.pure.address(buyerAddress))
await signAndExecute({ transaction: tx })
```

See [Integration guide](./integration) for the full purchase → verify flow and [Deploy the gateway](./gateway) for self-hosting the challenge/proof gateway.

<!-- white-label: operator guide (custom gate config, commission setup, branded pass metadata) — planned -->
