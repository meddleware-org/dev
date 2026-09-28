# Access Gate — SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/access-gate/) | [API reference →](https://docs.meddleware.co.uk/blockchain/sui/access-gate/reference)

An **access gate** is an on-chain pass system: anyone can create a gate (price, payout address,
pass flavour), anyone can buy a pass, and a service — a relay, a website, a Seal policy — admits
holders. Each purchase pays the platform commission (`PlatformConfig`, ≤ 10%) and the rest to the
gate's recipient, in one transaction.

[`@meddleware/nft-gate-client`](https://www.npmjs.com/package/@meddleware/nft-gate-client) builds
the transactions and reads, and produces the access proofs that an
[nft-gate gateway](./gateway) verifies.

## Install

```bash
npm install @meddleware/nft-gate-client @mysten/sui
```

## Key concepts

| Term | Meaning |
| --- | --- |
| `Gate` | Shared object: price, payment recipient, pass flavour, pause/freeze state, immutable policy |
| `AdminCap` | Owned capability for one gate: settings, airdrops, freeze |
| `AccessNFT` / `SoulboundAccessNFT` | The pass. Soulbound passes have no `store` ability, so they cannot be transferred |
| Unlimited vs single-use | `default_uses = 0` → valid while held; `N` → `N` uses, each spent on-chain by the holder with `consume` |
| `PlatformConfig` | Shared object with the platform treasury and commission rate |
| Challenge / proof | A gateway issues a nonce; the wallet signs `nft-gate:access:<nonce>`; the proof token is sent as `Authorization: Bearer …` |

## Configure a gate

Most calls take an `AccessGateConfig`:

```ts
import type { AccessGateConfig } from '@meddleware/nft-gate-client'

const PKG = '0x0bedd0b27d993d3292ca6a5315f7562de8bc0ff3752b445b4c53252c76f2d20d' // access_gate (testnet)

const gate: AccessGateConfig = {
  packageId: PKG,
  gateId: GATE_ID,
  platformConfigId: '0x7c5aed0ce7f29a4dfb60657858df31c12410a67098b4bcdd1d8cb1e531be4884',
  nftType: `${PKG}::access_gate::SoulboundAccessNFT`, // or ::AccessNFT
  soulbound: true,
}
```

## Quick start

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { ownsAccessNft, buildPurchaseTx } from '@meddleware/nft-gate-client'

const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' })

// Does this wallet hold a pass for the gate?
const hasAccess = await ownsAccessNft(client, address, gate.nftType, gate.gateId)

// If not, buy one (the wallet signs; overpayment is refunded on-chain)
if (!hasAccess) await exec.signAndExecute(buildPurchaseTx(gate, priceMist))
```

The contract itself — objects, events, abort codes and the replay rules for single-use passes — is
documented with the Move package: [on-chain overview](/sui/onchain/access-gate/overview),
[developer integration](/sui/onchain/access-gate/dev-guide) and
[API reference](/sui/onchain/access-gate/api-reference).

See the [integration guide](./integration) for proving access to a gateway and operating gates, and
[Deploy the gateway](./gateway) to protect your own service.

<!-- white-label: operator guide (custom gate config, commission setup, branded pass metadata) — planned -->
