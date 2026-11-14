import { useState, type FormEvent } from 'react';

import { WrongPasswordError } from '@/lib/vault/vault';

const MIN_LENGTH = 12;

interface Props {
  onChange: (current: string, next: string) => Promise<void>;
}

export function ChangePasswordSection({ onChange }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current && !tooShort && confirm === next && !busy;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await onChange(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'Current master password is incorrect.'
          : 'Could not change the master password.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="section" onSubmit={submit}>
      <h2>Change master password</h2>
      <label className="field">
        <span>Current master password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </label>
      <label className="field">
        <span>New master password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <small className={next && tooShort ? 'error' : 'muted'}>
          At least {MIN_LENGTH} characters.
        </small>
      </label>
      <label className="field">
        <span>Confirm new master password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {mismatch && <small className="error">Passwords do not match.</small>}
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="success" role="status">
          Master password changed. Backups made earlier still open with the old
          master password, so download a new backup.
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary" disabled={!canSubmit}>
          {busy ? 'Changing…' : 'Change master password'}
        </button>
      </div>
    </form>
  );
}
