export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  /** Leave out look-alike characters such as 0/O and 1/l/I. */
  excludeAmbiguous: boolean;
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
};

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

const SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>/?~',
} as const;

const AMBIGUOUS = new Set('0O1lI|`\'"');

/** Uniform random integer in [0, max) using rejection sampling (no modulo bias). */
function randomInt(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0] as number;
    if (value < limit) return value % max;
  }
}

function pick(chars: string): string {
  return chars[randomInt(chars.length)] as string;
}

/**
 * Generates a password with cryptographically secure randomness. Every
 * selected character type appears at least once.
 */
export function generatePassword(options: GeneratorOptions): string {
  const { length, excludeAmbiguous } = options;
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new RangeError(
      `Length must be between ${MIN_LENGTH} and ${MAX_LENGTH}`,
    );
  }

  const sets = (Object.keys(SETS) as (keyof typeof SETS)[])
    .filter((name) => options[name])
    .map((name) =>
      [...SETS[name]]
        .filter((c) => !excludeAmbiguous || !AMBIGUOUS.has(c))
        .join(''),
    );
  if (sets.length === 0) {
    throw new Error('Select at least one character type');
  }

  const all = sets.join('');
  const chars = sets.map(pick);
  while (chars.length < length) chars.push(pick(all));

  // Fisher-Yates shuffle so the guaranteed characters are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j] as string, chars[i] as string];
  }
  return chars.join('');
}
