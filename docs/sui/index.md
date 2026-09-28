# Sui development

Guides for building on Meddleware's Sui Move packages, TypeScript SDKs and hosted services.

## In this section

| Topic | Description |
| --- | --- |
| [Environment setup](./environment) | CLI networks, addresses, faucet, localnet, SDK client |
| [PTB patterns](./ptb-patterns) | Building, simulating and executing transactions; handling aborts |
| [Walrus Storage](./walrus-storage/) | Upload and manage Walrus blobs; the NFT-gated upload relay |
| [Sealed Storage](./sealed-storage/) | Encrypt to on-chain Seal policies; store ciphertext on Walrus |
| [Access Gate](./access-gate/) | Sell and verify NFT access passes; deploy the nft-gate gateway |

## Contract layout

Each Move package lives in its own repository under
[github.com/meddleware-org](https://github.com/meddleware-org). Its on-chain reference (objects,
functions, events, abort codes) is maintained with the package and imported into this site.

| Repository | Move package | Modules | Depends on | On-chain docs |
| --- | --- | --- | --- | --- |
| [`access-gate-sui`](https://github.com/meddleware-org/access-gate-sui) | `access_gate` | `access_gate` — gates, passes (`AccessNFT` / `SoulboundAccessNFT`), purchase with platform commission, single-use `consume`, gate policies | Sui framework only | [overview](/sui/onchain/access-gate/overview) · [dev guide](/sui/onchain/access-gate/dev-guide) · [API](/sui/onchain/access-gate/api-reference) |
| [`seal-policies-sui`](https://github.com/meddleware-org/seal-policies-sui) | `seal_policies` | `nft_gate` and `timelock` (Seal `seal_approve*` policies); `sealed_content` (discovery registry, not a policy) | `access_gate` (git, commit-pinned) | [overview](/sui/onchain/sealed-storage/overview) · [dev guide](/sui/onchain/sealed-storage/dev-guide) · [API](/sui/onchain/sealed-storage/api-reference) |
| [`sui-token-template`](https://github.com/meddleware-org/sui-token-template) | `sui_token_template` | `sui_token_template` — one coin per publish via the coin registry | Sui framework only | [overview](/sui/onchain/token-deployer/overview) · [dev guide](/sui/onchain/token-deployer/dev-guide) · [API](/sui/onchain/token-deployer/api-reference) |

```text
access_gate            ← passes, gates, commission (PlatformConfig)
   ▲
   └── seal_policies   ← nft_gate reads a Gate + pass; timelock reads Clock 0x6

sui_token_template     ← not a shared deployment: each token is its own package,
                         published from the user's wallet by the token deployer
```

### Testnet deployments

| Package | Package ID | Shared objects |
| --- | --- | --- |
| `access_gate` | `0x0bedd0b27d993d3292ca6a5315f7562de8bc0ff3752b445b4c53252c76f2d20d` | `PlatformConfig` `0x7c5aed0ce7f29a4dfb60657858df31c12410a67098b4bcdd1d8cb1e531be4884` |
| `seal_policies` | `0x9f0563bfe42fbd29932cd280cc47efe17f5339b4dc569eb110114665eecc231e` | — (no `init`) |

Mainnet: not yet published. Published versions are immutable in intent: a new version is a new
package ID, and gates, passes and ciphertexts stay bound to the version that created them.

::: info Source ahead of deployment
The repository sources include changes not yet in these packages (for `access_gate`: gate policies,
u128 commission arithmetic and abort codes 9–10; for `seal_policies`: pause-aware `nft_gate`). They
ship as new package IDs; each package's on-chain docs mark which features need the new version.
:::

## SDK packages

| Package | Purpose |
| --- | --- |
| [`@meddleware/nft-gate-client`](https://www.npmjs.com/package/@meddleware/nft-gate-client) | `access_gate` PTB builders (create, purchase, consume, admin), pass/gate reads, gateway challenge + access proof |
| [`@meddleware/seal-client`](https://www.npmjs.com/package/@meddleware/seal-client) | `SealController` (threshold encrypt/decrypt, session keys), policy registry with `nft-gate` and `time-lock` providers, `sealed_content` pointers |
| [`@meddleware/walrus-client`](https://www.npmjs.com/package/@meddleware/walrus-client) | Walrus client factory, upload flows, lifetime extension, attributes, owned-blob queries, relay access tokens |
| [`@meddleware/wallet-adapter`](https://www.npmjs.com/package/@meddleware/wallet-adapter) | Vue 3 wallet-standard composable shared across tool views: connect, sign messages, execute PTBs |
| [`@meddleware/walrus-relay`](https://www.npmjs.com/package/@meddleware/walrus-relay) | Vue 3 UI for the upload relay: relay selection, tip estimate, NFT-gate access, upload widget |
| [`@meddleware/ui`](https://www.npmjs.com/package/@meddleware/ui) / [`@meddleware/design-tokens`](https://www.npmjs.com/package/@meddleware/design-tokens) | Components and tokens — see the [design system](/design-system/) |

All SDKs target `@mysten/sui` v2 and gRPC (public fullnodes no longer serve JSON-RPC).

## Services

| Service | Source | Hosted instance |
| --- | --- | --- |
| nft-gate gateway (NFT-gated reverse proxy; Cloudflare Workers or Rust) | [`nft-gate`](https://github.com/meddleware-org/nft-gate) | in front of the Walrus relay |
| Walrus upload relay (Mysten `walrus-upload-relay`, tip-charging) | upstream binary | `https://sui-walrus-relay-testnet.meddleware.co.uk` (via the gateway; `/v1/tip-config` is public) |

## Testnet vs mainnet

Every address on this site is **testnet** unless stated otherwise. User-facing reference tables are
at [docs.meddleware.co.uk](https://docs.meddleware.co.uk/blockchain/sui/).

::: tip Using the Sui MCP
If you have the `sui-docs` MCP configured (`https://sui.mcp.kapa.ai`), consult it for current Sui
framework types, SDK patterns and deprecation notices before writing Move or TypeScript.
:::
