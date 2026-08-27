# Light Mode + Foundational UI Polish — Design

**Date:** 2026-08-27
**Status:** Approved by user
**Applies to:** Riman HR (Next.js 15, Tailwind v4, next-themes, shadcn/ui)

---

## Problem

The app is fully hardcoded to a dark-only color scheme. `next-themes` is installed but never wired up. ~159 inline hex/rgba color usages across 15+ files make a light theme impossible without a global conversion to adaptive tokens. Shadcn semantic tokens exist but are barely used.

## Decisions (from user)

1. **Light palette:** Warm paper + gold — ivory/cream surfaces (`#FBF8F1` page, `#F6F1E6` card, `#EFE7D6` raised), ink text (`#26241E` primary / `#6E695C` secondary / `#9A9484` muted), gold accent darkened for paper contrast (`#A87E1E`).
2. **Toggle behavior:** Light / Dark / System, defaults to System. Mounted in header.
3. **Scope:** Foundational polish — theme toggle, adaptive charts, surface contrast, focus-visible rings, empty states, RTL-safe spacing. No layout or component redesigns.

## Architecture

### 1. CSS variables (globals.css, Tailwind v4)

- `:root` keeps **current dark values** (dark-first — zero regression for existing users, correct no-JS fallback).
- Add a **`.light`** block overriding every shadcn semantic token (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--sidebar*`, `--chart-1..5`).
- **Adaptive brand tokens:** the `--color-*` entries in `@theme inline` become `var()` aliases over base vars that flip per theme, so existing classes like `bg-deep-stratum` / `text-ledger-text` adapt automatically. In light mode these resolve to the warm paper equivalents.
- `color-scheme`: `:root` → dark, `.light` → light.

### 2. next-themes wiring

- Mount `ThemeProvider` in `src/app/layout.tsx` with `attribute="class"`, `enableSystem`, `defaultTheme="system"`, `disableTransitionOnChange`.
- Replace hardcoded `bg-[#07091A] text-[#E0E6F4]` body classes with `bg-background text-foreground`.

### 3. Component conversion

Convert the ~159 hardcoded usages to existing adaptive token classes in:
`dashboard/content.tsx`, `layout/sidebar.tsx`, `shared/index.tsx`, `notifications/notification-bell.tsx`, `ui/select.tsx`, `ui/button.tsx`, `ui/badge.tsx`, `ui/input.tsx`, `ui/table.tsx`, `ui/card.tsx`, `ui/form.tsx`, `ui/label.tsx`, `manager-leaves/SubmitLeaveDialog.tsx`, `employee-picker.tsx`, `app/layout.tsx`.

Mapping examples: `bg-[#07091A]` → `bg-midnight-well`, `text-[#E0E6F4]` → `text-ledger-text`, `bg-[#131830]` → `bg-upper-stratum`, `border-[#181E38]` → `border-crest-stratum`, `rgba(255,255,255,0.05)` → `bg-white/5`.

### 4. Theme toggle

`ThemeToggle` component in header, cycling Light → Dark → System using Lucide `Sun`/`Moon`/`Monitor` icons. Accessible label, RTL-safe.

### 5. Foundational polish

- Focus-visible rings consistent in both themes.
- Card/popover/border hover states tuned per theme.
- Recharts: axis/grid/tooltip colors bound to tokens.
- Empty states: muted-on-surface contrast legible in both modes.
- RTL audit: `mr-*/ml-*` → `ms-*/me-*` in header/notifications.
- Sonner toaster verified in both modes.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run test` (216 existing tests) all pass.
- Manual visual check of dashboard, sidebar, auth pages in both themes.