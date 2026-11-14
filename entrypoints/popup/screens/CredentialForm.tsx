import { useState, type FormEvent } from 'react';

import { displayHost, normalizeWebsite } from '@/lib/url';
import type { Credential } from '@/lib/vault/types';
import { newCredential } from '@/lib/vault/vault';

import { GeneratorPanel } from '../components/GeneratorPanel';

interface Props {
  /** The credential being edited, or undefined when adding a new one. */
  initial?: Credential;
  onSave: (credential: Credential) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCancel: () => void;
  onCopy: (label: string, value: string) => void;
}

export function CredentialForm({
  initial,
  onSave,
  onDelete,
  onCancel,
  onCopy,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [website, setWebsite] = useState(initial?.urls[0] ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(!initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const origin = website.trim() ? normalizeWebsite(website) : null;
    if (website.trim() && !origin) {
      setError('Enter a valid website, for example github.com');
      return;
    }
    const finalTitle = title.trim() || (origin ? displayHost(origin) : '');
    if (!finalTitle) {
      setError('Enter a name or a website.');
      return;
    }
    if (!password) {
      setError('Enter or generate a password.');
      return;
    }

    const fields = {
      title: finalTitle,
      username: username.trim(),
      password,
      urls: origin ? [origin] : [],
      notes,
      favorite,
    };
    setBusy(true);
    try {
      await onSave(initial ? { ...initial, ...fields } : newCredential(fields));
    } catch {
      setError('Could not save. Please try again.');
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    setBusy(true);
    try {
      await onDelete(initial.id);
    } catch {
      setError('Could not delete. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form className="screen" onSubmit={submit}>
      <div className="toolbar">
        <button type="button" onClick={onCancel}>
          ← Back
        </button>
        <h2 className="toolbar__title">
          {initial ? 'Edit password' : 'New password'}
        </h2>
        <label className="check" title="Favorite">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
          />
          ★
        </label>
      </div>

      <label className="field">
        <span>Website</span>
        <input
          type="text"
          inputMode="url"
          placeholder="github.com"
          autoFocus={!initial}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </label>

      <label className="field">
        <span>Name</span>
        <input
          type="text"
          placeholder="Defaults to the website name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="field">
        <span>Username or email</span>
        <input
          type="text"
          autoComplete="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>

      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="input-group">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            disabled={!password}
            onClick={() => onCopy('Password', password)}
          >
            Copy
          </button>
        </div>
        <button
          type="button"
          className="link"
          onClick={() => setShowGenerator(!showGenerator)}
        >
          {showGenerator ? 'Hide generator' : 'Generate a strong password'}
        </button>
        {showGenerator && (
          <GeneratorPanel
            onUse={(generated) => {
              setPassword(generated);
              setShowGenerator(false);
            }}
          />
        )}
      </div>

      <label className="field">
        <span>Notes</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="actions">
        {initial &&
          (confirmDelete ? (
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={remove}
            >
              Really delete?
            </button>
          ) : (
            <button
              type="button"
              className="danger-outline"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          ))}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>

      {initial && (
        <p className="muted small-text">
          Last changed {new Date(initial.updatedAt).toLocaleString()}
        </p>
      )}
    </form>
  );
}
