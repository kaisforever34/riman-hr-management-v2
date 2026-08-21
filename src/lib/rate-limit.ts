const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

const attempts = new Map<string, number[]>()

export function checkRateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_ATTEMPTS) {
    const oldest = recent[0]
    return { ok: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) }
  }
  recent.push(now)
  attempts.set(key, recent)
  return { ok: true }
}

export function resetRateLimits() {
  attempts.clear()
}
