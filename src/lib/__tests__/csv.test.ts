import { describe, it, expect } from 'vitest'
import { escapeCsvCell, toCsv } from '@/lib/csv'

describe('escapeCsvCell', () => {
  it('returns empty string for null/undefined', () => {
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell(undefined)).toBe('')
  })

  it('quotes values containing commas', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
  })

  it('quotes values containing double quotes and escapes them', () => {
    expect(escapeCsvCell('he said "hi"')).toBe('"he said ""hi"""')
  })

  it('quotes values containing newlines', () => {
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('quotes values containing carriage returns', () => {
    expect(escapeCsvCell('a\rb')).toBe('"a\rb"')
  })

  it('neutralizes formula injection prefixes', () => {
    expect(escapeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(escapeCsvCell('+1+1')).toBe("'+1+1")
    expect(escapeCsvCell('-2^3')).toBe("'-2^3")
    expect(escapeCsvCell('@A1')).toBe("'@A1")
  })

  it('leaves safe values untouched', () => {
    expect(escapeCsvCell('hello')).toBe('hello')
    expect(escapeCsvCell(123)).toBe('123')
    expect(escapeCsvCell('100%')).toBe('100%')
  })
})

describe('toCsv', () => {
  it('prefixes output with a UTF-8 BOM', () => {
    const csv = toCsv(['A'], [['b']])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('joins rows with CRLF and escapes cells', () => {
    const csv = toCsv(['Name', 'Note'], [['Alice', 'ok'], ['Bob', 'a,b']])
    const body = csv.slice(1) // drop BOM
    expect(body).toBe('Name,Note\r\nAlice,ok\r\nBob,"a,b"')
  })

  it('returns header only when there are no rows', () => {
    const csv = toCsv(['A', 'B'], [])
    expect(csv).toBe('﻿A,B')
  })
})
