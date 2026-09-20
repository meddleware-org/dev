# Environment setup

## Active network

The Sui CLI stores network configuration in `~/.sui/sui_config/client.yaml`. To switch networks:

```bash
sui client switch --env testnet
sui client envs   # list all configured environments
```

## Active address

```bash
sui client active-address   # show the current active address
sui client addresses         # list all known addresses
sui client switch --address <ADDRESS>
```

## Gas and the testnet faucet

Fund a testnet address from the faucet:

```bash
# Via CLI
sui client faucet --address <ADDRESS>

# Or navigate to https://faucet.sui.io/ and paste the address
```

Check balance:

```bash
sui client balance
```

## Localnet

For contract development and integration testing, a local network is the fastest iteration loop:

```bash
# Start a local network with a built-in faucet
sui start --with-faucet
# → Fullnode: http://127.0.0.1:9000
# → Faucet: http://127.0.0.1:9123

# Add the localnet environment (first time only)
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
sui client switch --env localnet

# Fund the active address from the local faucet
sui client faucet
```

### Publishing contracts to localnet

```bash
cd blockchain/sui/contracts/core
sui move build --build-env localnet
sui client publish --gas-budget 200000000
```

Keep the published package address — you'll need it to call entry functions in tests.

## TypeScript SDK — network configuration

The `@mysten/sui` SDK reads the network from your build config or at runtime:

```ts
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

const network = (import.meta.env.VITE_NETWORK ?? 'testnet') as 'localnet' | 'testnet' | 'mainnet'

const client = new SuiClient({
  url: network === 'localnet'
    ? 'http://127.0.0.1:9000'
    : getFullnodeUrl(network),
})
```

::: warning Public fullnodes
Public testnet fullnodes use **gRPC/GraphQL** (JSON-RPC was retired in September 2026). The `SuiClient` from `@mysten/sui ^2.x` uses GraphQL transport by default — ensure you are on a current SDK version.
:::

## Useful CLI commands

```bash
# Object details
sui client object <OBJECT_ID>

# Call a Move function
sui client call \
  --package <PACKAGE_ID> \
  --module <MODULE> \
  --function <FUNCTION> \
  --args <ARG1> <ARG2> \
  --gas-budget 10000000

# Read Move events
sui client events --package <PACKAGE_ID>
```
