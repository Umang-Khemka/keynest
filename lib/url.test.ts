import { describe, expect, it } from 'vitest';

import { displayHost, normalizeWebsite } from './url';

describe('normalizeWebsite', () => {
  it.each([
    ['github.com', 'https://github.com'],
    ['  github.com/login?next=/  ', 'https://github.com'],
    ['https://accounts.google.com/signin', 'https://accounts.google.com'],
    ['http://localhost:3000/app', 'http://localhost:3000'],
    ['HTTPS://Example.COM', 'https://example.com'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeWebsite(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'not a website',
    'javascript:alert(1)',
    'ftp://example.com',
  ])('rejects %j', (input) => {
    expect(normalizeWebsite(input)).toBeNull();
  });
});

describe('displayHost', () => {
  it('strips the scheme and www', () => {
    expect(displayHost('https://www.github.com')).toBe('github.com');
  });
});
