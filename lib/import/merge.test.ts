import { describe, expect, it } from 'vitest';

import type { Credential } from '../vault/types';
import { newCredential } from '../vault/vault';
import { planMerge } from './merge';

const make = (overrides: Partial<Credential> = {}): Credential => ({
  ...newCredential({
    title: 'GitHub',
    username: 'octocat',
    password: 'pass-1',
    urls: ['https://github.com'],
  }),
  ...overrides,
});

describe('planMerge', () => {
  it('adds new credentials', () => {
    const incoming = [make()];
    expect(planMerge([], incoming)).toEqual({ toSave: incoming, skipped: 0 });
  });

  it('skips exact duplicates (same site, username and password)', () => {
    const existing = [make()];
    const plan = planMerge(existing, [make()]);
    expect(plan).toEqual({ toSave: [], skipped: 1 });
  });

  it('skips duplicates within the imported file itself', () => {
    expect(planMerge([], [make(), make()]).toSave).toHaveLength(1);
  });

  it('adds a different password for the same site and username', () => {
    const plan = planMerge([make()], [make({ password: 'pass-2' })]);
    expect(plan.toSave).toHaveLength(1);
  });

  it('for the same id, keeps whichever version is newer', () => {
    const current = make({ updatedAt: '2026-02-01T00:00:00.000Z' });
    const older = {
      ...current,
      password: 'old',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const newer = {
      ...current,
      password: 'new',
      updatedAt: '2026-03-01T00:00:00.000Z',
    };

    expect(planMerge([current], [older])).toEqual({ toSave: [], skipped: 1 });
    expect(planMerge([current], [newer])).toEqual({
      toSave: [newer],
      skipped: 0,
    });
  });
});
