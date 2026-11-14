import { displayHost, normalizeWebsite } from '../url';
import type { Credential } from '../vault/types';
import { newCredential } from '../vault/vault';
import { parseCsv } from './csv';

/** Thrown when a CSV file does not look like a password export. */
export class CsvFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvFormatError';
  }
}

/**
 * Column names used by common password managers' CSV exports:
 * - Chrome / Edge / Brave: name, url, username, password, note
 * - Firefox: url, username, password, httpRealm, formActionOrigin, guid, ...
 * - Bitwarden: folder, favorite, type, name, notes, ..., login_uri, login_username, login_password, login_totp
 * - LastPass: url, username, password, totp, extra, name, grouping, fav
 */
const COLUMN_ALIASES = {
  title: ['name', 'title', 'account'],
  url: ['url', 'login_uri', 'website', 'uri', 'web site', 'login url'],
  username: [
    'username',
    'login_username',
    'user',
    'user name',
    'email',
    'login',
    'login name',
  ],
  password: ['password', 'login_password'],
  notes: ['note', 'notes', 'extra', 'comments'],
  favorite: ['favorite', 'fav'],
  type: ['type'],
} as const;

type Column = keyof typeof COLUMN_ALIASES;

export interface CsvImportResult {
  credentials: Credential[];
  /** Rows without a password, or non-login items (e.g. Bitwarden secure notes). */
  skippedRows: number;
}

function findColumns(header: string[]): Partial<Record<Column, number>> {
  const normalized = header.map((h) => h.trim().toLowerCase());
  const columns: Partial<Record<Column, number>> = {};
  for (const [column, aliases] of Object.entries(COLUMN_ALIASES)) {
    const index = normalized.findIndex((h) =>
      (aliases as readonly string[]).includes(h),
    );
    if (index !== -1) columns[column as Column] = index;
  }
  return columns;
}

/** Converts a password-manager CSV export into new credentials. */
export function credentialsFromCsv(text: string): CsvImportResult {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new CsvFormatError('The file is empty.');

  const columns = findColumns(header);
  if (columns.password === undefined) {
    throw new CsvFormatError(
      'No "password" column found. Is this a password export?',
    );
  }

  const cell = (row: string[], column: Column) => {
    const index = columns[column];
    return index === undefined ? '' : (row[index] ?? '').trim();
  };

  const credentials: Credential[] = [];
  let skippedRows = 0;

  for (const row of rows) {
    const type = cell(row, 'type').toLowerCase();
    const password = row[columns.password] ?? '';
    if ((type && type !== 'login') || !password) {
      skippedRows++;
      continue;
    }

    const origin = normalizeWebsite(cell(row, 'url'));
    const username = cell(row, 'username');
    const title =
      cell(row, 'title') ||
      (origin ? displayHost(origin) : '') ||
      username ||
      'Untitled';
    const favorite = ['1', 'true', 'yes'].includes(
      cell(row, 'favorite').toLowerCase(),
    );

    credentials.push(
      newCredential({
        title,
        username,
        password,
        urls: origin ? [origin] : [],
        notes: cell(row, 'notes'),
        favorite,
      }),
    );
  }

  return { credentials, skippedRows };
}
