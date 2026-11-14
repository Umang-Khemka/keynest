import { useEffect, useState } from 'react';

import { useVault } from '@/hooks/useVault';
import type { Credential } from '@/lib/vault/types';
import { openManagePage } from '@/services/navigation';
import { AUTO_LOCK_MINUTES } from '@/services/vault-store';

import { CLIPBOARD_CLEAR_SECONDS, copySecret } from './clipboard';
import { CredentialForm } from './screens/CredentialForm';
import { Setup } from './screens/Setup';
import { Unlock } from './screens/Unlock';
import { VaultList } from './screens/VaultList';

type View = { screen: 'list' } | { screen: 'edit'; credential?: Credential };

function App() {
  const vault = useVault();
  const { state } = vault;
  const [view, setView] = useState<View>({ screen: 'list' });
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  async function copy(label: string, value: string) {
    try {
      await copySecret(value);
      setNotice(`${label} copied. Clears in ${CLIPBOARD_CLEAR_SECONDS}s.`);
    } catch {
      setNotice('Could not copy to the clipboard.');
    }
  }

  async function lock() {
    setView({ screen: 'list' });
    await vault.lock();
  }

  return (
    <main className="popup">
      <header className="header">
        <img src="/icon/48.png" alt="" width={22} height={22} />
        <h1>KeyNest</h1>
        {state.status === 'unlocked' && (
          <div className="header__actions">
            <button
              type="button"
              onClick={openManagePage}
              title="Backup, import and master password"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={lock}
              title={`Locks automatically after ${AUTO_LOCK_MINUTES} minutes without use`}
            >
              Lock
            </button>
          </div>
        )}
      </header>

      {state.status === 'loading' && <p className="screen muted">Loading…</p>}

      {state.status === 'error' && (
        <p className="screen error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'setup' && <Setup onCreate={vault.create} />}

      {state.status === 'locked' && <Unlock onUnlock={vault.unlock} />}

      {state.status === 'unlocked' &&
        (view.screen === 'list' ? (
          <VaultList
            credentials={state.credentials}
            onAdd={() => setView({ screen: 'edit' })}
            onOpen={(credential) => setView({ screen: 'edit', credential })}
            onCopy={copy}
          />
        ) : (
          <CredentialForm
            key={view.credential?.id ?? 'new'}
            initial={view.credential}
            onSave={async (credential) => {
              await vault.save(credential);
              setView({ screen: 'list' });
              setNotice('Saved.');
            }}
            onDelete={async (id) => {
              await vault.remove(id);
              setView({ screen: 'list' });
              setNotice('Deleted.');
            }}
            onCancel={() => setView({ screen: 'list' })}
            onCopy={copy}
          />
        ))}

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </main>
  );
}

export default App;
