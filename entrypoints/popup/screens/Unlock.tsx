import { useState, type FormEvent } from 'react';

import { WrongPasswordError } from '@/lib/vault/vault';

interface Props {
  onUnlock: (masterPassword: string) => Promise<void>;
}

export function Unlock({ onUnlock }: Props) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onUnlock(password);
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'Incorrect master password.'
          : 'Could not unlock the vault.',
      );
      setPassword('');
      setBusy(false);
    }
  }

  return (
    <form className="screen" onSubmit={submit}>
      <h2>Vault locked</h2>
      <label className="field">
        <span>Master password</span>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="primary" disabled={!password || busy}>
        {busy ? 'Unlocking…' : 'Unlock'}
      </button>
    </form>
  );
}
