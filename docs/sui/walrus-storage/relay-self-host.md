# Self-host a Walrus relay

A Walrus **upload relay** encodes a blob and fans it out to the storage nodes on the client's behalf,
so a browser uploads once instead of to every node. Meddleware runs Mysten's
[`walrus-upload-relay`](https://docs.wal.app/) and puts an [nft-gate gateway](/sui/access-gate/gateway)
in front of it, so only holders of an access pass can upload.

## Architecture

```text
Browser (walrus-client, uploadRelayHost = gateway)
  │
  ▼
nft-gate gateway  (Cloudflare Worker or Rust)
  │  GET /v1/challenge · verifies the access proof (+ consume in single-use mode)
  │  public: /v1/tip-config
  │  adds origin credentials (e.g. Cloudflare Access service token)
  ▼
walrus-upload-relay  (container; tip-charging)
  │
  ▼
Walrus storage nodes
```

The relay itself holds no key and pays nothing: the user's register transaction pays storage and
the relay's tip. Storage fees are paid by the uploader's wallet, not the operator.

## 1. Run the relay

Use the upstream image `docker.io/mysten/walrus-upload-relay`, pinned by digest. It needs two
config files:

- **Walrus client config** (`client_config.yaml`) — the Walrus system/staking objects for the
  network (from the Walrus docs).
- **Relay config** (`relay.yaml`) — the tip schedule:

  ```yaml
  tip_config: !send_tip
    address: "0x<your address>"     # receives the tips
    kind: !linear
      base: 1000                     # MIST per upload
      encoded_size_mul_per_kib: 10   # + MIST per KiB of encoded size
  ```

The relay reads its config only at start — restart it after any change (in Kubernetes, generate the
ConfigMaps with a content hash so edits roll the pods). Size memory for the largest blob you accept:
the relay holds roughly **4.5×** the blob in memory while encoding. It serves HTTP on port `57391`
and Prometheus metrics on `9184`.

## 2. Put the gateway in front

Deploy an nft-gate gateway ([deployment guide](/sui/access-gate/gateway)) with:

| Setting | Value for a relay |
| --- | --- |
| `UPSTREAM_URL` | the relay's origin URL |
| `NFT_TYPE` / `GATE_ID` | the pass type and gate your users buy |
| `PUBLIC_PATHS` | `/v1/tip-config` (clients read the tip before paying) |
| `MAX_BODY_BYTES` | at least your largest upload (the default 256 KiB is far too small; Meddleware uses 100 MiB) |
| `SINGLE_USE` | `true` to spend one pass use per upload |

Raise the body limit on every proxy in the path too (e.g. an NGINX ingress defaults to 1 MiB and
answers `413` above it), and allow a proxy read timeout long enough for large uploads.

## 3. Lock the origin

A Cloudflare Worker gateway reaches the relay over the public internet, so the relay's hostname
must reject everyone except the gateway — otherwise anyone can bypass the pass check:

1. Expose the relay on its own hostname (e.g. through a Cloudflare Tunnel).
2. Protect it with a Cloudflare Access application whose only policy allows a **service token**
   (non-identity decision, fallback blocked).
3. Give the gateway the token: `wrangler secret put UPSTREAM_AUTH_HEADERS` →
   `CF-Access-Client-Id: <id>, CF-Access-Client-Secret: <secret>`.

A Rust gateway running beside the relay can instead reach it on a private network address.

## 4. Verify

```bash
curl -s  https://<gateway>/v1/tip-config                  # 200 — tip schedule (public)
curl -sI -X POST https://<gateway>/v1/blob-upload-relay     # 401 — missing access proof
curl -sI https://<relay-origin>/v1/tip-config               # 403 — origin locked
```

Then upload from an app with `uploadRelayHost` set to the gateway (see the
[integration guide](./integration)).

<!-- white-label: operator customization guide (custom domain, branding, fee collection address, gate config) — planned -->
