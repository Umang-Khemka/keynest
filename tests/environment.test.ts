import { describe, expect, it } from 'vitest';

// Phase 1 depends on Web Crypto. Make sure the test environment provides it
// on every OS in CI before any real crypto code is written.
describe('test environment', () => {
  it('provides Web Crypto with secure randomness', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    expect(bytes).toHaveLength(32);
    expect(crypto.subtle).toBeDefined();
  });

  it('supports AES-256-GCM round trips', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode('round trip');

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext,
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );

    expect(new TextDecoder().decode(decrypted)).toBe('round trip');
  });
});
