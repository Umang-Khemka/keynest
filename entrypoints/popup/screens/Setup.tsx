import { useState, type FormEvent } from 'react';

import { openManagePage } from '@/services/navigation';

const MIN_LENGTH = 12;

interface Props {
  onCreate: (masterPassword: string) => Promise<void>;
}

export function Setup({ onCreate }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !tooShort && confirm === password && !busy;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(password);
    } catch {
      setError('Could not create the vault. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form className="screen" onSubmit={submit}>
      <h2>Create your vault</h2>
      <p className="muted">
        Choose a master password. It unlocks all your other passwords.
      </p>

      <label className="field">
        <span>Master password</span>
        <input
          type="password"
          autoFocus
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <small className={password && tooShort ? 'error' : 'muted'}>
          At least {MIN_LENGTH} characters. A short sentence works well.
        </small>
      </label>

      <label className="field">
        <span>Confirm master password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {mismatch && <small className="error">Passwords do not match.</small>}
      </label>

      <p className="warning">
        KeyNest cannot recover a forgotten master password. If you forget it,
        your saved passwords are lost.
      </p>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="primary" disabled={!canSubmit}>
        {busy ? 'Creating vault…' : 'Create vault'}
      </button>

      <button type="button" className="link" onClick={openManagePage}>
        Have a KeyNest backup? Restore it instead
      </button>
    </form>
  );
}
