import { useState } from 'react';

import { displayHost } from '@/lib/url';
import type { Credential } from '@/lib/vault/types';

interface Props {
  credentials: Credential[];
  onAdd: () => void;
  onOpen: (credential: Credential) => void;
  onCopy: (label: string, value: string) => void;
}

function matches(credential: Credential, query: string) {
  const q = query.toLowerCase();
  return (
    credential.title.toLowerCase().includes(q) ||
    credential.username.toLowerCase().includes(q) ||
    credential.urls.some((url) => url.toLowerCase().includes(q))
  );
}

function sortForDisplay(a: Credential, b: Credential) {
  if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function VaultList({ credentials, onAdd, onOpen, onCopy }: Props) {
  const [query, setQuery] = useState('');
  const visible = credentials
    .filter((c) => matches(c, query.trim()))
    .sort(sortForDisplay);

  return (
    <div className="screen">
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search passwords"
          aria-label="Search passwords"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="primary" onClick={onAdd}>
          Add
        </button>
      </div>

      {credentials.length === 0 ? (
        <div className="empty">
          <p>No passwords saved yet.</p>
          <p className="muted">Click “Add” to save your first one.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="empty muted">No matches for “{query}”.</p>
      ) : (
        <ul className="list">
          {visible.map((c) => (
            <li key={c.id} className="row">
              <button
                type="button"
                className="row__main"
                onClick={() => onOpen(c)}
              >
                <span className="avatar" aria-hidden>
                  {(c.title || '?').charAt(0).toUpperCase()}
                </span>
                <span className="row__text">
                  <span className="row__title">
                    {c.favorite && (
                      <span className="star" aria-label="Favorite">
                        ★{' '}
                      </span>
                    )}
                    {c.title}
                  </span>
                  <span className="row__sub muted">
                    {c.username ||
                      (c.urls[0] ? displayHost(c.urls[0]) : 'No username')}
                  </span>
                </span>
              </button>
              <div className="row__actions">
                {c.username && (
                  <button
                    type="button"
                    className="small"
                    onClick={() => onCopy('Username', c.username)}
                    aria-label={`Copy username for ${c.title}`}
                  >
                    User
                  </button>
                )}
                <button
                  type="button"
                  className="small"
                  onClick={() => onCopy('Password', c.password)}
                  aria-label={`Copy password for ${c.title}`}
                >
                  Pass
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
