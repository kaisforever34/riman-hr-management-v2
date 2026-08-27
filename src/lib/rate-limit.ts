const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

const attempts = new Map<string, number[]>()

function prune(key: string, now: number): number[] {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length === 0) attempts.delete(key)
  else attempts.set(key, recent)
  return recent
}

export function checkRateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now()
  if (attempts.size > 1000) {
    for (const k of [...attempts.keys()]) prune(k, now)
  }
  const recent = prune(key, now)
  if (recent.length >= MAX_ATTEMPTS) {
    const oldest = recent[0]
    return { ok: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) }
  }
  return { ok: true }
}

export function recordFailedAttempt(key: string) {
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  attempts.set(key, recent)
}

export function resetRateLimit(key: string) {
  attempts.delete(key)
}

export function resetRateLimits() {
  attempts.clear()
}
