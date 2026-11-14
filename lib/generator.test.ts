import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GENERATOR_OPTIONS,
  generatePassword,
  MAX_LENGTH,
  MIN_LENGTH,
} from './generator';

describe('generatePassword', () => {
  it('produces the requested length', () => {
    for (const length of [MIN_LENGTH, 20, 64, MAX_LENGTH]) {
      expect(
        generatePassword({ ...DEFAULT_GENERATOR_OPTIONS, length }),
      ).toHaveLength(length);
    }
  });

  it('includes every selected character type', () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword({
        ...DEFAULT_GENERATOR_OPTIONS,
        length: 8,
      });
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it('uses only the selected character types', () => {
    const password = generatePassword({
      length: 64,
      uppercase: false,
      lowercase: false,
      digits: true,
      symbols: false,
      excludeAmbiguous: false,
    });
    expect(password).toMatch(/^[0-9]+$/);
  });

  it('can exclude ambiguous characters', () => {
    for (let i = 0; i < 20; i++) {
      const password = generatePassword({
        ...DEFAULT_GENERATOR_OPTIONS,
        length: MAX_LENGTH,
        excludeAmbiguous: true,
      });
      expect(password).not.toMatch(/[0O1lI|`'"]/);
    }
  });

  it('does not repeat passwords', () => {
    const passwords = new Set(
      Array.from({ length: 100 }, () =>
        generatePassword(DEFAULT_GENERATOR_OPTIONS),
      ),
    );
    expect(passwords.size).toBe(100);
  });

  it('rejects invalid options', () => {
    expect(() =>
      generatePassword({
        ...DEFAULT_GENERATOR_OPTIONS,
        length: MIN_LENGTH - 1,
      }),
    ).toThrow(RangeError);
    expect(() =>
      generatePassword({
        length: 20,
        uppercase: false,
        lowercase: false,
        digits: false,
        symbols: false,
        excludeAmbiguous: false,
      }),
    ).toThrow();
  });
});
