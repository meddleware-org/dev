# Toolchain

## Node.js

The workspace targets **Node.js 22.18.0 or ≥ 24.12.0**. Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions:

```bash
# fnm (recommended — fast, written in Rust)
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 24
fnm use 24
node --version  # v24.x.x
```

## Sui and Walrus CLIs — suiup

All Sui and Walrus binaries are managed by **suiup**, a version manager analogous to rustup:

```bash
# Install suiup
curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh
# suiup installs to ~/.local/bin/suiup; symlinks at /usr/local/bin/sui and /usr/local/bin/walrus

# Install the testnet-channel binaries
suiup install sui@testnet
suiup install walrus@testnet

# Pin the Sui version the Move packages are tested with in CI
suiup install sui@testnet-v1.80.0
suiup switch sui@testnet-v1.80.0

# Verify
sui --version     # sui 1.80.0-…
walrus --version
```

### Checking for updates

```bash
suiup show    # installed and active versions
suiup status  # check whether newer testnet releases are available
```

When a new testnet release ships, install and switch:

```bash
suiup install sui@testnet-vX.Y.Z
suiup switch  sui@testnet-vX.Y.Z
suiup install walrus@testnet-vX.Y.Z
suiup switch  walrus@testnet-vX.Y.Z
```

## Sui wallet

Install any Sui-compatible wallet browser extension. [Slush](https://slush.app/) is recommended for development.

Create a new address for testnet work:

```bash
sui client new-address ed25519
# Copy the address shown and fund it from the testnet faucet
```

Fund the address from the [Sui testnet faucet](https://faucet.sui.io/).

## Repositories

Each package is a standalone repository with its own lockfile — there is no monorepo install.
Clone what you need and work in it directly:

```bash
git clone https://github.com/meddleware-org/seal-client.git
cd seal-client && npm install && npm test && npm run type-check
```

Apps depend on the SDKs through npm; to develop an app against an unpublished SDK change, use
`npm link` (or an `overrides` entry pointing at a local path) in the app.
