import { InvalidVaultFileError, parseVaultFile } from '@/lib/vault/parse';
import type { VaultFile } from '@/lib/vault/types';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('This file is too large (over 10 MB).');
  }
  return file.text();
}

/** Parses a KeyNest backup, with a readable error message on failure. */
export function parseBackup(text: string): VaultFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This is not a KeyNest backup file.');
  }
  try {
    return parseVaultFile(data);
  } catch (error) {
    if (error instanceof InvalidVaultFileError) {
      throw new Error('This is not a valid KeyNest backup file.');
    }
    throw error;
  }
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
