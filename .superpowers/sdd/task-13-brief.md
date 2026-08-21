### Task 13: Remove junk files from repo

**Files:**
- Delete: `response.html`, `signin-test.html`, `cookies.txt`, `TASK-STATE.md` (verify contents first — if TASK-STATE.md is wanted, move to docs/)
- Verify: `.gitignore` includes `.env`, `test-results/`, `playwright-report/`

- [ ] **Step 1: Inspect each file briefly, then delete test artifacts**

```bash
git rm response.html signin-test.html cookies.txt
```

- [ ] **Step 2: Check .gitignore covers: `.env`, `.next/`, `node_modules/`, `test-results/`, `playwright-report/`. Add missing entries.**

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: remove test artifacts and harden gitignore"
```

---


