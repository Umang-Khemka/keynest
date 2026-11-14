import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { MIN_KDF_COST } from '@/lib/vault/kdf';
import { createVault } from '@/lib/vault/vault';

import {
  AUTO_LOCK_ALARM,
  AUTO_LOCK_MINUTES,
  enforceAutoLock,
  loadVaultFile,
  lock,
  onLock,
  resumeSession,
  saveVaultFile,
  startSession,
  touchSession,
} from './vault-store';

const MINUTE = 60_000;

async function keyBytes(key: CryptoKey) {
  return new Uint8Array(await crypto.subtle.exportKey('raw', key));
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('vault file storage', () => {
  it('returns null before a vault exists', async () => {
    expect(await loadVaultFile()).toBeNull();
  });

  it('saves and loads the encrypted vault file', async () => {
    const { file } = await createVault('master password', MIN_KDF_COST);
    await saveVaultFile(file);
    expect(await loadVaultFile()).toEqual(file);
  });
});

describe('session and auto-lock', () => {
  it('stays unlocked across popup reopen', async () => {
    const { key } = await createVault('master password', MIN_KDF_COST);
    await startSession(key);

    const resumed = await resumeSession();
    expect(resumed).not.toBeNull();
    expect(await keyBytes(resumed as CryptoKey)).toEqual(await keyBytes(key));
  });

  it('locks after the auto-lock period without activity', async () => {
    const { key } = await createVault('master password', MIN_KDF_COST);
    await startSession(key);

    vi.advanceTimersByTime(AUTO_LOCK_MINUTES * MINUTE);
    expect(await resumeSession()).toBeNull();
  });

  it('activity pushes the auto-lock deadline back', async () => {
    const { key } = await createVault('master password', MIN_KDF_COST);
    await startSession(key);

    vi.advanceTimersByTime((AUTO_LOCK_MINUTES - 1) * MINUTE);
    await touchSession();
    vi.advanceTimersByTime((AUTO_LOCK_MINUTES - 1) * MINUTE);

    expect(await resumeSession()).not.toBeNull();
  });

  it('the alarm locks an expired session but not an active one', async () => {
    const { key } = await createVault('master password', MIN_KDF_COST);
    await startSession(key);

    vi.advanceTimersByTime(MINUTE);
    await enforceAutoLock();
    expect(await resumeSession()).not.toBeNull();

    vi.advanceTimersByTime(AUTO_LOCK_MINUTES * MINUTE);
    await enforceAutoLock();
    expect(await resumeSession()).toBeNull();
    expect(await fakeBrowser.alarms.get(AUTO_LOCK_ALARM)).toBeUndefined();
  });

  it('manual lock clears the session and notifies listeners', async () => {
    const { key } = await createVault('master password', MIN_KDF_COST);
    await startSession(key);
    const listener = vi.fn();
    const unsubscribe = onLock(listener);

    await lock();

    expect(await resumeSession()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('never puts the key in persistent storage', async () => {
    const { file, key } = await createVault('master password', MIN_KDF_COST);
    await saveVaultFile(file);
    await startSession(key);

    const local = JSON.stringify(await fakeBrowser.storage.local.get());
    const rawKey = btoa(String.fromCharCode(...(await keyBytes(key))));
    expect(local).not.toContain(rawKey);
  });
});
