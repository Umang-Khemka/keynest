import { useEffect, useRef, useState } from 'react';

import type { Credential, VaultFile } from '@/lib/vault/types';
import {
  changeMasterPassword,
  createVault,
  deleteCredential,
  putCredential,
  readCredentials,
  unlockVault,
} from '@/lib/vault/vault';
import {
  loadVaultFile,
  lock as lockSession,
  onLock,
  onVaultChange,
  resumeSession,
  saveVaultFile,
  startSession,
  touchSession,
} from '@/services/vault-store';

export type VaultState =
  | { status: 'loading' }
  | { status: 'setup' }
  | { status: 'locked'; file: VaultFile }
  | {
      status: 'unlocked';
      file: VaultFile;
      key: CryptoKey;
      credentials: Credential[];
    }
  | { status: 'error'; message: string };

/** Minimum time between auto-lock timer resets caused by clicks and key presses. */
const ACTIVITY_THROTTLE_MS = 30_000;

async function loadInitialState(): Promise<VaultState> {
  try {
    const file = await loadVaultFile();
    if (!file) return { status: 'setup' };
    const key = await resumeSession();
    if (!key) return { status: 'locked', file };
    const credentials = await readCredentials({ file, key });
    return { status: 'unlocked', file, key, credentials };
  } catch {
    return {
      status: 'error',
      message: 'The vault could not be loaded. It may be damaged.',
    };
  }
}

export function useVault() {
  const [state, setState] = useState<VaultState>({ status: 'loading' });
  const lastTouch = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void loadInitialState().then((initial) => {
      if (!cancelled) setState(initial);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-lock (from the background alarm or another popup) closes this view too.
  useEffect(
    () =>
      onLock(() =>
        setState((prev) =>
          prev.status === 'unlocked'
            ? { status: 'locked', file: prev.file }
            : prev,
        ),
      ),
    [],
  );

  // Another tab saved the vault (import, password change, edit): reload it so
  // this page never writes back a stale copy.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(
    () =>
      onVaultChange((file) => {
        const current = stateRef.current;
        if (current.status === 'locked') {
          setState({ status: 'locked', file });
        } else if (
          current.status === 'unlocked' &&
          current.file.updatedAt !== file.updatedAt
        ) {
          void readCredentials({ file, key: current.key }).then(
            (credentials) => setState({ ...current, file, credentials }),
            () => void lockSession(),
          );
        }
      }),
    [],
  );

  // Using the popup counts as activity and pushes auto-lock back.
  useEffect(() => {
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouch.current < ACTIVITY_THROTTLE_MS) return;
      lastTouch.current = now;
      void touchSession();
    };
    document.addEventListener('pointerdown', onActivity);
    document.addEventListener('keydown', onActivity);
    return () => {
      document.removeEventListener('pointerdown', onActivity);
      document.removeEventListener('keydown', onActivity);
    };
  }, []);

  async function create(masterPassword: string) {
    const { file, key } = await createVault(masterPassword);
    await saveVaultFile(file);
    await startSession(key);
    setState({ status: 'unlocked', file, key, credentials: [] });
  }

  /** Throws WrongPasswordError when the password is incorrect. */
  async function unlock(masterPassword: string) {
    if (state.status !== 'locked') return;
    const { file } = state;
    const key = await unlockVault(file, masterPassword);
    const credentials = await readCredentials({ file, key });
    await startSession(key);
    setState({ status: 'unlocked', file, key, credentials });
  }

  async function lock() {
    await lockSession();
    setState((prev) =>
      prev.status === 'unlocked' ? { status: 'locked', file: prev.file } : prev,
    );
  }

  async function commit(file: VaultFile) {
    if (state.status !== 'unlocked') return;
    await saveVaultFile(file);
    const credentials = await readCredentials({ file, key: state.key });
    setState({ ...state, file, credentials });
    void touchSession();
  }

  async function save(credential: Credential) {
    if (state.status !== 'unlocked') return;
    await commit(await putCredential(state, credential));
  }

  async function remove(id: string) {
    if (state.status !== 'unlocked') return;
    await commit(deleteCredential(state.file, id));
  }

  /** Saves many credentials (an import) in one write. */
  async function saveMany(credentials: Credential[]) {
    if (state.status !== 'unlocked') return;
    let file = state.file;
    for (const credential of credentials) {
      file = await putCredential({ file, key: state.key }, credential);
    }
    await commit(file);
  }

  /**
   * Uses a backup file as this browser's vault. Only allowed before a vault
   * exists, so it can never overwrite saved passwords.
   * Throws WrongPasswordError when the backup's master password is incorrect.
   */
  async function restore(file: VaultFile, masterPassword: string) {
    if (state.status !== 'setup') return;
    const key = await unlockVault(file, masterPassword);
    const credentials = await readCredentials({ file, key });
    await saveVaultFile(file);
    await startSession(key);
    setState({ status: 'unlocked', file, key, credentials });
  }

  /** Throws WrongPasswordError when the current master password is incorrect. */
  async function changePassword(current: string, next: string) {
    if (state.status !== 'unlocked') return;
    await unlockVault(state.file, current);
    await commit(await changeMasterPassword(state, next));
  }

  return {
    state,
    create,
    unlock,
    lock,
    save,
    remove,
    saveMany,
    restore,
    changePassword,
  };
}
