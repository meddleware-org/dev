# Getting started

Everything you need to build on the Meddleware platform.

## Prerequisites at a glance

| Tool | Minimum version | Notes |
| --- | --- | --- |
| Node.js | 22.18.0 or ≥ 24.12.0 | LTS recommended |
| npm | 10+ | Ships with Node |
| Sui CLI | testnet v1.76.1 | Managed via [suiup](#suiup) |
| Walrus CLI | testnet v1.53.0 | Managed via suiup |
| Docker | any recent | For running services locally |

See [Toolchain](./toolchain) for installation steps and version pinning.

## What you can build

The Meddleware platform provides four composable tools on Sui:

- **Walrus Storage** — upload files to Walrus decentralised storage via a relay with optional NFT gating and tips.
- **Sealed Storage** — encrypt data on Walrus with on-chain access policies enforced by Move smart contracts.
- **Access Gate** — create and sell NFT access passes that gate content, relay access, or any on-chain action.
- **DAO** — a governance layer that controls vault parameters, fee configuration, and strategy allocation.

The tools compose: a gated Walrus relay uses Access Gate passes; Sealed Storage policies can require an Access Gate pass; the vault earns yield which flows through the DAO.

## Quick orientation

```text
workspace/
├── repos/
│   ├── docs/          ← user-facing docs (docs.meddleware.co.uk)
│   ├── dev/           ← this site (dev.meddleware.co.uk)
│   ├── walrus-ui/     ← Walrus Storage app
│   ├── seal-ui/       ← Sealed Storage app
│   ├── access-gate-ui/← Access Gate app
│   └── dao-ui/        ← DAO console
├── blockchain/
│   └── sui/
│       ├── contracts/ ← Move smart contracts
│       └── packages/  ← TypeScript SDK packages
├── post-bootstrap/    ← Kubernetes deployment manifests
└── config/            ← central image registry config
```

## Next steps

- [Toolchain](./toolchain) — install the CLI tools
- [Local development](./local-dev) — run the platform locally
- [Design system](../design-system/) — build a Vue app on the token/component layer
- [Sui development](../sui/) — PTBs, environment setup, and service-by-service guides
