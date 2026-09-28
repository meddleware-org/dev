# PTB patterns

Programmable Transaction Blocks (PTBs) compose several Move calls into one atomic transaction. Every
on-chain action in the Meddleware apps is a PTB built with `@mysten/sui/transactions`, most of them
by the SDK builders (`buildPurchaseTx`, `buildCreateGateTx`, …); the patterns below are what those
builders do.

## Basic structure

```ts
import { Transaction } from '@mysten/sui/transactions'
import { SuiGrpcClient } from '@mysten/sui/grpc'

const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' })
const tx = new Transaction()

// Add Move calls, object inputs and coin splits here
// ...

// Sign and execute with a keypair (scripts); in a browser app the wallet signs instead
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  include: { effects: true, events: true },
})
await client.waitForTransaction({ result }) // before reading its effects back
```

## Common patterns

### Calling a Move function

```ts
tx.moveCall({
  target: `${PACKAGE_ID}::${MODULE}::${FUNCTION}`,
  arguments: [
    tx.object(objectId),            // an existing on-chain object (owned or shared)
    tx.pure.u64(1000n),             // a scalar
    tx.pure.address(recipientAddr),
    tx.pure.vector('u8', nonceBytes),
  ],
})
```

### Splitting coins for a payment

`access_gate::purchase` takes the payment as a `Coin<SUI>`; split exactly the price from gas. The
function mints the pass to the sender and refunds any overpayment itself, so nothing needs
transferring afterwards:

```ts
const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(priceMist)])
tx.moveCall({
  target: `${ACCESS_GATE_PACKAGE}::access_gate::purchase`,
  arguments: [tx.object(GATE_ID), tx.object(PLATFORM_CONFIG_ID), payment],
})
```

### Passing a result into a later call

A `moveCall` returns its results; pass them as arguments to later commands in the same PTB. Creating
a gate with a restrictive policy builds the `GatePolicy` value first:

```ts
const [policy] = tx.moveCall({
  target: `${ACCESS_GATE_PACKAGE}::access_gate::new_gate_policy`,
  arguments: [tx.pure.bool(true), tx.pure.bool(false), tx.pure.bool(true)],
})
tx.moveCall({
  target: `${ACCESS_GATE_PACKAGE}::access_gate::create_gate_with_policy`,
  arguments: [/* price, recipient, uses, soulbound, auto-burn, name, image, description */ ...values, policy],
})
```

(`create_gate_with_policy` needs a policy-aware `access_gate` version — see its
[API reference](/sui/onchain/access-gate/api-reference).)

## Simulate before sending

Simulation runs the transaction without executing it — use it to validate inputs and size gas before
asking a wallet to sign:

```ts
tx.setSender(address)
const sim = await client.simulateTransaction({ transaction: tx, include: { effects: true } })
const outcome = sim.Transaction ?? sim.FailedTransaction
if (!outcome.status.success) {
  console.error('Would fail:', outcome.status.error?.message)
}
```

## Gas budget

Wallets and `signAndExecuteTransaction` set the budget from a simulation automatically. Set one
explicitly only for scripts that must cap spend:

```ts
tx.setGasBudget(20_000_000n) // 0.02 SUI
```

## Wallet integration (Vue)

Meddleware apps use [`@meddleware/wallet-adapter`](https://www.npmjs.com/package/@meddleware/wallet-adapter),
a wallet-standard composable whose connection is shared by every view in the window:

```ts
import { useWallet } from '@meddleware/wallet-adapter'

const { account, buildExecutor } = useWallet({ requiredFeatures: ['sui:signTransaction'] })

async function run(tx: Transaction): Promise<string> {
  const exec = await buildExecutor('testnet', 'https://fullnode.testnet.sui.io:443')
  const { digest } = await exec.signAndExecute(tx)
  await exec.waitForTransaction(digest)
  return digest
}
```

## Error handling

A transaction that executed but aborted comes back as `FailedTransaction` — it does not throw. Move
aborts carry the module and the code; abort codes are only unique **within** a module
(`access_gate`, `nft_gate` and `timelock` all use small integers), so always key on
`(module, code)`:

```ts
const ABORTS: Record<string, Record<number, string>> = {
  access_gate: {
    1: 'This gate is paused.',
    2: 'Payment is below the gate price.',
    4: 'This pass has no uses left.',
    5: 'This pass or cap belongs to a different gate.',
    6: 'This gate is frozen.',
    10: 'This gate cannot be frozen while paused.',
  },
  nft_gate: { 2: 'Pass is for a different gate.', 3: 'Pass is used up.', 4: 'Gate is paused.' },
}

function describeFailure(outcome: { status: { success: boolean; error?: any } }): string | null {
  if (outcome.status.success) return null
  const err = outcome.status.error
  if (err?.$kind === 'MoveAbort') {
    const module = err.MoveAbort.location?.module ?? ''
    const code = Number(err.MoveAbort.abortCode)
    return ABORTS[module]?.[code] ?? `${module} aborted with code ${code}`
  }
  return err?.message ?? 'Transaction failed'
}
```

Full abort-code tables live in each package's API reference:
[`access_gate`](/sui/onchain/access-gate/api-reference) ·
[`seal_policies`](/sui/onchain/sealed-storage/api-reference).
