import { useVault } from '@/hooks/useVault';

import { Unlock } from '../popup/screens/Unlock';
import { ChangePasswordSection } from './sections/ChangePasswordSection';
import { ExportSection } from './sections/ExportSection';
import { ImportSection } from './sections/ImportSection';
import { RestoreSection } from './sections/RestoreSection';

function App() {
  const vault = useVault();
  const { state } = vault;

  return (
    <main className="page">
      <header className="header">
        <img src="/icon/48.png" alt="" width={24} height={24} />
        <h1>KeyNest — Backup & settings</h1>
        {state.status === 'unlocked' && (
          <div className="header__actions">
            <button type="button" onClick={vault.lock}>
              Lock
            </button>
          </div>
        )}
      </header>

      {state.status === 'loading' && <p className="muted">Loading…</p>}

      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'setup' && <RestoreSection onRestore={vault.restore} />}

      {state.status === 'locked' && (
        <div className="section">
          <Unlock onUnlock={vault.unlock} />
        </div>
      )}

      {state.status === 'unlocked' && (
        <>
          <ExportSection file={state.file} count={state.credentials.length} />
          <ImportSection
            existing={state.credentials}
            onImport={vault.saveMany}
          />
          <ChangePasswordSection onChange={vault.changePassword} />
        </>
      )}
    </main>
  );
}

export default App;
