import { fromBase64, randomBytes, toBase64, utf8 } from '../encoding';
import type { EncryptedBlob } from './types';

const IV_BYTES = 12;

/** Thrown when decryption fails: wrong key, or data that was modified. */
export class DecryptionError extends Error {
  constructor() {
    super('Decryption failed');
    this.name = 'DecryptionError';
  }
}

/** Generates a new random AES-256-GCM vault key. */
export function generateVaultKey(): Promise<CryptoKey> {
  // Extractable so it can be wrapped by the KEK and, in the extension, kept in
  // session storage across service-worker restarts (Project.md section 5.4).
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptText(
  key: CryptoKey,
  plaintext: string,
  additionalData: string,
): Promise<EncryptedBlob> {
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8.encode(additionalData) },
    key,
    utf8.encode(plaintext),
  );
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)) };
}

export async function decryptText(
  key: CryptoKey,
  blob: EncryptedBlob,
  additionalData: string,
): Promise<string> {
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(blob.iv),
        additionalData: utf8.encode(additionalData),
      },
      key,
      fromBase64(blob.data),
    );
    return utf8.decode(plaintext);
  } catch {
    throw new DecryptionError();
  }
}

export async function wrapVaultKey(
  vaultKey: CryptoKey,
  kek: CryptoKey,
  additionalData: string,
): Promise<EncryptedBlob> {
  const iv = randomBytes(IV_BYTES);
  const wrapped = await crypto.subtle.wrapKey('raw', vaultKey, kek, {
    name: 'AES-GCM',
    iv,
    additionalData: utf8.encode(additionalData),
  });
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(wrapped)) };
}

export async function unwrapVaultKey(
  blob: EncryptedBlob,
  kek: CryptoKey,
  additionalData: string,
): Promise<CryptoKey> {
  try {
    return await crypto.subtle.unwrapKey(
      'raw',
      fromBase64(blob.data),
      kek,
      {
        name: 'AES-GCM',
        iv: fromBase64(blob.iv),
        additionalData: utf8.encode(additionalData),
      },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
  } catch {
    throw new DecryptionError();
  }
}
