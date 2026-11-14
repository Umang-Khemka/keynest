/** Base64 helpers that work the same in browsers, extension workers and Node. */

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const utf8 = {
  encode: (value: string): Uint8Array<ArrayBuffer> =>
    new Uint8Array(encoder.encode(value)),
  decode: (bytes: BufferSource): string => decoder.decode(bytes),
};
