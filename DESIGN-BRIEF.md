# Design Brief: Riman HR Full UI Redesign

## 1. Feature Summary

Redesign all 22 HR management pages, 4 layouts, and 12 shared components from the default shadcn light/dark theme to "The Midnight Ledger" visual system — dark background (#07091A), gold accent (#D4A843), Syne + DM Sans typography, tonal surface layering, Recharts for data visualization. The result is a premium, authoritative, warm HR tool that feels as serious as the payroll data it handles.

## 2. Primary User Action

A single HR manager running Riman Fashion's entire people operations from one dashboard. Every screen must make the next decision obvious: approve a leave, check attendance, run payroll, review a document expiry.

## 3. Design Direction

**Color strategy:** Restrained (for the product surface) — tinted neutrals + one gold accent ≤10%. Semantic colors (green/red/blue/teal/amber/purple) used sparingly for status indicators and badges.

**Theme scene sentence:** A manager at a desk in Sharjah, early evening, reviewing pending leave requests on a single large monitor against a dark wall. The screen needs to feel like a serious tool — not playful, not cold.

**Anchor references:** The reference file `RimanHR.jsx` (gold-on-dark financial tool aesthetic), Linear (dark mode done right — tonal depth without gimmicks), Stripe's dashboard (data density with clear visual hierarchy).

## 4. Scope

- **Fidelity:** Production-ready. All states (empty, loading, error, edge cases).
- **Breadth:** 22 pages + 4 layouts + 12 shared components = ~35 files.
- **Interactivity:** Full interactive components with hover, focus, active, disabled states.
- **Time intent:** Polish until it ships. No sketches.

## 5. Layout Strategy

**Shell:** Fixed sidebar (240px / collapsed 64px) + sticky topbar (60px) + scrollable content area with 28px padding. This is the constant frame.

**Auth:** Centered card on gradient background. Brand header with logo + gold underline. Single-column form. No sidebar.

**Dashboard:** KPI cards across the top (4-column grid), then two-column charts (payroll trend + weekly attendance), then two-column bottom section (leave distribution pie + pending actions).

**List pages** (employees, leaves, attendance log, payroll register, documents, performance): Search/filter bar in a minimal card, then a full-width table card with scroll. Action buttons top-right.

**Detail pages** (leave detail, payroll detail, employee pay slip, performance detail): Two-column layout — main content left (60%), summary/sidebar right (40%). Status badges top-right of the card.

**Form pages** (new employee, new leave, new payroll, new performance): Single-column forms with 2-column field grids where related. Gold primary submit, outline cancel. Balance/warning info in gold-dim callout boxes.

**Calendar** (team leave calendar): List-style entries with avatar + date range + type + status. Each entry is a row in the card, not a traditional month grid.

## 6. Key States

- **Default:** Data loaded, all visual hierarchy present. Charts animate in (fade + translateY).
- **Empty:** "No employees yet" / "No leave requests" — centered message with icon, muted text, CTA button.
- **Loading:** Skeleton cards matching card shape (12px radius, surf bg, shimmer animation), skeleton rows for tables.
- **Error:** Red-tinted inline alert with icon + message + retry button. Not a toast — persistent until dismissed.
- **Not-found:** Centered "Page not found" with illustration placeholder and "Back to Dashboard" link.
- **Permission denied:** Lock icon + message + contact-admin note.

## 7. Interaction Model

- **Sidebar nav:** Click navigates, active item shows gold dim background + gold bright text. Collapse/expand toggle at bottom.
- **Buttons:** Gold primary lifts on hover (translateY(-1px) + shadow). Outline secondary shifts border + text color. Both use 0.15s ease.
- **Table rows:** Hover shows subtle background highlight. Action buttons appear on row hover.
- **Modals:** Overlay click closes. Escape key closes. Focus trapped inside. Content area scrolls if needed.
- **Tabs (pill bar):** Click switches view. Active tab gets surf3 background. Smooth color transition.
- **Badges:** Static indicators. No hover interaction.
- **Charts:** Hover shows tooltip (surf3 card, gold text for values). Animate on mount.
- **Inputs:** Focus shifts border to gold glow. No outline indicator. Placeholder disappears on type.

## 8. Content Requirements

- **Page titles:** Syne 700 at 22-24px. One per page.
- **KPI values:** Syne 700 at 26px with gold color.
- **Table headers:** DM Sans 600, 11px, uppercase, 0.08em spacing, muted color.
- **Table cells:** DM Sans 400 at 13.5px.
- **Button labels:** DM Sans 600 at 13px.
- **Badge text:** DM Sans 600 at 11.5px.
- **Form labels:** DM Sans 600 at 11.5px, uppercase, muted.
- **Empty state messages:** DM Sans 400 at 14px, secondary text color.
- **Error messages:** DM Sans 500 at 13px, red text.
- **All copy in English + Arabic (RTL).** Labels shorter than their English equivalents; design must accommodate both.

## 9. Recommended References

- `impeccable harden` for error/loading/empty state patterns
- `impeccable layout` for spacing rhythm and visual hierarchy
- `impeccable polish` for final quality pass before shipping

## 10. Open Questions

- None. All direction is resolved by PRODUCT.md, DESIGN.md, and the reference file.

---

**Confirm this brief?** Once confirmed, I'll proceed to implementation in this order:
1. `globals.css` — design tokens + dark theme
2. Root `layout.tsx` — Syne + DM Sans via next/font
3. UI components — button, card, input, select, badge, table, label
4. Layout components — sidebar, header, language-switcher
5. Auth layout + sign-in page
6. HR layout (sidebar + header integration)
7. All 22 pages group by feature
