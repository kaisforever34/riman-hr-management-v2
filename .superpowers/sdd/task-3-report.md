# Task 3 Report: Rate limiting for auth (signin brute-force protection)

**Status:** DONE
**Commit:** c30d2b0 `feat: rate-limit sign-in attempts per email`
**Branch:** production-readiness

## What was done
- Created `src/lib/__tests__/rate-limit.test.ts` per brief (3 tests).
- `src/lib/rate-limit.ts` already existed with content identical to the brief (in-memory sliding window, 5 attempts / 15 min per key, plus `resetRateLimits`); verified verbatim match.
- Wired `checkRateLimit` into `authorize()` in `src/lib/auth.ts` before the schema parse. Fixed a pre-existing TS error: the rate-limit block declared `email`, which collided with the later destructured `email` — renamed to `rlEmail`.
- Verified: `npx tsc --noEmit` clean; `npx vitest run src/lib/__tests__/rate-limit.test.ts` → 3/3 passed.

## Notes / concerns
- TDD red phase could not be observed because implementation already existed on disk (likely from a prior partial run); test was confirmed passing against it.
- In-memory store is single-instance only (per brief); swap for Redis if scaling horizontally.
- Rate limit is keyed by email only; failed attempts count even for valid logins within window (per brief design).
