# Access Gate — SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/access-gate/) | [API reference →](https://docs.meddleware.co.uk/blockchain/sui/access-gate/reference)

An **access gate** is an on-chain pass system: anyone can create a gate (price, payout address,
pass flavour), anyone can buy a pass, and a service — a relay, a website, a Seal policy — admits
holders. Each purchase pays the platform commission (`PlatformConfig`, ≤ 10%) and the rest to the
gate's recipient, in one transaction.

Two packages:

- [`@meddleware/access-gate-client`](https://www.npmjs.com/package/@meddleware/access-gate-client)
  — the `access_gate` client: typed reads, typed events, transaction builders, abort messages and
  the deployed ids per network.
- [`@meddleware/nft-gate-client`](https://www.npmjs.com/package/@meddleware/nft-gate-client) — the
  gateway wire protocol: fetch a challenge and build the access proof an
  [nft-gate gateway](./gateway) verifies.

## Install

```bash
npm install @meddleware/access-gate-client @mysten/sui
npm install @meddleware/nft-gate-client   # only to prove access to a gateway
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

The deployed ids come from the package, per network. There are two package ids, equal until the
package is upgraded: transactions call the latest **`publishedAt`**; types and events are matched
at the **`originalId`**.

```ts
import { accessNftType, type AccessGateConfig } from '@meddleware/access-gate-client'
import { accessGateDeployment } from '@meddleware/access-gate-client/deployments'

const { originalId, publishedAt, platformConfigId } = accessGateDeployment('testnet')

const gate: AccessGateConfig = {
  packageId: publishedAt,
  gateId: GATE_ID,
  platformConfigId,
  nftType: accessNftType(originalId, /* soulbound */ true), // …::SoulboundAccessNFT or ::AccessNFT
  soulbound: true,
}
```

## Quick start

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { ownsAccessNft, buildPurchaseTx } from '@meddleware/access-gate-client'

const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' })

// Does this wallet hold a pass for the gate? (exact type match; reads every page)
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
