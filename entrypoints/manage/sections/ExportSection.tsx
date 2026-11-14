import type { VaultFile } from '@/lib/vault/types';

import { downloadFile } from '../files';

interface Props {
  file: VaultFile;
  count: number;
}

export function ExportSection({ file, count }: Props) {
  function exportBackup() {
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(
      `keynest-backup-${date}.keynest`,
      JSON.stringify(file, null, 2),
      'application/json',
    );
  }

  return (
    <section className="section">
      <h2>Backup</h2>
      <p className="muted">
        Download an encrypted copy of your vault ({count}{' '}
        {count === 1 ? 'password' : 'passwords'}). It is protected by your
        current master password, so keep both safe. Use it to restore KeyNest in
        another browser or on another computer.
      </p>
      <div className="actions">
        <button type="button" className="primary" onClick={exportBackup}>
          Download encrypted backup
        </button>
      </div>
    </section>
  );
}
