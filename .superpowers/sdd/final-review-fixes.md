# Final Review Fixes

Commit: 7b41c87 — "fix: address final review findings (env wiring, CI trigger, logger keys, entrypoint errors, rate-limit resets)"

## Findings addressed
1. env.ts wired: auth.ts imports `env` and passes `secret: env.AUTH_SECRET`; ad-hoc secret check removed (env.ts validates min(16)). db.ts untouched (no env reads).
2. CI pull_request trigger restored, restricted to `branches: [main]`.
3. logger.ts key order changed to `{ ...meta, level, msg, time }`; test added proving meta cannot override `level`.
4. docker-entrypoint.sh user-count snippet now `.catch((e) => { console.error(e); process.exit(1); })`.
5. rate-limit.ts: added `resetRateLimit(key)`; called in auth.ts after successful password match; stale-key sweep when map size > 1000; test added for reset after block.
6. global-error.tsx logs error via useEffect console.error.

## Verification
- Targeted vitest (rate-limit, logger, env): 3 files, 10 tests passed.
- Full suite `npm run test`: 7 files, 77 tests passed (~34s).
- `npx tsc --noEmit`: clean.
- `bash -n docker-entrypoint.sh`: clean.
