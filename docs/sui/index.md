# Sui development

Guides for building on the Meddleware Sui contracts and SDKs.

## In this section

| Topic | Description |
| --- | --- |
| [Environment setup](./environment) | Localnet, testnet, active address, gas |
| [PTB patterns](./ptb-patterns) | TypeScript transaction building patterns |
| [Walrus Storage](./walrus-storage/) | SDK setup and integration guide |
| [Sealed Storage](./sealed-storage/) | Encrypt/store/decrypt with on-chain policies |
| [Access Gate](./access-gate/) | NFT gate passes and gateway deployment |
| [DAO](./dao/) | Governance interaction patterns |

## Contract layout

The on-chain packages are published under:

```
blockchain/sui/contracts/
├── core/           — vault_core (accounting, share minting/burning)
├── adapters/       — vault_adapters (strategy integration)
├── governor/       — vault_governor (DaoAdminCap-gated ops)
├── fee_distributor/— vault_fee_distributor
├── config/         — vault_config (DAO-governed parameters)
├── dao/            — vault_dao
└── access-gate/    — access_gate (NFT pass minting/consumption)
```

## SDK packages

| Package | npm | Purpose |
| --- | --- | --- |
| `@meddleware/walrus-client` | ✓ | Walrus blob upload, read, extend, enumerate |
| `@meddleware/seal-client` | ✓ | Encrypt/store/decrypt with Seal + Walrus |
| `@meddleware/nft-gate-client` | ✓ | Access Gate challenge/proof construction |
| `@meddleware/ui` | ✓ | Vue 3 components (includes `suiExplorerUrl`, `CopyableAddress`) |

## Testnet vs mainnet

All contract addresses in this documentation are **testnet**. Check the [API reference](https://docs.meddleware.co.uk/blockchain/sui/) for the canonical address tables.

::: tip Using the Sui MCP
If you have the `sui-docs` MCP configured (`https://sui.mcp.kapa.ai`), consult it for current Sui framework types, SDK patterns, and deprecation notices before writing Move or TypeScript.
:::
