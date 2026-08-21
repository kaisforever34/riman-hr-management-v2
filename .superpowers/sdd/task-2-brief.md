### Task 2: Security headers + hardened next.config

**Files:**
- Modify: `next.config.ts`

**Interfaces:**
- Produces: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy on all responses.

- [ ] **Step 1: Update `next.config.ts`**

```ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
```

Note: no strict CSP yet (Next.js inline scripts break it); add nonce-based CSP later if required. HSTS only matters over HTTPS — harmless on localhost.

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: success

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: add security headers and harden next config"
```

---


