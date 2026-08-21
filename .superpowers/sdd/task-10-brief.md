### Task 10: Add `typecheck` script + strict unused checks

**Files:**
- Modify: `package.json` (scripts)
- Modify: `tsconfig.json`

- [ ] **Step 1: Add scripts to package.json**

```json
"typecheck": "tsc --noEmit",
"verify": "npm run lint && npm run typecheck && npm run test && npm run build"
```

- [ ] **Step 2: Add to tsconfig.json compilerOptions**

```json
"noUnusedLocals": true,
"noUnusedParameters": true,
"noFallthroughCasesInSwitch": true
```

- [ ] **Step 3: Run `npm run typecheck` and fix any reported unused variables (delete dead code, do not prefix with underscore unless parameter).**

Run: `npm run typecheck`
Expected: 0 errors after fixes

- [ ] **Step 4: Run full verify**

Run: `npm run verify`
Expected: all green

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json src
git commit -m "chore: add typecheck script and stricter tsconfig"
```

---


