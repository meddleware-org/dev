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

# Pin to the exact versions used in this workspace
suiup install sui@testnet-v1.76.1
suiup switch sui@testnet-v1.76.1

suiup install walrus@testnet-v1.53.0
suiup switch walrus@testnet-v1.53.0

# Verify
sui --version     # sui testnet-v1.76.1
walrus --version  # walrus testnet-v1.53.0
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

## npm workspaces

The monorepo uses npm workspaces. Install all dependencies from the workspace root:

```bash
cd workspace/
npm install
```

Individual packages can be built or tested independently:

```bash
cd repos/walrus-ui && npm run build
cd repos/seal-ui   && npm run type-check
```
