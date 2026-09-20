# PTB patterns

Programmable Transaction Blocks (PTBs) let you compose multiple Move calls into a single atomic transaction. The Meddleware apps use PTBs for every multi-step on-chain operation.

## Basic structure

```ts
import { Transaction } from '@mysten/sui/transactions'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

const client = new SuiClient({ url: getFullnodeUrl('testnet') })
const tx = new Transaction()

// Add Move calls, object inputs, and coin splits here
// ...

// Sign and execute (with a wallet or a keypair)
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  options: { showEffects: true, showObjectChanges: true },
})
```

## Common patterns

### Calling a Move function

```ts
tx.moveCall({
  target: `${PACKAGE_ID}::${MODULE}::${FUNCTION}`,
  arguments: [
    tx.object(objectId),          // pass an existing on-chain object
    tx.pure.u64(1000n),           // pass a scalar
    tx.pure.address(recipientAddr),
  ],
})
```

### Splitting coins for a payment

```ts
const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(feeMist)])
tx.moveCall({
  target: `${PACKAGE}::module::pay`,
  arguments: [coin],
})
```

### Multi-step composition (example: deposit → allocate)

```ts
// 1. Split exact SUI amount
const [depositCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)])

// 2. Deposit into vault (returns mwSUI shares)
const [shares] = tx.moveCall({
  target: `${VAULT_PACKAGE}::vault_core::deposit`,
  arguments: [depositCoin, tx.object(VAULT_ID), tx.object(CONFIG_ID)],
})

// 3. Transfer shares to caller (or keep for further use)
tx.transferObjects([shares], tx.pure.address(callerAddress))
```

### Reading a result across calls

Results from `moveCall` are returned as `TransactionResult` values. Pass them to subsequent calls:

```ts
const [mintedNft] = tx.moveCall({ target: `${PKG}::nft::mint`, arguments: [...] })
tx.moveCall({
  target: `${PKG}::vault::deposit_nft`,
  arguments: [mintedNft],  // result used as argument
})
```

## Dry-run before sending

```ts
const dryRunResult = await client.dryRunTransaction({
  transaction: await tx.build({ client }),
})
if (dryRunResult.effects.status.status !== 'success') {
  console.error('Dry-run failed:', dryRunResult.effects.status.error)
}
```

## Setting gas budget

```ts
tx.setGasBudget(20_000_000n)  // 0.02 SUI; adjust to operation complexity
```

For complex multi-step PTBs (rebalance, multi-strategy allocation), use 100–200 MIST × number of strategy steps as a baseline and dry-run to confirm.

## Wallet integration

In a Vue app using `@mysten/dapp-kit`:

```ts
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'

const account = useCurrentAccount()
const { mutate: signAndExecute } = useSignAndExecuteTransaction()

function executeMyPTB() {
  const tx = new Transaction()
  // ... build tx ...
  signAndExecute(
    { transaction: tx },
    {
      onSuccess: (result) => { console.log('digest:', result.digest) },
      onError:   (err)    => { console.error(err) },
    },
  )
}
```

## Error handling

Move aborts are surfaced as numeric codes in `effects.status.error`. Map them to human-readable messages for your users:

```ts
const VAULT_ERRORS: Record<number, string> = {
  1: 'Insufficient balance',
  5: 'Below minimum deposit',
  85: 'Stale strategy NAV — refresh all active strategy NAVs in the same PTB',
}

function describeAbort(error: string): string {
  const match = error.match(/MoveAbort\(.*?,\s*(\d+)\)/)
  const code = match ? parseInt(match[1]) : -1
  return VAULT_ERRORS[code] ?? `Unknown error (code ${code})`
}
```
