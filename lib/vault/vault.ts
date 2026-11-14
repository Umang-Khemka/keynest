import {
  DecryptionError,
  decryptText,
  encryptText,
  generateVaultKey,
  unwrapVaultKey,
  wrapVaultKey,
} from './cipher';
import {
  assertKdfStrength,
  DEFAULT_KDF_COST,
  deriveKek,
  newKdfParams,
  type KdfCost,
} from './kdf';
import type { Credential, EncryptedEntry, VaultFile } from './types';

const WRAPPED_KEY_AAD = 'keynest-vault-key:v1';

function entryAad(
  entry: Pick<EncryptedEntry, 'id' | 'revision' | 'updatedAt'>,
) {
  return `keynest-entry:v1:${entry.id}:${entry.revision}:${entry.updatedAt}`;
}

/** Thrown by unlockVault when the master password is wrong. */
export class WrongPasswordError extends Error {
  constructor() {
    super('Incorrect master password');
    this.name = 'WrongPasswordError';
  }
}

export interface UnlockedVault {
  file: VaultFile;
  key: CryptoKey;
}

export async function createVault(
  masterPassword: string,
  cost: KdfCost = DEFAULT_KDF_COST,
): Promise<UnlockedVault> {
  if (masterPassword.length === 0) {
    throw new Error('Master password must not be empty');
  }
  const kdf = newKdfParams(cost);
  const kek = await deriveKek(masterPassword, kdf);
  const key = await generateVaultKey();
  const now = new Date().toISOString();
  const file: VaultFile = {
    format: 'keynest-vault',
    version: 1,
    kdf,
    wrappedKey: await wrapVaultKey(key, kek, WRAPPED_KEY_AAD),
    entries: [],
    createdAt: now,
    updatedAt: now,
  };
  return { file, key };
}

export async function unlockVault(
  file: VaultFile,
  masterPassword: string,
): Promise<CryptoKey> {
  assertKdfStrength(file.kdf);
  const kek = await deriveKek(masterPassword, file.kdf);
  try {
    return await unwrapVaultKey(file.wrappedKey, kek, WRAPPED_KEY_AAD);
  } catch (error) {
    if (error instanceof DecryptionError) throw new WrongPasswordError();
    throw error;
  }
}

/**
 * Re-wraps the existing vault key with a new master password. Credentials are
 * not re-encrypted (envelope encryption, Project.md section 5.2).
 */
export async function changeMasterPassword(
  unlocked: UnlockedVault,
  newMasterPassword: string,
  cost: KdfCost = DEFAULT_KDF_COST,
): Promise<VaultFile> {
  if (newMasterPassword.length === 0) {
    throw new Error('Master password must not be empty');
  }
  const kdf = newKdfParams(cost);
  const kek = await deriveKek(newMasterPassword, kdf);
  return {
    ...unlocked.file,
    kdf,
    wrappedKey: await wrapVaultKey(unlocked.key, kek, WRAPPED_KEY_AAD),
    updatedAt: new Date().toISOString(),
  };
}

export type NewCredentialInput = Pick<
  Credential,
  'title' | 'username' | 'password'
> &
  Partial<Pick<Credential, 'urls' | 'notes' | 'favorite'>>;

export function newCredential(input: NewCredentialInput): Credential {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    urls: [],
    notes: '',
    favorite: false,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
}

/** Adds a credential, or replaces the one with the same id. Returns a new vault file. */
export async function putCredential(
  { file, key }: UnlockedVault,
  credential: Credential,
): Promise<VaultFile> {
  const existing = file.entries.find((e) => e.id === credential.id);
  const updatedAt = new Date().toISOString();
  const meta = {
    id: credential.id,
    revision: existing ? existing.revision + 1 : 1,
    updatedAt,
  };
  // createdAt is set once by newCredential() and carried through edits.
  const stored: Credential = { ...credential, updatedAt };
  const blob = await encryptText(key, JSON.stringify(stored), entryAad(meta));
  const entry: EncryptedEntry = { ...meta, ...blob };
  return {
    ...file,
    entries: existing
      ? file.entries.map((e) => (e.id === credential.id ? entry : e))
      : [...file.entries, entry],
    updatedAt,
  };
}

// TODO(Phase 8): deletions need tombstones so sync merges don't resurrect them.
export function deleteCredential(file: VaultFile, id: string): VaultFile {
  return {
    ...file,
    entries: file.entries.filter((e) => e.id !== id),
    updatedAt: new Date().toISOString(),
  };
}

export async function readCredentials({
  file,
  key,
}: UnlockedVault): Promise<Credential[]> {
  return Promise.all(
    file.entries.map(async (entry) => {
      const json = await decryptText(key, entry, entryAad(entry));
      return JSON.parse(json) as Credential;
    }),
  );
}
