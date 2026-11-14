import { useState, type FormEvent } from 'react';

import { credentialsFromCsv } from '@/lib/import/csv-import';
import { planMerge, type MergePlan } from '@/lib/import/merge';
import type { Credential, VaultFile } from '@/lib/vault/types';
import {
  readCredentials,
  unlockVault,
  WrongPasswordError,
} from '@/lib/vault/vault';

import { errorMessage, parseBackup, readTextFile } from '../files';

interface Props {
  existing: Credential[];
  onImport: (credentials: Credential[]) => Promise<void>;
}

type Step =
  | { kind: 'idle' }
  | { kind: 'backup-password'; backup: VaultFile }
  | { kind: 'preview'; plan: MergePlan; fromCsv: boolean; ignored: number }
  | { kind: 'done'; imported: number; fromCsv: boolean };

export function ImportSection({ existing, onImport }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function chooseFile(file: File | undefined) {
    setError(null);
    setPassword('');
    setStep({ kind: 'idle' });
    if (!file) return;
    try {
      const text = await readTextFile(file);
      if (file.name.toLowerCase().endsWith('.csv')) {
        const { credentials, skippedRows } = credentialsFromCsv(text);
        setStep({
          kind: 'preview',
          plan: planMerge(existing, credentials),
          fromCsv: true,
          ignored: skippedRows,
        });
      } else {
        setStep({ kind: 'backup-password', backup: parseBackup(text) });
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not read this file.'));
    }
  }

  async function openBackup(event: FormEvent) {
    event.preventDefault();
    if (step.kind !== 'backup-password' || !password) return;
    setBusy(true);
    setError(null);
    try {
      const key = await unlockVault(step.backup, password);
      const credentials = await readCredentials({ file: step.backup, key });
      setStep({
        kind: 'preview',
        plan: planMerge(existing, credentials),
        fromCsv: false,
        ignored: 0,
      });
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'Incorrect master password for this backup.'
          : 'Could not open this backup.',
      );
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (step.kind !== 'preview') return;
    setBusy(true);
    setError(null);
    try {
      await onImport(step.plan.toSave);
      setStep({
        kind: 'done',
        imported: step.plan.toSave.length,
        fromCsv: step.fromCsv,
      });
    } catch {
      setError('Import failed. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section">
      <h2>Import passwords</h2>
      <p className="muted">
        From a CSV export of Chrome, Edge, Firefox, Bitwarden or LastPass, or
        from another KeyNest backup. Duplicates are skipped.
      </p>
      <input
        type="file"
        accept=".csv,.keynest,.json,text/csv,application/json"
        onChange={(e) => chooseFile(e.target.files?.[0])}
      />

      {step.kind === 'backup-password' && (
        <form className="field" onSubmit={openBackup}>
          <label htmlFor="backup-password">
            Master password of this backup
          </label>
          <div className="input-group">
            <input
              id="backup-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" disabled={!password || busy}>
              {busy ? 'Opening…' : 'Open'}
            </button>
          </div>
        </form>
      )}

      {step.kind === 'preview' && (
        <>
          <p>
            <strong>{step.plan.toSave.length}</strong> passwords to import
            {step.plan.skipped > 0 &&
              `, ${step.plan.skipped} already in your vault`}
            {step.ignored > 0 && `, ${step.ignored} rows without a password`}.
          </p>
          <div className="actions">
            <button
              type="button"
              className="primary"
              disabled={step.plan.toSave.length === 0 || busy}
              onClick={confirmImport}
            >
              {busy
                ? 'Importing…'
                : `Import ${step.plan.toSave.length} passwords`}
            </button>
          </div>
        </>
      )}

      {step.kind === 'done' && (
        <p className="success" role="status">
          Imported {step.imported} passwords.
        </p>
      )}

      {(step.kind === 'preview' || step.kind === 'done') && step.fromCsv && (
        <p className="warning">
          The CSV file contains your passwords in plain text. Delete it now, and
          empty your trash / recycle bin.
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
