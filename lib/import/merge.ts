import type { Credential } from '../vault/types';

export interface MergePlan {
  /** New credentials, or newer versions of existing ones (same id). */
  toSave: Credential[];
  /** Exact duplicates, or older versions of existing credentials. */
  skipped: number;
}

const fingerprint = (c: Credential) =>
  JSON.stringify([c.urls[0] ?? '', c.username, c.password]);

/**
 * Decides which incoming credentials to save into an existing vault.
 * - Same id (restoring a backup of this vault): keep whichever was updated later.
 * - Same website + username + password as an existing entry: skip as duplicate.
 * - Otherwise: add.
 */
export function planMerge(
  existing: Credential[],
  incoming: Credential[],
): MergePlan {
  const byId = new Map(existing.map((c) => [c.id, c]));
  const seen = new Set(existing.map(fingerprint));
  const toSave: Credential[] = [];
  let skipped = 0;

  for (const credential of incoming) {
    const current = byId.get(credential.id);
    if (current) {
      if (credential.updatedAt > current.updatedAt) toSave.push(credential);
      else skipped++;
      continue;
    }
    const key = fingerprint(credential);
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    toSave.push(credential);
  }

  return { toSave, skipped };
}
