# DAO — Governance integration

[User docs →](https://docs.meddleware.co.uk/blockchain/sui/dao/) | [API reference →](https://docs.meddleware.co.uk/blockchain/sui/dao/reference)

The vault DAO governs privileged parameters — fee rates, strategy allocations, skim thresholds, fee recipients, and access gate policy. The `vault_dao` package issues `DaoAdminCap` to the multisig governor; `vault_governor` gates privileged operations behind it.

## Key objects

| Object | Description |
| --- | --- |
| `DaoAdminCap` | Owned object; required as a witness for all DAO-gated calls |
| `ConfigState` | Shared object; holds all DAO-governed parameters |
| `vault_governor` | Package that executes privileged vault operations given `DaoAdminCap` |

## Reading current config

```ts
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') })

// Fetch ConfigState fields
const config = await suiClient.getObject({
  id: CONFIG_STATE_ID,
  options: { showContent: true },
})

const fields = (config.data?.content as any)?.fields
console.log({
  skimFeeBps:       fields.skim_fee_bps,
  skimThresholdMist: fields.skim_threshold_mist,
  buybackBps:       fields.buyback_bps,
  feeRecipients:    fields.fee_recipients,
})
```

## Composing a governance PTB

DAO operations are PTBs that pass the `DaoAdminCap` to `vault_governor` functions. The `DaoAdminCap` must be an owned object held by the signer.

### Update `skim_fee_bps`

```ts
import { Transaction } from '@mysten/sui/transactions'

function buildSetSkimFeeBpsTx(
  daoAdminCapId: string,
  configStateId: string,
  newBps: number,         // e.g. 1000 = 10%
): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${VAULT_GOVERNOR_PACKAGE}::vault_governor::set_skim_fee_bps`,
    arguments: [
      tx.object(daoAdminCapId),
      tx.object(configStateId),
      tx.pure.u64(newBps),
    ],
  })
  return tx
}

// Execute
const tx = buildSetSkimFeeBpsTx(daoAdminCapId, CONFIG_STATE_ID, 1000)
await signAndExecute({ transaction: tx })
```

### Update fee recipients

`fee_recipients` is a vector of `(address, weight_bps)` tuples. The weights must sum to 10 000.

```ts
function buildSetFeeRecipientsTx(
  daoAdminCapId: string,
  configStateId: string,
  recipients: Array<{ address: string; weightBps: number }>,
): Transaction {
  const tx = new Transaction()

  const addrs = recipients.map(r => r.address)
  const weights = recipients.map(r => r.weightBps)

  tx.moveCall({
    target: `${VAULT_GOVERNOR_PACKAGE}::vault_governor::set_fee_recipients`,
    arguments: [
      tx.object(daoAdminCapId),
      tx.object(configStateId),
      tx.pure(addrs,    'vector<address>'),
      tx.pure(weights,  'vector<u64>'),
    ],
  })
  return tx
}
```

### Pause / unpause the vault

```ts
function buildPauseVaultTx(daoAdminCapId: string, vaultId: string): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${VAULT_GOVERNOR_PACKAGE}::vault_governor::pause`,
    arguments: [tx.object(daoAdminCapId), tx.object(vaultId)],
  })
  return tx
}
```

## Dry-run before executing

Always dry-run DAO transactions before live execution:

```ts
const dryRun = await suiClient.dryRunTransactionBlock({
  transactionBlock: await tx.build({ client: suiClient }),
})

if (dryRun.effects.status.status !== 'success') {
  console.error('Dry-run failed:', dryRun.effects.status.error)
} else {
  console.log('Gas estimate:', dryRun.effects.gasUsed)
}
```

## Event monitoring

Subscribe to governance events to observe when parameters change:

```ts
const unsubscribe = await suiClient.subscribeEvent({
  filter: { Package: VAULT_GOVERNOR_PACKAGE },
  onMessage: (event) => {
    console.log('Governance event:', event.type, event.parsedJson)
  },
})
```

Key event types emitted by `vault_governor`:

| Event | Emitted when |
| --- | --- |
| `SkimFeeBpsUpdated` | `skim_fee_bps` changed |
| `FeeRecipientsUpdated` | `fee_recipients` changed |
| `VaultPaused` | Vault paused |
| `VaultResumed` | Vault unpaused |
| `StrategyAllocationUpdated` | Strategy allocation cap changed |

## Trust assumptions

- The `DaoAdminCap` holder has full governance authority. Guard the signer with a multisig policy or hardware key.
- `ConfigState` is a shared object; any party can read it on-chain.
- There is no timelock on governance operations at testnet. A timelock module is planned for mainnet — monitor `docs/DEFERRED_WORK.md`.

<!-- white-label: operator guide (multisig setup, custom governance modules, off-chain voting integration) — planned -->
