import type {
  EncryptedBlob,
  EncryptedEntry,
  KdfParams,
  VaultFile,
} from './types';

/** Thrown when imported data is not a valid KeyNest vault file. */
export class InvalidVaultFileError extends Error {
  constructor(reason: string) {
    super(`Invalid vault file: ${reason}`);
    this.name = 'InvalidVaultFileError';
  }
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(obj: Json, field: string): string {
  const value = obj[field];
  if (typeof value !== 'string')
    throw new InvalidVaultFileError(`${field} must be a string`);
  return value;
}

function int(obj: Json, field: string): number {
  const value = obj[field];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new InvalidVaultFileError(`${field} must be a positive integer`);
  }
  return value;
}

function obj(parent: Json, field: string): Json {
  const value = parent[field];
  if (!isObject(value))
    throw new InvalidVaultFileError(`${field} must be an object`);
  return value;
}

function blob(value: Json): EncryptedBlob {
  return { iv: str(value, 'iv'), data: str(value, 'data') };
}

function kdf(value: Json): KdfParams {
  if (value.algorithm !== 'argon2id') {
    throw new InvalidVaultFileError('unsupported KDF algorithm');
  }
  return {
    algorithm: 'argon2id',
    salt: str(value, 'salt'),
    memoryKiB: int(value, 'memoryKiB'),
    iterations: int(value, 'iterations'),
    parallelism: int(value, 'parallelism'),
  };
}

function entry(value: unknown): EncryptedEntry {
  if (!isObject(value))
    throw new InvalidVaultFileError('entry must be an object');
  return {
    id: str(value, 'id'),
    revision: int(value, 'revision'),
    updatedAt: str(value, 'updatedAt'),
    ...blob(value),
  };
}

/** Validates untrusted data (an imported file, storage contents) as a vault file. */
export function parseVaultFile(data: unknown): VaultFile {
  if (!isObject(data)) throw new InvalidVaultFileError('not an object');
  if (data.format !== 'keynest-vault')
    throw new InvalidVaultFileError('not a KeyNest vault');
  if (data.version !== 1)
    throw new InvalidVaultFileError('unsupported version');
  if (!Array.isArray(data.entries))
    throw new InvalidVaultFileError('entries must be an array');

  const entries = data.entries.map(entry);
  if (new Set(entries.map((e) => e.id)).size !== entries.length) {
    throw new InvalidVaultFileError('duplicate entry ids');
  }

  return {
    format: 'keynest-vault',
    version: 1,
    kdf: kdf(obj(data, 'kdf')),
    wrappedKey: blob(obj(data, 'wrappedKey')),
    entries,
    createdAt: str(data, 'createdAt'),
    updatedAt: str(data, 'updatedAt'),
  };
}
