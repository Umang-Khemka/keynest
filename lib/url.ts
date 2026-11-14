/**
 * Turns user input like "github.com/login" into an origin like
 * "https://github.com". Returns null if the input is not a usable website.
 * Credentials are matched by origin during autofill (Phase 2).
 */
export function normalizeWebsite(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost')
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** "https://www.github.com" -> "github.com" */
export function displayHost(origin: string): string {
  try {
    return new URL(origin).hostname.replace(/^www\./, '');
  } catch {
    return origin;
  }
}
