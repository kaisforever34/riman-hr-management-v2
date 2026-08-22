export function escapeCsvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = `'${s}` // formula injection guard
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsvCell).join(','))
  return '\uFEFF' + lines.join('\r\n')
}

export function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function iso(value: Date | null | undefined): string {
  return value ? value.toISOString() : ''
}
