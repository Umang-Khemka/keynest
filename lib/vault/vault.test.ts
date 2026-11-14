import { describe, expect, it } from 'vitest';

import { DecryptionError } from './cipher';
import { MIN_KDF_COST } from './kdf';
import { InvalidVaultFileError, parseVaultFile } from './parse';
import {
  changeMasterPassword,
  createVault,
  deleteCredential,
  newCredential,
  putCredential,
  readCredentials,
  unlockVault,
  WrongPasswordError,
  type UnlockedVault,
} from './vault';

// The lowest cost the vault accepts, to keep tests fast.
const COST = MIN_KDF_COST;
const MASTER = 'correct horse battery staple';

const github = () =>
  newCredential({
    title: 'GitHub',
    username: 'octocat',
    password: 'SuperSecret-123!',
    urls: ['https://github.com'],
  });

async function vaultWith(...credentials: ReturnType<typeof github>[]) {
  const unlocked = await createVault(MASTER, COST);
  let file = unlocked.file;
  for (const c of credentials)
    file = await putCredential({ ...unlocked, file }, c);
  return { ...unlocked, file } satisfies UnlockedVault;
}

describe('create and unlock', () => {
  it('unlocks with the correct master password', async () => {
    const { file } = await createVault(MASTER, COST);
    await expect(unlockVault(file, MASTER)).resolves.toBeDefined();
  });

  it('rejects an incorrect master password', async () => {
    const { file } = await createVault(MASTER, COST);
    await expect(unlockVault(file, 'wrong password')).rejects.toBeInstanceOf(
      WrongPasswordError,
    );
  });

  it('rejects an empty master password', async () => {
    await expect(createVault('', COST)).rejects.toThrow();
  });

  it('treats composed and decomposed Unicode passwords as equal', async () => {
    const composed = 'café-pass'; // é as one code point (Windows/Linux)
    const decomposed = 'café-pass'; // e + accent (macOS input)
    const { file } = await createVault(composed, COST);
    await expect(unlockVault(file, decomposed)).resolves.toBeDefined();
  });

  it('refuses vault files with weakened KDF parameters', async () => {
    const { file } = await createVault(MASTER, COST);
    const weakened = { ...file, kdf: { ...file.kdf, memoryKiB: 1024 } };
    await expect(unlockVault(weakened, MASTER)).rejects.toThrow(/minimum/);
  });
});

describe('credentials', () => {
  it('stores and retrieves credentials after re-unlocking', async () => {
    const credential = github();
    const { file } = await vaultWith(credential);

    const key = await unlockVault(file, MASTER);
    const [stored] = await readCredentials({ file, key });

    expect(stored).toMatchObject({
      id: credential.id,
      title: 'GitHub',
      username: 'octocat',
      password: 'SuperSecret-123!',
      urls: ['https://github.com'],
    });
  });

  it('never stores credential fields in plaintext', async () => {
    const { file } = await vaultWith(github());
    const serialized = JSON.stringify(file);
    for (const secret of [
      'SuperSecret-123!',
      'octocat',
      'GitHub',
      'github.com',
      MASTER,
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('uses a unique IV for every encryption', async () => {
    const { file } = await vaultWith(github(), github(), github());
    const ivs = [file.wrappedKey.iv, ...file.entries.map((e) => e.iv)];
    expect(new Set(ivs).size).toBe(ivs.length);
  });

  it('updates a credential, bumping its revision and keeping createdAt', async () => {
    const credential = github();
    const vault = await vaultWith(credential);
    const [before] = await readCredentials(vault);

    const file = await putCredential(vault, {
      ...credential,
      password: 'NewPass-456!',
    });
    const [after] = await readCredentials({ ...vault, file });

    expect(file.entries).toHaveLength(1);
    expect(file.entries[0]?.revision).toBe(2);
    expect(after?.password).toBe('NewPass-456!');
    expect(after?.createdAt).toBe(before?.createdAt);
  });

  it('deletes a credential', async () => {
    const a = github();
    const b = github();
    const vault = await vaultWith(a, b);
    const file = deleteCredential(vault.file, a.id);
    const remaining = await readCredentials({ ...vault, file });
    expect(remaining.map((c) => c.id)).toEqual([b.id]);
  });
});

describe('tamper resistance', () => {
  it('detects a modified entry revision', async () => {
    const vault = await vaultWith(github());
    const [entry] = vault.file.entries;
    if (!entry) throw new Error('missing entry');
    const file = { ...vault.file, entries: [{ ...entry, revision: 99 }] };
    await expect(readCredentials({ ...vault, file })).rejects.toBeInstanceOf(
      DecryptionError,
    );
  });

  it('detects ciphertext swapped between entries', async () => {
    const vault = await vaultWith(github(), github());
    const [a, b] = vault.file.entries;
    if (!a || !b) throw new Error('missing entries');
    const file = {
      ...vault.file,
      entries: [{ ...a, iv: b.iv, data: b.data }, b],
    };
    await expect(readCredentials({ ...vault, file })).rejects.toBeInstanceOf(
      DecryptionError,
    );
  });
});

describe('change master password', () => {
  it('re-wraps the key: new password works, old fails, data intact', async () => {
    const vault = await vaultWith(github());
    const file = await changeMasterPassword(
      vault,
      'a new master password',
      COST,
    );

    await expect(unlockVault(file, MASTER)).rejects.toBeInstanceOf(
      WrongPasswordError,
    );
    const key = await unlockVault(file, 'a new master password');
    const [stored] = await readCredentials({ file, key });
    expect(stored?.password).toBe('SuperSecret-123!');
    // Entries were not re-encrypted.
    expect(file.entries).toEqual(vault.file.entries);
  });
});

describe('export and import', () => {
  it('round-trips through JSON and unlocks', async () => {
    const { file } = await vaultWith(github());
    const imported = parseVaultFile(JSON.parse(JSON.stringify(file)));

    const key = await unlockVault(imported, MASTER);
    const [stored] = await readCredentials({ file: imported, key });
    expect(stored?.title).toBe('GitHub');
  });

  it.each([
    ['null', null],
    ['wrong format', { format: 'other' }],
    ['future version', { format: 'keynest-vault', version: 2 }],
  ])('rejects invalid files (%s)', (_name, data) => {
    expect(() => parseVaultFile(data)).toThrow(InvalidVaultFileError);
  });

  it('rejects files with duplicate entry ids', async () => {
    const { file } = await vaultWith(github());
    const [entry] = file.entries;
    const broken = { ...file, entries: [entry, entry] };
    expect(() => parseVaultFile(broken)).toThrow(/duplicate/);
  });
});
