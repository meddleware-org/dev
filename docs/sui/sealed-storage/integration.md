# Sealed Storage — Integration guide

Examples use the `seal` controller from the [SDK setup](./), a Walrus client `walrus` from
[`createWalrusClient`](/sui/walrus-storage/), and an executor `exec` that signs and executes
transactions (in Vue: `@meddleware/wallet-adapter`).

## Encrypt to an access gate and store on Walrus

```ts
import { createBlobUploadFlow } from '@meddleware/walrus-client'
import type { SealedManifest } from '@meddleware/seal-client'

// 1. Encrypt locally: anyone holding a valid pass for `gateId` will be able to decrypt
const { id, ciphertext } = await seal.encrypt('nft-gate', { gateId }, plaintextBytes)

// 2. Store the ciphertext (register → upload → certify; see Walrus Storage)
const flow = createBlobUploadFlow(walrus, ciphertext)
await flow.encode()
const reg = await exec.signAndExecute(flow.register({ epochs: 53, owner: address, deletable: false }))
await exec.waitForTransaction(reg.digest)
await flow.upload({ digest: reg.digest })
const cert = await exec.signAndExecute(flow.certify())
await exec.waitForTransaction(cert.digest)
const { blobId } = await flow.getBlob()

// 3. Keep the manifest — it is all a reader needs
const manifest: SealedManifest = { policyType: 'nft-gate', id, blobId, network: 'testnet', params: { gateId } }
```

A time lock instead: `seal.encrypt('time-lock', { unlockMs: Date.parse('2027-01-01') }, bytes)`.

## Decrypt

```ts
import { parseSealedManifest, SealedManifestError } from '@meddleware/seal-client'
import { walrusBlobUrl } from '@meddleware/walrus-client'

const m = parseSealedManifest(untrustedJson)
if (m.network !== 'testnet') throw new Error('Manifest is for another network')

const ciphertext = new Uint8Array(await (await fetch(walrusBlobUrl('testnet', m.blobId))).arrayBuffer())

// nft-gate needs the reader's pass: its object id, and whether the gate is soulbound
const plaintext = await seal.decrypt(
  m.policyType,
  { ...m.params, nftId: passId, soulbound },
  m.id,
  ciphertext,
  { address, signPersonalMessage: (message) => wallet.signPersonalMessage({ message }) },
)
```

The first decrypt for an address asks the wallet for one personal-message signature (the Seal
session key); later decrypts reuse it until it expires. Find the reader's pass with
`fetchAccessNfts(client, address, nftType, gateId)` from `@meddleware/access-gate-client`.

## Publish a discovery pointer (optional)

`sealed_content::publish` records an on-chain pointer (gate, blob, identity, label) so unlock UIs can
list what a gate protects. It is **not** a policy and grants nothing:

```ts
import { Transaction } from '@mysten/sui/transactions'
import { buildPublishSealedContentTx, sealedContentEventType } from '@meddleware/seal-client'

const tx = new Transaction()
buildPublishSealedContentTx(tx, SEAL_POLICIES_PACKAGE, { gateId, blobId, sealId: id, label: 'Chapter 1' })
await exec.signAndExecute(tx)
```

Anyone can publish a pointer under any gate with any label. When listing pointers (events of type
`sealedContentEventType(pkg)`), show only those whose `publisher` is the gate's operator or a list you
curate.

## What access means

- **Membership, not consumption.** Decrypting never spends a single-use pass; an exhausted
  (zero-use) pass cannot decrypt.
- **No revocation.** A released key stays usable, and a decrypted file stays decrypted. Transferring
  a pass moves future access with it.
- **Pause.** If the gate was created with the policy `pause_blocks_decryption`, a paused gate denies
  new decryptions (`nft_gate` abort 4) until it is unpaused — tell the user it is paused rather than
  that their pass is invalid. Otherwise pausing only stops sales.

## Errors

| Where | Meaning | Handling |
| --- | --- | --- |
| `nft_gate` abort 1 | identity not namespaced to this gate | wrong manifest/gate pairing |
| `nft_gate` abort 2 | pass is for another gate | pick the pass for `params.gateId` |
| `nft_gate` abort 3 | pass has no uses left | buy another pass |
| `nft_gate` abort 4 | gate paused and its policy blocks decryption | retry after the operator unpauses |
| `timelock` abort 2 | before the unlock time | show the unlock date |
| `SealedManifestError` | malformed manifest | reject the input |
| key-server / network errors | committee unavailable or below threshold | retry; decryption fails closed |

Codes repeat across modules — always key on `(module, code)` ([PTB patterns](/sui/ptb-patterns#error-handling)).
