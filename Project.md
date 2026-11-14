# KeyNest — Project Blueprint

> A secure, intelligent, cross-platform password manager that detects password changes and helps users keep their saved credentials up to date.

**Project status:** Phase 0 — Project Initialization  
**Initial platform:** Browser extension (Chromium + Firefox) on Windows, macOS and Linux  
**Next platform:** Desktop app (Tauri) on Windows, macOS and Linux  
**Maybe later:** Android and iOS  
**Primary language:** TypeScript  
**Package manager:** npm

---

# 1. Project Overview

KeyNest is a cross-platform password manager designed to simplify credential management.

Traditional password managers allow users to save, retrieve and autofill credentials. However, when users change their passwords on external websites, they often need to manually update their saved credentials.

KeyNest aims to improve this experience.

Its primary feature is intelligent password-change detection.

When a user changes a password on a supported website, KeyNest should:

1. Detect the password-change workflow.
2. Identify the newly entered password.
3. Determine whether the password change was likely successful.
4. Ask the user whether they want to update their saved credential.
5. Update the encrypted vault only after user confirmation.

KeyNest will also provide conventional password-manager functionality, including secure credential storage, password generation, autofill and password organization.

## Core Product Philosophy

- Security first, convenience second.
- Local-first architecture.
- User-controlled credential updates.
- Minimal permissions.
- No unnecessary collection of sensitive information.
- Shared core architecture across platforms.
- No plaintext password storage or transmission.

---

# 2. Primary Features

## 2.1 Secure Password Vault

Users should be able to:

- Create a master password.
- Unlock and lock their vault.
- Add credentials manually.
- Edit saved credentials.
- Delete credentials.
- Search saved accounts.
- Organize credentials by website.
- Mark frequently used credentials as favorites.
- View credential creation and modification timestamps.

## 2.2 Intelligent Password-Change Detection

This is KeyNest's primary differentiating feature.

The extension should recognize common password-change workflows.

Examples:

- Current password + new password + confirmation password.
- New password + confirmation password.
- Password reset pages.
- Password changes through account settings.

### Expected workflow

1. User visits a website.
2. KeyNest identifies a possible password-change form.
3. User enters their new password.
4. User submits the form.
5. KeyNest temporarily retains a candidate password in memory.
6. KeyNest observes available success indicators.
7. KeyNest displays an update confirmation.
8. User approves or rejects the update.
9. If approved, the encrypted vault is updated.

### Making it a real differentiator

Chrome's built-in manager, Bitwarden and 1Password already offer an "update saved password?" prompt. KeyNest must do it better, not just do it:

- **Accurate success detection.** Competitors often prompt even when the change failed. Not treating submission as success is our core value — invest most effort here.
- **Generator-assisted changes.** When a change form is detected, offer a generated password. KeyNest then already knows the expected new value, which makes detection far more reliable.
- **Password rotation assistant.** Surface stale, weak or reused passwords and open each site's change page via the standard `/.well-known/change-password` URL, where detection takes over.

### Important rules

- Never update credentials automatically without user confirmation.
- Never assume form submission means password change success.
- Discard candidates when the user cancels.
- Avoid retaining passwords unnecessarily.
- Do not send passwords to external services.
- Handle ambiguous success states carefully.

## 2.3 Intelligent Autofill

KeyNest should:

- Detect login forms.
- Identify supported username and password fields.
- Match websites against saved credentials.
- Suggest the appropriate account.
- Autofill after user interaction or explicit approval.
- Prevent autofill on unrelated or suspicious domains.

## 2.4 Password Generator

Users should be able to generate passwords based on:

- Desired length.
- Uppercase letters.
- Lowercase letters.
- Numbers.
- Special characters.
- Exclusion of ambiguous characters.

Passwords must be generated using cryptographically secure randomness.

## 2.5 Import, Export and Recovery (MVP)

- **CSV import** from Chrome, Firefox, Bitwarden and LastPass. Without it, almost nobody will try a new password manager.
- **Encrypted export / emergency kit.** If the master password is lost, the vault is unrecoverable — users must be able to make an encrypted backup from Phase 1.
- **Clipboard copy with auto-clear** after ~30 seconds.

## 2.6 Password Health

Future functionality:

- Weak password detection.
- Reused password detection.
- Password strength analysis.
- Potentially compromised credential alerts.
- Password age and update history.

Compromised-password checking must not expose plaintext passwords to external services.

---

# 3. Technology Stack

## Browser Extension

- WXT (builds Chromium and Firefox from one codebase)
- React
- TypeScript
- WebExtension APIs (Manifest V3)
- Web Crypto API (AES-256-GCM, random values)
- Argon2id via WebAssembly (`hash-wasm`) — Web Crypto does not provide Argon2

Browser targets:

| Browser                                  | Windows | macOS                                            | Linux |
| ---------------------------------------- | ------- | ------------------------------------------------ | ----- |
| Chrome / Edge / Brave / Opera (Chromium) | Yes     | Yes                                              | Yes   |
| Firefox                                  | Yes     | Yes                                              | Yes   |
| Safari                                   | —       | Deferred (needs Xcode + Apple developer account) | —     |

## Frontend

- React
- TypeScript
- CSS Modules or regular CSS
- No requirement to introduce a heavy UI framework.

## Local Storage

- **One portable, versioned, encrypted vault format** (a single JSON document) shared by every platform.
- The extension keeps it in IndexedDB; the desktop app keeps it as a `.keynest` file on disk.
- The same file is used for export/import and for bring-your-own sync (see Future Sync).

Only encrypted credential data should be persisted.

## Cryptography

- Argon2id for master-password-based key derivation.
- AES-256-GCM for credential encryption.
- Cryptographically secure random number generation.
- Random salts and unique encryption nonces.
- Versioned encryption metadata.

Use established, audited cryptographic implementations rather than implementing algorithms ourselves.

## Future Sync — Bring Your Own Sync

No KeyNest server. Users sync the encrypted vault file with a tool they already use (Syncthing, Dropbox, OneDrive, Google Drive, iCloud Drive). KeePassXC works this way.

- We never hold user data, so there is no server to breach or operate.
- Requires a merge strategy for concurrent edits (per-entry timestamps / revision IDs in the vault format).

A hosted Go + PostgreSQL E2E sync service is an optional, much later idea — not planned.

## Testing

- Vitest
- React Testing Library
- Playwright
- Browser extension integration tests.

## Cross-Platform Development Rules

The team works on Windows, macOS and Linux, so the repo must build identically on all three.

- `.gitattributes` forces LF line endings.
- npm scripts must not use shell-specific commands (`rm -rf`, `export`, `&&` chains relying on bash). Use Node scripts, `rimraf`, `cross-env`.
- Node version pinned via `.nvmrc` and `engines`.
- CI (lint, typecheck, test, build) runs on `windows-latest`, `macos-latest` and `ubuntu-latest`.
- Use `path`/`URL` APIs in tooling, never hard-coded `/` or `\` separators.
- Do not keep the repo inside OneDrive/Dropbox/iCloud synced folders — syncing `node_modules` causes file locks and slow installs.

---

# 4. Project Architecture

The long-term architecture will be modular and shared across platforms.

```text
keynest/
│
├── apps/
│   │
│   ├── extension/
│   │   ├── entrypoints/
│   │   │   ├── popup/
│   │   │   ├── background.ts
│   │   │   └── content.ts
│   │   │
│   │   ├── components/
│   │   └── services/
│   │
│   └── desktop/
│       ├── src/
│       └── src-tauri/
│
├── packages/
│   │
│   ├── core/
│   │   ├── credentials/
│   │   ├── detection/
│   │   ├── generator/
│   │   └── validation/
│   │
│   ├── crypto/
│   ├── storage/
│   ├── autofill/
│   └── shared-types/
│
├── docs/
│   ├── architecture.md
│   ├── security.md
│   ├── encryption.md
│   └── development-roadmap.md
│
├── package.json
└── README.md
```

We will start with a simpler structure inside the WXT project and gradually extract shared modules into npm workspaces.

Do not create every directory immediately. Add modules when their implementation begins.

---

# 5. Security Architecture

Security is a foundational requirement, not a future enhancement.

## 5.1 Master Password

The master password is used to derive a key through Argon2id.

The master password itself must never be stored.

## 5.2 Envelope Encryption

The vault will use two levels of keys:

1. A key derived from the master password.
2. A randomly generated vault encryption key.

The derived key protects the vault key. The vault key encrypts the actual credential data.

This allows us to change the master password by rewrapping the vault key rather than decrypting and re-encrypting every credential.

## 5.3 Encryption Flow

```text
Master Password
      |
      v
    Argon2id
      |
      v
Key Encryption Key
      |
      v
Decrypt Wrapped Vault Key
      |
      v
Vault Encryption Key
      |
      v
AES-256-GCM
      |
      v
Encrypted Credentials
      |
      v
IndexedDB / SQLite
```

## 5.4 Manifest V3 Service-Worker Lifecycle

In MV3 the background script is a service worker that the browser terminates after ~30 seconds of inactivity. This affects two designs and must be decided in Phase 1:

- **Unlocked vault key.** A key held only in background memory disappears at unpredictable times. Options: keep it in `chrome.storage.session` (memory-only, cleared when the browser closes, not accessible to content scripts), or require re-unlock. The chosen trade-off must be written down in `docs/security.md`.
- **Password-change candidates.** Content scripts are destroyed when the page navigates after a form submit, so they cannot hold the candidate while success is observed. Candidates must be sent to the background, kept in session storage with a short expiry (e.g. 5 minutes), keyed by tab and origin, and cleared on approval, rejection or expiry.

## 5.5 Security Requirements

- Never store plaintext passwords.
- Never log credentials.
- Never transmit plaintext credentials.
- Use unique nonces for AES-GCM encryption.
- Validate website origins before autofilling.
- Use secure browser messaging.
- Minimize extension permissions.
- Lock the vault after inactivity.
- Clear temporary sensitive data when no longer needed.
- Protect encryption keys using platform security facilities where available.
- Review dependencies and browser-extension attack surfaces.
- Provide encrypted backup (emergency kit) from Phase 1.

The application must also have a documented threat model and undergo independent security review before handling real users' production credentials.

---

# 6. Development Phases

Development will happen in separate phases. Each phase must have a working deliverable before we move forward.

## PHASE 0 — Project Initialization

**Objective:** Establish the development environment.

Tasks:

- Create GitHub repository.
- Initialize WXT.
- Configure React and TypeScript.
- Configure npm.
- Set up ESLint and formatting.
- Set up Vitest.
- Configure Git, `.gitignore` and `.gitattributes`.
- Pin Node version.
- Set up CI on Windows, macOS and Linux.
- Create initial project documentation.
- Run the extension in Chrome and Firefox.

Deliverable:

A working extension development environment that builds for Chromium and Firefox on all three operating systems.

---

## PHASE 1 — Secure Local Password Vault

**Objective:** Build the fundamental password-manager functionality.

Tasks:

1. Define credential data models.
2. Design the vault data format.
3. Implement master-password setup.
4. Implement Argon2id key derivation (WASM; allow `'wasm-unsafe-eval'` in the extension CSP).
5. Implement vault-key generation and wrapping.
6. Implement AES-256-GCM encryption and decryption.
7. Implement IndexedDB storage of the portable vault format.
8. Implement vault locking, unlocking and auto-lock, with the service-worker key strategy from 5.4.
9. Build the credential dashboard.
10. Add, edit, delete and search credentials.
11. Implement password generation.
12. Copy to clipboard with auto-clear.
13. Encrypted export / import (emergency kit).
14. CSV import from common password managers.

Deliverable:

A working password manager that can securely store and retrieve encrypted credentials locally.

Acceptance criteria:

- User can create and unlock a vault.
- Credentials can be added and retrieved.
- Stored credential data is encrypted.
- Incorrect master passwords cannot unlock the vault.
- Vault locking prevents credential access.
- Encryption and decryption tests pass.
- An exported vault can be re-imported and unlocked.
- Vault survives the background service worker being terminated.

---

## PHASE 2 — Browser Login Detection and Autofill

**Objective:** Allow KeyNest to recognize login forms and provide saved credentials.

Tasks:

1. Implement content scripts.
2. Detect password and username fields.
3. Identify website origins.
4. Match website origins with saved credentials.
5. Implement secure messaging between content scripts and background scripts.
6. Build credential selection UI.
7. Implement user-approved autofill.
8. Handle dynamically generated forms.
9. Prevent autofill on unrelated origins.

Deliverable:

Users can visit websites and autofill their saved credentials.

Acceptance criteria:

- Recognizes common login forms.
- Displays matching saved credentials.
- Supports multiple accounts on one website.
- Handles dynamically generated login forms.
- Prevents cross-origin credential leakage.

---

## PHASE 3 — Intelligent Password-Change Detection

**Objective:** Build the main differentiating feature.

Tasks:

1. Identify password-change forms.
2. Identify current-password fields.
3. Identify new-password fields.
4. Identify confirmation-password fields.
5. Detect reset-password workflows.
6. Implement DOM mutation monitoring.
7. Detect form submissions.
8. Send candidate passwords to the background and hold them in session storage (see 5.4).
9. Observe navigation and success indicators.
10. Implement candidate expiration and cleanup.
11. Build detection confidence rules.
12. Offer a generated password on detected change forms.
13. Password rotation assistant using `/.well-known/change-password`.

Deliverable:

KeyNest can recognize likely password-change workflows and identify candidate new passwords.

Acceptance criteria:

- Does not confuse ordinary login forms with password-change forms.
- Handles common password-change layouts.
- Handles dynamically generated forms.
- Does not persist candidates before confirmation.
- Discards cancelled or expired candidates.

---

## PHASE 4 — Password Update Confirmation

**Objective:** Connect password-change detection with the encrypted vault.

Tasks:

1. Build password-change notification UI.
2. Display the associated website and account.
3. Show an update confirmation.
4. Allow users to approve or reject updates.
5. Handle websites with multiple saved accounts.
6. Verify that the candidate belongs to the intended credential.
7. Encrypt the new password.
8. Update the corresponding vault entry.
9. Update modification timestamps.
10. Handle ambiguous and failed submissions.

Deliverable:

The complete automatic password-change detection and confirmation workflow.

Acceptance criteria:

- Successful password changes trigger an update prompt.
- Failed password changes never silently overwrite saved credentials.
- User approval is required.
- Updated credentials remain encrypted.
- Reopening the vault shows the updated credential.

---

## PHASE 5 — Reliability and Security Testing

**Objective:** Make the browser extension reliable enough for wider testing.

Tasks:

- Test common website login forms.
- Test common password-change forms.
- Test password reset workflows.
- Test unsuccessful submissions.
- Test multiple tabs.
- Test multiple accounts.
- Test extension reloads.
- Test vault locking.
- Test encryption edge cases.
- Review extension permissions.
- Audit dependencies.
- Perform security-focused code review.

Deliverable:

A stable browser-extension MVP suitable for controlled testing.

---

## PHASE 6 — Desktop Application

**Objective:** Bring KeyNest to desktop platforms.

Platforms:

- Windows
- macOS
- Linux

Technology:

- Tauri
- React
- TypeScript
- Shared portable vault file (`.keynest`)
- Platform-protected key storage via the Rust `keyring` crate

Platform differences to handle:

| Concern                              | Windows                                      | macOS                                                          | Linux                                                                         |
| ------------------------------------ | -------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| OS key storage                       | Credential Manager / DPAPI                   | Keychain                                                       | Secret Service (libsecret) — may be absent; fall back to master password only |
| Browser ↔ desktop (native messaging) | Registry key                                 | JSON manifest in `~/Library/Application Support/...`           | JSON manifest in `~/.config/...`                                              |
| Packaging                            | `.msi` / `.exe`                              | `.dmg`                                                         | AppImage, `.deb`, `.rpm`                                                      |
| Signing                              | Code-signing cert (else SmartScreen warning) | Apple Developer account + notarization (else "app is damaged") | Not required                                                                  |
| Biometrics                           | Windows Hello                                | Touch ID                                                       | Usually unavailable                                                           |

Builds are produced by GitHub Actions on a Windows/macOS/Ubuntu matrix with `tauri-action`, so no team member needs to own every OS.

Tasks:

- Create desktop application.
- Implement secure vault access.
- Integrate the shared credential model.
- Add desktop password generation.
- Implement native-messaging browser integration.
- Add application locking.
- Implement encrypted import/export.
- Bring-your-own sync: watch the vault file and merge external changes.

Deliverable:

A desktop password manager on Windows, macOS and Linux that works with the same encrypted vault file as the extension.

---

## PHASE 7 — Android and iOS (Deferred)

**Status:** Not planned for now. Native autofill services make this a separate project; revisit only after the extension and desktop app are stable.

**Objective:** Introduce mobile credential management.

### Android

- React Native interface.
- Native Kotlin Autofill Service.
- Android Autofill Framework integration.
- Secure key storage using Android Keystore.
- Biometric unlocking.
- Shared encrypted vault format.

### iOS

- React Native interface.
- Swift Credential Provider Extension.
- AuthenticationServices integration.
- Keychain-based key protection.
- Face ID / Touch ID integration.
- Shared encrypted vault format.

Deliverable:

Mobile applications capable of providing password autofill through their respective operating-system frameworks.

Note: Native integration is necessary; a normal React Native application alone cannot provide complete system-level autofill functionality.

---

## PHASE 8 — Bring-Your-Own Sync

**Objective:** Synchronize the encrypted vault across devices without running a KeyNest server.

Approach: users place the `.keynest` vault file in a folder synced by Syncthing, Dropbox, OneDrive, Google Drive or iCloud Drive.

Tasks:

1. Add per-entry revision IDs and timestamps to the vault format.
2. Detect external changes to the vault file.
3. Merge concurrent edits entry-by-entry; surface true conflicts to the user.
4. Handle sync-tool conflict copies (e.g. `vault (conflicted copy).keynest`).
5. Add merge and corruption tests.

Deliverable:

Users can keep the same encrypted vault on multiple devices using their own sync tool.

A hosted Go + PostgreSQL E2E sync service is out of scope.

---

## PHASE 9 — Advanced Features

Potential future features:

- Password health dashboard.
- Reused-password detection.
- Weak-password detection.
- Password history.
- Secure notes.
- Secure identity information.
- TOTP authenticator.
- Passkey management.
- Security notifications.
- Safari extension.

These features are not part of the initial MVP.

---

# 7. Development Priority

The development order is important.

| Priority | Phase                                       | Importance                     |
| -------- | ------------------------------------------- | ------------------------------ |
| 1        | Project initialization                      | Essential                      |
| 2        | Secure local vault                          | Essential                      |
| 3        | Login detection and autofill                | Essential                      |
| 4        | Password-change detection                   | Core differentiator            |
| 5        | Confirmation and updates                    | Core differentiator            |
| 6        | Security testing                            | Essential before wider release |
| 7        | Desktop application (Windows, macOS, Linux) | Expansion                      |
| 8        | Bring-your-own sync                         | Expansion                      |
| 9        | Advanced features                           | Future                         |
| 10       | Android and iOS                             | Deferred                       |

---

# 8. Development Rules

The following rules should be followed throughout the project.

### Code Quality

- Use TypeScript strictly.
- Avoid unnecessary `any`.
- Keep modules small and focused.
- Separate UI, business logic and infrastructure.
- Write tests alongside critical functionality.
- Avoid duplicating shared logic.
- Use meaningful types and interfaces.

### Security

- Never compromise encryption for convenience.
- Never save credentials before user approval.
- Never log sensitive information.
- Never send credentials to any external service.
- Keep extension permissions minimal.
- Validate origins before autofilling.
- Use established cryptographic libraries.

### Git Workflow

Use feature branches.

Example:

```text
main
  |
  ├── feature/vault-ui
  ├── feature/crypto-engine
  ├── feature/local-storage
  ├── feature/login-detection
  └── feature/password-change-detection
```

Every major feature should have:

- Implementation.
- Tests.
- Documentation where necessary.
- A reviewed pull request.

### Development Philosophy

Do not build future features prematurely.

Complete the current phase, test it and verify its acceptance criteria before moving forward.

Avoid unnecessary abstractions until a genuine need emerges.

---

# 9. Initial MVP Definition

The first public-facing MVP will be a browser extension for Chromium and Firefox, working on Windows, macOS and Linux.

It must demonstrate the following complete workflow:

1. User installs KeyNest.
2. User creates a master password.
3. User creates and unlocks an encrypted vault.
4. User imports a CSV or manually saves a website credential.
5. User visits the website.
6. KeyNest detects the login form.
7. User autofills their credentials.
8. User changes their password.
9. KeyNest detects the likely password change.
10. KeyNest asks for confirmation.
11. User approves the update.
12. KeyNest securely updates the encrypted vault.
13. User closes and reopens the extension.
14. User unlocks the vault and retrieves the updated password.

**This complete workflow is the definition of our first major product milestone.**

---

# 10. Immediate Next Steps

We are currently at Phase 0.

Our immediate tasks:

- [ ] Move the repo out of OneDrive (e.g. `C:\dev\keynest`).
- [ ] Create GitHub repository named `keynest`.
- [x] Initialize WXT with React and TypeScript.
- [x] Use npm as the package manager.
- [x] Set up the initial folder structure.
- [x] Configure TypeScript, ESLint, Prettier and Vitest.
- [x] Add `.gitattributes`, `.nvmrc` and cross-platform CI.
- [ ] Run the extension in Chrome and Firefox.
- [ ] Create the first credential data model.
- [ ] Begin Phase 1.

### Current technology decisions

| Decision            | Selected                                                        |
| ------------------- | --------------------------------------------------------------- |
| Project name        | KeyNest                                                         |
| Initial platform    | Browser extension (Chromium + Firefox) on Windows, macOS, Linux |
| Next platform       | Tauri desktop app on Windows, macOS, Linux                      |
| Mobile              | Deferred                                                        |
| Language            | TypeScript                                                      |
| Package manager     | npm                                                             |
| Extension framework | WXT                                                             |
| Frontend            | React                                                           |
| Vault format        | Single portable encrypted JSON document                         |
| Local storage       | IndexedDB (extension), `.keynest` file (desktop)                |
| Key derivation      | Argon2id (WASM, `hash-wasm`)                                    |
| Encryption          | AES-256-GCM (Web Crypto)                                        |
| Backend             | None                                                            |
| Password updates    | User confirmation                                               |
| Synchronization     | Bring-your-own (file sync tools), Phase 8                       |

---

# Final Vision

KeyNest should become more than a place where people store passwords.

It should be a secure credential-management system that works across Windows, macOS and Linux — in the browser first, then on the desktop.

The primary differentiator remains intelligent password-change detection combined with user-controlled updates.

We will prioritize security, reliability and a good user experience over the number of features.

**Build a reliable password manager first. Build an intelligent password manager second. Expand it into a cross-platform product third.**
