# Writing policies

Seal access policies are **Move functions**, not objects: a Seal key server releases a key share only
if the policy's `seal_approve*` entry function **succeeds in a dry run** with the requester as sender.
The `seal_policies` package (`seal-policies-sui`) ships the built-in policies; its on-chain reference
is maintained with the package and imported into this site:

- [On-chain overview](/sui/onchain/sealed-storage/overview)
- [Developer integration](/sui/onchain/sealed-storage/dev-guide) — approve PTBs, identity layouts,
  discovery, normative rules
- [On-chain API reference](/sui/onchain/sealed-storage/api-reference) — every function, abort code and
  layout

## Built-in policies

| Module | Entry function | Access condition | Identity layout |
| --- | --- | --- | --- |
| `nft_gate` | `seal_approve(id, &Gate, &AccessNFT)` / `seal_approve_soulbound(id, &Gate, &SoulboundAccessNFT)` | caller holds a valid, non-exhausted pass for that gate | `[32-byte gate id][nonce]` |
| `timelock` | `seal_approve(id, &Clock)` | on-chain clock ≥ `unlock_ms` | `[8-byte big-endian unlock_ms][nonce]` |

`sealed_content::publish` is **not** a policy — it is a permissionless discovery registry.

There is nothing to create or deploy per policy: you encrypt under an identity with
`@meddleware/seal-client`, and at decryption time the client builds the approve transaction for the
key servers.

## Writing a custom policy

A new policy is a **new module** (existing modules are never edited) exposing its own
`seal_approve*` entry function, plus a matching provider in `@meddleware/seal-client`:

```move
module my_policies::allowlist;

use sui::vec_set::VecSet;

const E_NOT_ALLOWED: u64 = 1;
const E_BAD_ID: u64 = 2;

public struct Allowlist has key { id: UID, members: VecSet<address> }

/// Dry-run by the Seal key servers with the requester as sender. MUST be side-effect free:
/// immutable references only — no transfers, object creation, mutation or events.
entry fun seal_approve(id: vector<u8>, list: &Allowlist, ctx: &TxContext) {
    // Namespace the identity to this object so content for list A cannot unlock with list B.
    assert!(id.length() >= 32, E_BAD_ID);
    let lid = object::id_bytes(list);
    let mut i = 0;
    while (i < 32) { assert!(id[i] == lid[i], E_BAD_ID); i = i + 1; };
    assert!(list.members.contains(&ctx.sender()), E_NOT_ALLOWED);
}
```

Rules every policy MUST follow:

- The function name starts with `seal_approve` and its first argument is the identity `vector<u8>`.
- Side-effect free (it is dry-run, not executed); abort to deny.
- Length-check every identity byte you read, and keep the layout bit-for-bit identical to the client
  encoder — commit a shared conformance vector tested on both sides.
- Namespace identities to the controlling object so one object's access never unlocks another's
  content.
- Membership, not consumption: approval cannot spend anything, and a released key stays usable.

## Policy lifecycle

- Encryption binds the ciphertext to a package ID and identity; it cannot be re-pointed afterwards.
- An upgradeable policy package can change who may decrypt **all** existing ciphertext — burn its
  `UpgradeCap` or hold it in a multisig before relying on it in production.

::: warning Pre-mainnet requirement
The Seal key-server committee for mainnet is not yet formed; testnet policies work against the testnet
committee.
:::
