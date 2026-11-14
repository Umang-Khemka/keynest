import { argon2id } from 'hash-wasm';

import { fromBase64, randomBytes, toBase64, utf8 } from '../encoding';
import type { KdfParams } from './types';

/**
 * Default Argon2id cost. Matches common password-manager defaults
 * (64 MiB, 3 passes, 4 lanes) and exceeds the OWASP minimum.
 */
export const DEFAULT_KDF_COST = {
  memoryKiB: 64 * 1024,
  iterations: 3,
  parallelism: 4,
} as const;

/** Lower bounds enforced when reading a vault file, so a tampered file cannot weaken the KDF. */
export const MIN_KDF_COST = {
  memoryKiB: 19 * 1024,
  iterations: 2,
  parallelism: 1,
} as const;

export type KdfCost = Pick<
  KdfParams,
  'memoryKiB' | 'iterations' | 'parallelism'
>;

export function newKdfParams(cost: KdfCost = DEFAULT_KDF_COST): KdfParams {
  return { algorithm: 'argon2id', salt: toBase64(randomBytes(16)), ...cost };
}

export function assertKdfStrength(params: KdfParams, minimum = MIN_KDF_COST) {
  if (
    params.algorithm !== 'argon2id' ||
    params.memoryKiB < minimum.memoryKiB ||
    params.iterations < minimum.iterations ||
    params.parallelism < minimum.parallelism
  ) {
    throw new Error('Vault KDF parameters are below the allowed minimum');
  }
}

/**
 * Master passwords are Unicode-normalized so the same password typed on
 * Windows, macOS (which may produce decomposed characters) and Linux derives
 * the same key.
 */
export function normalizePassword(password: string): string {
  return password.normalize('NFC');
}

/** Derives the key-encryption key (KEK) from the master password. Non-extractable. */
export async function deriveKek(
  masterPassword: string,
  params: KdfParams,
): Promise<CryptoKey> {
  const raw = await argon2id({
    password: utf8.encode(normalizePassword(masterPassword)),
    salt: fromBase64(params.salt),
    memorySize: params.memoryKiB,
    iterations: params.iterations,
    parallelism: params.parallelism,
    hashLength: 32,
    outputType: 'binary',
  });
  const keyBytes = new Uint8Array(raw);
  try {
    return await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [
      'wrapKey',
      'unwrapKey',
    ]);
  } finally {
    keyBytes.fill(0);
    raw.fill(0);
  }
}
