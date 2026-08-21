### Task 8: Fix vitest worker timeouts (CI reliability)

**Files:**
- Modify: `vitest.config.ts`

**Context:** `npm run test` intermittently fails with "Timeout waiting for worker to respond" on Windows forks pool; verbose run passes. Stabilize pool config.

- [ ] **Step 1: Update vitest.config.ts**

```ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 2: Run `npm run test` (not verbose) 3 times**

Expected: 67+ tests pass every time, no worker errors

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "fix: stabilize vitest worker pool on Windows"
```

---


