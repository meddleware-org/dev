# Getting started

Everything you need to build on the Meddleware platform.

## Prerequisites at a glance

| Tool | Minimum version | Notes |
| --- | --- | --- |
| Node.js | 22.18.0 or ≥ 24.12.0 | LTS recommended |
| npm | 10+ | Ships with Node |
| Sui CLI | testnet v1.80.0 | Managed via [suiup](./toolchain); the Move packages' CI uses this version |
| Walrus CLI | current testnet release | Optional — the SDKs do not need it |
| Docker | any recent | For building app images and running the Rust gateway |

See [Toolchain](./toolchain) for installation steps and version pinning.

## What you can build

The Meddleware platform provides composable tools on Sui:

- **Walrus Storage** — upload files to Walrus through an upload relay, optionally gated by an access pass.
- **Sealed Storage** — encrypt data to on-chain Seal policies and store the ciphertext on Walrus.
- **Access Gate** — create and sell NFT access passes that gate content, relay access or any service.
- **Token Deployer** — publish your own Sui coin from the browser with your wallet.

They compose: the hosted Walrus relay admits Access Gate pass-holders, and Sealed Storage's
`nft_gate` policy decrypts for the holders of a gate's passes.

## Quick orientation

Every component is its own repository under [github.com/meddleware-org](https://github.com/meddleware-org):

| Layer | Repositories |
| --- | --- |
| Move packages | `access-gate-sui`, `seal-policies-sui`, `sui-token-template` |
| TypeScript SDKs | `nft-gate-client`, `seal-client`, `walrus-client`, `wallet-adapter` |
| Services | `nft-gate` (gateway: Workers + Rust) |
| Apps | `walrus-ui`, `seal-ui`, `access-gate-ui`, `token-deployer-ui`, `dashboard` |
| Shared UI | `design-tokens`, `ui`, `walrus-relay` |
| Documentation | `docs` (docs.meddleware.co.uk), `dev` (this site) |

## Next steps

- [Toolchain](./toolchain) — install the CLI tools
- [Local development](./local-dev) — run the platform locally
- [Design system](../design-system/) — build a Vue app on the token/component layer
- [Sui development](../sui/) — PTBs, environment setup, and service-by-service guides
