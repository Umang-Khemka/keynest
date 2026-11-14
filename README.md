# KeyNest

A secure, local-first password manager that detects password changes and helps
keep saved credentials up to date.

Status: **Phase 0**. Not ready to store real passwords. See
[Project.md](Project.md) for the full plan and [docs/security.md](docs/security.md)
for security decisions.

## Supported platforms

The browser extension builds for Chromium (Chrome, Edge, Brave, Opera) and
Firefox on Windows, macOS and Linux.

## Getting started

Requirements: Node.js 22 (see `.nvmrc`) and npm.

> Keep the repo outside OneDrive / Dropbox / iCloud synced folders. Syncing
> `node_modules` makes installs very slow and causes file-lock errors.

```sh
npm install
npm run dev            # opens Chrome with the extension loaded
npm run dev:firefox    # opens Firefox with the extension loaded
```

## Scripts

| Script                            | What it does                          |
| --------------------------------- | ------------------------------------- |
| `npm run dev` / `dev:firefox`     | Dev mode with hot reload              |
| `npm run build` / `build:firefox` | Production build into `.output/`      |
| `npm run zip` / `zip:firefox`     | Store-ready zip                       |
| `npm run typecheck`               | TypeScript check                      |
| `npm run lint`                    | ESLint                                |
| `npm run format`                  | Prettier (write)                      |
| `npm test`                        | Vitest                                |
| `npm run check`                   | Everything CI runs, except the builds |

CI runs these on Windows, macOS and Linux for every push and pull request.

## Loading a build manually

- **Chrome/Edge/Brave**: open `chrome://extensions`, enable Developer mode,
  "Load unpacked", select `.output/chrome-mv3`.
- **Firefox**: open `about:debugging#/runtime/this-firefox`, "Load Temporary
  Add-on", select `.output/firefox-mv3/manifest.json`.
