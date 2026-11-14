# KeyNest Security Notes

Living record of security decisions. Every new extension permission, crypto
parameter or storage choice gets an entry here with its reason.

## Extension permissions

| Permission | Why | Added in |
| ---------- | --- | -------- |
| _(none)_   | —   | Phase 0  |

## Content Security Policy

`extension_pages`: `script-src 'self' 'wasm-unsafe-eval'; object-src 'self';`

`'wasm-unsafe-eval'` is required to run Argon2id (hash-wasm) as WebAssembly. It
allows compiling WebAssembly only, not JavaScript `eval()`.

## Cryptography (Phase 1, `lib/vault/`)

| Item               | Choice                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| KDF                | Argon2id via `hash-wasm`, 32-byte output, 16-byte random salt                                           |
| KDF default cost   | 64 MiB memory, 3 iterations, parallelism 4                                                              |
| KDF minimum cost   | 19 MiB, 2 iterations, parallelism 1 (OWASP minimum). Files below this are refused.                      |
| Password handling  | Unicode NFC normalization before derivation, so all OSes derive the same key                            |
| Key structure      | Envelope: Argon2id → KEK (non-extractable) wraps a random 256-bit vault key                             |
| Encryption         | AES-256-GCM (Web Crypto), fresh 12-byte random IV per encryption                                        |
| Additional data    | Wrapped key bound to `keynest-vault-key:v1`; each entry bound to its id, revision, updatedAt            |
| Plaintext metadata | Only entry id, revision and updatedAt (needed for sync merging). Titles, URLs, usernames are encrypted. |

The vault key is extractable so it can be kept in `chrome.storage.session`
across service-worker restarts. That decision is pending (below).

## Decisions pending

- **Where the unlocked vault key lives** given MV3 service-worker termination.
  Recommended: `chrome.storage.session` (memory only, cleared on browser
  close, not exposed to content scripts) plus auto-lock. See Project.md 5.4.
- **Auto-lock timeout** default.
- **Deletion tombstones** for sync merging (Phase 8).

## Threat model

To be written before Phase 5.
