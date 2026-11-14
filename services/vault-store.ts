import { browser } from 'wxt/browser';

import { fromBase64, toBase64 } from '@/lib/encoding';
import { parseVaultFile } from '@/lib/vault/parse';
import type { VaultFile } from '@/lib/vault/types';

/**
 * Persistence for the extension:
 * - The encrypted vault file lives in `storage.local` (on disk, encrypted).
 * - The unlocked vault key lives in `storage.session` (memory only, cleared
 *   when the browser closes, not readable by content scripts) so the vault
 *   stays unlocked when the popup closes or the service worker restarts.
 * - An alarm locks the vault after AUTO_LOCK_MINUTES without activity.
 */

export const AUTO_LOCK_MINUTES = 10;
export const AUTO_LOCK_ALARM = 'keynest-auto-lock';

const AUTO_LOCK_MS = AUTO_LOCK_MINUTES * 60_000;
const VAULT_STORAGE_KEY = 'vault';
const SESSION_STORAGE_KEY = 'session';

interface SessionData {
  /** Base64 raw AES-256 vault key. */
  vaultKey: string;
  /** Epoch milliseconds after which the vault must be locked. */
  lockAt: number;
}

export async function loadVaultFile(): Promise<VaultFile | null> {
  const stored = await browser.storage.local.get(VAULT_STORAGE_KEY);
  const data: unknown = stored[VAULT_STORAGE_KEY];
  return data === undefined ? null : parseVaultFile(data);
}

export async function saveVaultFile(file: VaultFile): Promise<void> {
  await browser.storage.local.set({ [VAULT_STORAGE_KEY]: file });
}

async function readSession(): Promise<SessionData | null> {
  const stored = await browser.storage.session.get(SESSION_STORAGE_KEY);
  const data: unknown = stored[SESSION_STORAGE_KEY];
  if (
    typeof data === 'object' &&
    data !== null &&
    'vaultKey' in data &&
    'lockAt' in data &&
    typeof data.vaultKey === 'string' &&
    typeof data.lockAt === 'number'
  ) {
    return { vaultKey: data.vaultKey, lockAt: data.lockAt };
  }
  return null;
}

async function writeSession(vaultKey: string): Promise<void> {
  const lockAt = Date.now() + AUTO_LOCK_MS;
  const session: SessionData = { vaultKey, lockAt };
  await browser.storage.session.set({ [SESSION_STORAGE_KEY]: session });
  await browser.alarms.create(AUTO_LOCK_ALARM, { when: lockAt });
}

const isExpired = (session: SessionData) => Date.now() >= session.lockAt;

/** Keeps the vault unlocked after a successful unlock or vault creation. */
export async function startSession(key: CryptoKey): Promise<void> {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  try {
    await writeSession(toBase64(raw));
  } finally {
    raw.fill(0);
  }
}

/** Returns the vault key if the vault is still unlocked, and resets the auto-lock timer. */
export async function resumeSession(): Promise<CryptoKey | null> {
  const session = await readSession();
  if (!session) return null;
  if (isExpired(session)) {
    await lock();
    return null;
  }
  const key = await crypto.subtle.importKey(
    'raw',
    fromBase64(session.vaultKey),
    'AES-GCM',
    true,
    ['encrypt', 'decrypt'],
  );
  await writeSession(session.vaultKey);
  return key;
}

/** Records user activity: pushes the auto-lock deadline back. */
export async function touchSession(): Promise<void> {
  const session = await readSession();
  if (!session) return;
  if (isExpired(session)) await lock();
  else await writeSession(session.vaultKey);
}

export async function lock(): Promise<void> {
  await browser.storage.session.remove(SESSION_STORAGE_KEY);
  await browser.alarms.clear(AUTO_LOCK_ALARM);
}

/** Called when the auto-lock alarm fires. Locks if the deadline has passed, otherwise re-arms. */
export async function enforceAutoLock(): Promise<void> {
  const session = await readSession();
  if (!session) return;
  if (isExpired(session)) await lock();
  else await browser.alarms.create(AUTO_LOCK_ALARM, { when: session.lockAt });
}

/** Calls `callback` when the stored vault file changes (e.g. saved from another tab). */
export function onVaultChange(callback: (file: VaultFile) => void): () => void {
  const listener: Parameters<
    typeof browser.storage.onChanged.addListener
  >[0] = (changes, area) => {
    const change = changes[VAULT_STORAGE_KEY];
    if (area !== 'local' || change?.newValue == null) return;
    try {
      callback(parseVaultFile(change.newValue));
    } catch {
      // Ignore invalid data; loadVaultFile will report it on next open.
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

/** Calls `callback` whenever the vault gets locked (from any popup or the background). */
export function onLock(callback: () => void): () => void {
  const listener: Parameters<
    typeof browser.storage.onChanged.addListener
  >[0] = (changes, area) => {
    const change = changes[SESSION_STORAGE_KEY];
    // Browsers omit newValue when a key is removed; treat null the same.
    if (area === 'session' && change && change.newValue == null) {
      callback();
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
