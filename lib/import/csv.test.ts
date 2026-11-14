import { describe, expect, it } from 'vitest';

import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quotes, escaped quotes, commas and newlines in fields', () => {
    const text = 'name,note\n"Acme, Inc.","said ""hi""\nsecond line"\n';
    expect(parseCsv(text)).toEqual([
      ['name', 'note'],
      ['Acme, Inc.', 'said "hi"\nsecond line'],
    ]);
  });

  it('handles CRLF line endings (Windows), a BOM and no trailing newline', () => {
    expect(parseCsv('﻿a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps empty fields and drops blank lines', () => {
    expect(parseCsv('a,b,c\n\n1,,3\n\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });
});
