# Sealed Storage — SDK setup

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/) | [API reference →](https://docs.meddleware.co.uk/blockchain/sui/sealed-storage/reference)

Sealed Storage encrypts data client-side with [Seal](https://seal-docs.wal.app/) threshold
encryption and stores the ciphertext on Walrus. A Seal key server releases its key share only if an
on-chain policy (`seal_policies::<module>::seal_approve*`) succeeds in a dry run with the requester
as sender, so only addresses that satisfy the policy can decrypt.

[`@meddleware/seal-client`](https://www.npmjs.com/package/@meddleware/seal-client) is the client half:

- **Policy providers** — one per Move policy module. Each builds the Seal identity for new content
  and the approve call for decryption. Built in: `nft-gate` (holders of an access-gate pass) and
  `time-lock` (anyone, after a time).
- **`PolicyRegistry`** — the set of providers an app offers (`createDefaultRegistry()` registers
  both built-ins).
- **`SealController`** — threshold `encrypt` / `decrypt` over a key-server committee, and the
  per-address session key (one wallet signature, cached until it expires).

## Install

```bash
npm install @meddleware/seal-client @mysten/seal @mysten/sui
```

`@mysten/seal` and `@mysten/sui` are peer dependencies.

## Create a controller

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { createDefaultRegistry } from '@meddleware/seal-client'
import { SealController } from '@meddleware/seal-client/controller' // also on the main entry; the subpath lets apps lazy-load @mysten/seal
import { sealPoliciesDeployment } from '@meddleware/seal-client/deployments'

const suiClient = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' })

// originalId: identities are bound to it (never changes); publishedAt: the latest version, the
// target of seal_approve calls; policyConfigId: the shared version gate every seal_approve reads.
// All three come from the package's recorded deployments.
const { originalId, publishedAt, policyConfigId } = sealPoliciesDeployment('testnet')

const seal = new SealController(
  {
    suiClient,
    originalId,
    publishedAt,
    policyConfigId,
    threshold: 2,
    serverConfigs: [
      // Mysten testnet committee (decentralised server, via the aggregator) + two independent servers
      { objectId: '0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98', weight: 1,
        aggregatorUrl: 'https://seal-aggregator-testnet.mystenlabs.com' },
      { objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', weight: 1 },
      { objectId: '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', weight: 1 },
    ],
  },
  createDefaultRegistry(),
)
```

These are the committee defaults `seal-ui` uses on testnet. On mainnet the Mysten committee
aggregator requires an API key; see the Seal docs.

## The flow

1. **Encrypt** — `seal.encrypt(policyType, params, bytes)` returns `{ id, ciphertext }`. `id` (hex)
   is the Seal identity; it contains a random nonce, so it cannot be recomputed later.
2. **Store** — upload `ciphertext` to Walrus and keep a **manifest** that points to it.
3. **Decrypt** — `seal.decrypt(policyType, params, id, ciphertext, { address, signPersonalMessage })`
   builds the policy's approve transaction, obtains key shares from the committee and decrypts
   locally.

## The manifest

`SealedManifest` is the interchange format between encrypting and decrypting apps. It contains no
secrets and can be stored anywhere:

```ts
interface SealedManifest {
  policyType: string              // 'nft-gate' | 'time-lock' | …
  id: string                      // Seal identity (hex, no 0x) — required verbatim to decrypt
  blobId: string                  // Walrus blob id of the ciphertext
  network: string                 // where the policy package + key servers live
  params?: Record<string, unknown> // non-secret policy params, e.g. { gateId }
  label?: string
}
```

Validate untrusted manifests with `parseSealedManifest(raw)` (throws `SealedManifestError`), then
check `network` matches your app.

See the [integration guide](./integration) for end-to-end code and [Writing policies](./policies)
for adding a policy.

<!-- white-label: operator guide for running a custom Seal key server committee — planned -->
