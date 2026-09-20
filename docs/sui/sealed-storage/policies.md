# Writing policies

Access policies are Move objects that implement the Seal policy interface. The `seal_policies_sui` package provides built-in policy types; you can also author custom policies.

## Built-in policy types

| Policy | Condition for access |
| --- | --- |
| `AllowlistPolicy` | Address is on an explicit allowlist managed by the policy owner |
| `NftGatePolicy` | Address holds a qualifying NFT from a specified gate |
| `TimeLockPolicy` | Current epoch ≥ unlock epoch |
| `ThresholdPolicy` | m-of-n signers from a configured set |

## NFT gate policy (most common)

Create a policy that requires an active Access Gate pass:

```move
// seal_policies_sui::nft_gate_policy
public fun create(
    gate_id: ID,           // access_gate::Gate object ID
    ctx: &mut TxContext,
): NftGatePolicy
```

In TypeScript, after publishing the policy, record its object ID in your manifest.

```ts
import { Transaction } from '@mysten/sui/transactions'

const tx = new Transaction()
const [policy] = tx.moveCall({
  target: `${SEAL_POLICIES_PACKAGE}::nft_gate_policy::create`,
  arguments: [tx.pure.id(GATE_OBJECT_ID)],
})
tx.transferObjects([policy], tx.pure.address(ownerAddress))
await client.signAndExecuteTransaction({ transaction: tx, signer })
```

## Time-lock policy

```ts
const [policy] = tx.moveCall({
  target: `${SEAL_POLICIES_PACKAGE}::time_lock_policy::create`,
  arguments: [tx.pure.u64(unlockEpoch)],
})
```

## Custom policy

A policy must expose a public `approve` function that Seal calls during key request:

```move
module my_policy::my_policy {
    use sui::tx_context::TxContext;

    public struct MyPolicy has key, store {
        id: UID,
        // your policy state
    }

    /// Seal calls this to check whether the requester is permitted.
    /// Abort if access is denied.
    public fun approve(policy: &MyPolicy, requester: address, _ctx: &TxContext) {
        assert!(is_allowed(policy, requester), EAccessDenied);
    }
}
```

The `approve` function is the only required interface. Any state can live in the policy object.

## Policy lifecycle

- Policies are shared or owned objects on-chain.
- The creator controls mutation (e.g. adding to an allowlist) via the object's admin cap.
- Revoking access for an allowlist policy: remove the address via the admin function.
- Policies cannot be retroactively applied to already-encrypted blobs — encryption and the policy are bound at encrypt time.

::: warning Pre-mainnet requirement
The Seal key server committee for mainnet is not yet formed. Testnet policies work against the testnet Seal committee. See [DEFERRED_WORK.md](https://github.com/meddleware-org/vault) for the mainnet committee timeline.
:::
