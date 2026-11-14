# KeyNest Security Notes

Living record of security decisions. Every new extension permission, crypto
parameter or storage choice gets an entry here with its reason.

## Extension permissions

| Permission | Why | Added in |
| ---------- | --- | -------- |
| _(none)_   | —   | Phase 0  |

## Decisions pending for Phase 1

- **Where the unlocked vault key lives** given MV3 service-worker termination
  (`chrome.storage.session` vs. re-unlock). See Project.md section 5.4.
- **Argon2id parameters** (memory, iterations, parallelism) and how they are
  stored in versioned vault metadata.
- **Extension CSP**: Argon2id runs as WebAssembly, so `extension_pages` must
  allow `'wasm-unsafe-eval'`.
- **Auto-lock timeout** default.

## Threat model

To be written before Phase 5.
