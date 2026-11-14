/** A decrypted credential. Only ever exists in memory while the vault is unlocked. */
export interface Credential {
  id: string;
  title: string;
  username: string;
  password: string;
  /** Website origins this credential belongs to, e.g. "https://github.com". */
  urls: string[];
  notes: string;
  favorite: boolean;
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;
}

export interface KdfParams {
  algorithm: 'argon2id';
  /** Base64, 16 random bytes. */
  salt: string;
  memoryKiB: number;
  iterations: number;
  parallelism: number;
}

/** AES-256-GCM ciphertext. */
export interface EncryptedBlob {
  /** Base64, 12 random bytes, unique per encryption. */
  iv: string;
  /** Base64 ciphertext including the GCM tag. */
  data: string;
}

/**
 * One stored credential. id, revision and updatedAt stay readable so that
 * bring-your-own sync can merge vault files entry by entry without the key.
 * They are bound to the ciphertext as additional data, so they cannot be
 * altered or swapped between entries without decryption failing.
 */
export interface EncryptedEntry extends EncryptedBlob {
  id: string;
  revision: number;
  updatedAt: string;
}

/** The portable vault document shared by the extension and the desktop app. */
export interface VaultFile {
  format: 'keynest-vault';
  version: 1;
  kdf: KdfParams;
  /** The random vault key, encrypted with the key derived from the master password. */
  wrappedKey: EncryptedBlob;
  entries: EncryptedEntry[];
  createdAt: string;
  updatedAt: string;
}
