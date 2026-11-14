import { useState, type FormEvent } from 'react';

import type { VaultFile } from '@/lib/vault/types';
import { WrongPasswordError } from '@/lib/vault/vault';

import { errorMessage, parseBackup, readTextFile } from '../files';

interface Props {
  onRestore: (file: VaultFile, masterPassword: string) => Promise<void>;
}

export function RestoreSection({ onRestore }: Props) {
  const [backup, setBackup] = useState<VaultFile | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function chooseFile(file: File | undefined) {
    setError(null);
    setBackup(null);
    if (!file) return;
    try {
      setBackup(parseBackup(await readTextFile(file)));
    } catch (err) {
      setError(errorMessage(err, 'Could not read this file.'));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!backup || !password) return;
    setBusy(true);
    setError(null);
    try {
      await onRestore(backup, password);
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'Incorrect master password for this backup.'
          : 'Could not restore this backup.',
      );
      setBusy(false);
    }
  }

  return (
    <form className="section" onSubmit={submit}>
      <h2>Restore from a backup</h2>
      <p className="muted">
        Choose a <code>.keynest</code> backup file and enter the master password
        that was used when the backup was made.
      </p>
      <input
        type="file"
        accept=".keynest,.json,application/json"
        onChange={(e) => chooseFile(e.target.files?.[0])}
      />
      {backup && (
        <>
          <p className="muted">
            Backup contains {backup.entries.length} passwords.
          </p>
          <label className="field">
            <span>Master password of this backup</span>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button
          type="submit"
          className="primary"
          disabled={!backup || !password || busy}
        >
          {busy ? 'Restoring…' : 'Restore vault'}
        </button>
      </div>
      <p className="muted small-text">
        No backup? Open KeyNest from the toolbar to create a new vault.
      </p>
    </form>
  );
}
