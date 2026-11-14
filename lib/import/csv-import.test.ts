import { describe, expect, it } from 'vitest';

import { credentialsFromCsv, CsvFormatError } from './csv-import';

const CHROME = `name,url,username,password,note
github.com,https://github.com/login,octocat,gh-pass-1,
Example,https://www.example.com/,me@example.com,ex-pass-2,work account
`;

const FIREFOX = `"url","username","password","httpRealm","formActionOrigin","guid","timeCreated","timeLastUsed","timePasswordChanged"
"https://accounts.google.com","me@gmail.com","g-pass","","https://accounts.google.com","{a1}","1700000000000","1700000000000","1700000000000"
`;

const BITWARDEN = `folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp
,1,login,GitLab,,,0,https://gitlab.com,dev,gl-pass,
,,note,My secret note,some text,,0,,,,
`;

const LASTPASS = `url,username,password,totp,extra,name,grouping,fav
https://twitter.com,bird,tw-pass,,,Twitter,Social,0
`;

describe('credentialsFromCsv', () => {
  it('imports a Chrome export', () => {
    const { credentials, skippedRows } = credentialsFromCsv(CHROME);
    expect(skippedRows).toBe(0);
    expect(credentials).toHaveLength(2);
    expect(credentials[0]).toMatchObject({
      title: 'github.com',
      username: 'octocat',
      password: 'gh-pass-1',
      urls: ['https://github.com'],
    });
    expect(credentials[1]?.notes).toBe('work account');
  });

  it('imports a Firefox export, naming entries after the site', () => {
    const [credential] = credentialsFromCsv(FIREFOX).credentials;
    expect(credential).toMatchObject({
      title: 'accounts.google.com',
      username: 'me@gmail.com',
      password: 'g-pass',
      urls: ['https://accounts.google.com'],
    });
  });

  it('imports Bitwarden logins with favorites and skips secure notes', () => {
    const { credentials, skippedRows } = credentialsFromCsv(BITWARDEN);
    expect(skippedRows).toBe(1);
    expect(credentials).toHaveLength(1);
    expect(credentials[0]).toMatchObject({
      title: 'GitLab',
      username: 'dev',
      password: 'gl-pass',
      favorite: true,
    });
  });

  it('imports a LastPass export', () => {
    const [credential] = credentialsFromCsv(LASTPASS).credentials;
    expect(credential).toMatchObject({
      title: 'Twitter',
      username: 'bird',
      password: 'tw-pass',
      favorite: false,
    });
  });

  it('gives every imported credential a unique id', () => {
    const { credentials } = credentialsFromCsv(CHROME);
    expect(new Set(credentials.map((c) => c.id)).size).toBe(2);
  });

  it('keeps passwords exactly, including surrounding spaces', () => {
    const csv = 'url,username,password\nhttps://a.com,me," p@ss "\n';
    expect(credentialsFromCsv(csv).credentials[0]?.password).toBe(' p@ss ');
  });

  it('skips rows without a password', () => {
    const csv = 'url,username,password\nhttps://a.com,me,\n';
    expect(credentialsFromCsv(csv)).toMatchObject({
      credentials: [],
      skippedRows: 1,
    });
  });

  it('rejects files that are not password exports', () => {
    expect(() => credentialsFromCsv('')).toThrow(CsvFormatError);
    expect(() => credentialsFromCsv('date,amount\n2024-01-01,5\n')).toThrow(
      CsvFormatError,
    );
  });
});
