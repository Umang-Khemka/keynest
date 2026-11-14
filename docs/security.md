# KeyNest Security Notes

Living record of security decisions. Every new extension permission, crypto
parameter or storage choice gets an entry here with its reason.

## Extension permissions

| Permission | Why                                                                      | Added in |
| ---------- | ------------------------------------------------------------------------ | -------- |
| `storage`  | Encrypted vault in `storage.local`; unlocked key in `storage.session`    | Phase 1  |
| `alarms`   | Auto-lock fires even when the popup is closed and the worker was stopped | Phase 1  |

Neither permission shows an install warning to users.

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

## Storage and session (Phase 1, `services/vault-store.ts`)

| Item               | Decision                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Vault file         | `storage.local`, encrypted only. Validated with `parseVaultFile` on every load.                         |
| Unlocked vault key | Raw key in `storage.session`: memory only, cleared on browser close, not accessible to content scripts. |
| Stay unlocked      | Closing the popup does not lock the vault (needed for autofill in Phase 2).                             |
| Auto-lock          | 10 minutes without activity. Enforced by an alarm, and re-checked whenever the key is read.             |
| Activity           | Clicks/key presses in the popup reset the timer (throttled to once per 30 s).                           |
| Master password    | Minimum 12 characters at setup. Never stored.                                                           |
| Clipboard          | Copied secrets are cleared after 30 s **only while the popup stays open** (see known gaps).             |

The vault key is extractable so it can be written to `storage.session`. Any
code running in a trusted extension context can read it while unlocked.

## Known gaps

- **Clipboard clearing after the popup closes** needs a background helper
  (offscreen document in Chrome, background page in Firefox).
- **Unlock attempts are not rate-limited** beyond the cost of Argon2id.
- **Deletion tombstones** for sync merging (Phase 8).
- **CSV imports are plaintext files.** The import screen warns users to delete
  the file afterwards; KeyNest cannot do it for them.

## Backup, restore and import (Phase 1)

- **Backup** is the vault file itself, downloaded as `.keynest` JSON. It stays
  encrypted with the master password that was current at export time.
- **Restore** is only offered before a vault exists, so it can never overwrite
  saved passwords. The backup's master password must unlock it first.
- **Import** (CSV or another backup) only adds entries. Exact duplicates are
  skipped; for the same entry id, the newer version wins.
- All file handling runs on a full-tab extension page, not in the popup.
- Imported files are limited to 10 MB and validated before use.

## Threat model

To be written before Phase 5.
