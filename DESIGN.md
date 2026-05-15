---
name: Riman HR
description: Premium HR management system for Riman Fashion
colors:
  bg: "#07091A"
  surf: "#0D1028"
  surf-2: "#131830"
  surf-3: "#181E38"
  gold: "#D4A843"
  gold-bright: "#EFC254"
  text: "#E0E6F4"
  text-sub: "#8B93A8"
  text-muted: "#4A5168"
  green: "#22C55E"
  red: "#EF4444"
  blue: "#4B8BF0"
  teal: "#0FC8BA"
  amber: "#F59E0B"
  purple: "#8B5CF6"
typography:
  display:
    fontFamily: "Syne, sans-serif"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Syne, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, sans-serif"
    fontWeight: 600
    fontSize: "11.5px"
    letterSpacing: "0.06em"
  mono:
    fontFamily: "DM Sans, monospace"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "#0D0B07"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-sub}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    border: "1px solid rgba(255,255,255,0.065)"
  card:
    backgroundColor: "{colors.surf}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "20px"
    border: "1px solid rgba(255,255,255,0.065)"
  input:
    backgroundColor: "{colors.surf-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
    border: "1px solid rgba(255,255,255,0.065)"
  badge:
    rounded: "20px"
    padding: "3px 10px"
    fontFamily: "DM Sans, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
---

# Design System: Riman HR

## 1. Overview

**Creative North Star: "The Midnight Ledger"**

Riman HR is a vault for people data. The dark background is the ledger itself — serious, permanent, deserving of trust. Gold enters not as decoration but as annotation: totals, approvals, the primary action. Every surface feels deliberate because every surface holds someone's salary, leave balance, or contract.

The system rejects the default shadcn SaaS look (white/gray cards, blue primary, flat everything) in favor of depth through tonal layering. Three surface tones create the stratum — bg → surf → surf2 → surf3 — with gold reserved for what matters. The result is authoritative without being cold, warm without being casual.

**Key Characteristics:**
- Dark-ledger gravity. Nothing playful or decorative.
- Gold as highlighter, not wallpaper.
- Tonal depth replaces shadow sprawl.
- Tactile interactive states — buttons lift, inputs glow.
- Tables and data are the hero; chrome stays out of the way.

## 2. Colors

A near-monochrome neutral palette tinted toward indigo, pierced by a single gold accent and five semantic role colors.

### Primary

- **Gold Ledger** (#D4A843 / oklch(74% 0.14 82)): The single accent. Used for primary buttons, active nav states, KPI values, chart lines, and confirmation badges. It carries authority — using it for anything trivial violates the contract. Never applied as a background wash or gradient.

### Neutral

- **Midnight Well** (#07091A): Page background. Full-screen canvas. No other color touches it.
- **Deep Stratum** (#0D1028): Surface color for cards, sidebar, topbar. The primary container layer.
- **Upper Stratum** (#131830): Input backgrounds, tab-bar backgrounds, secondary container fill.
- **Crest Stratum** (#181E38): Active tab background, hover-state container accent.
- **Ledger Text** (#E0E6F4): Primary body and heading color. High contrast on Midnight Well.
- **Ledger Text Secondary** (#8B93A8): Secondary text, table body content, non-essential information.
- **Ledger Text Muted** (#4A5168): Placeholder text, column headers, captions, metadata.
- **Border Faint** (rgba(255,255,255,0.065)): Default border for cards, inputs, tables. Invisible until you look.
- **Border Hover** (rgba(255,255,255,0.13)): Border on hover states, active inputs, elevated surfaces.

### Semantic

- **Statement Green** (#22C55E): Present status, approved leaves, positive trends, success states. Dim variant at 10% opacity for badge backgrounds.
- **Audit Red** (#EF4444): Absent status, rejected leaves, negative trends, critical alerts. Dim variant at 8% opacity.
- **Inquiry Blue** (#4B8BF0): Study leave, informational badges, link states. Dim variant at 10% opacity.
- **Statement Teal** (#0FC8BA): WPS/payroll compliance badges, positive secondary metrics. Dim variant at 10% opacity.
- **Warning Amber** (#F59E0B): Late status, pending clearance, approaching expiry. Dim variant at 10% opacity.
- **Authority Purple** (#8B5CF6): Maternity leave, special status badges. Dim variant at 10% opacity.

### Named Rules

**The Gold Rarity Rule.** Gold appears on at most 10% of any screen. Its scarcity gives it weight. If every other element is gold, nothing is.

**The Dim Background Rule.** Semantic colors never appear at full opacity as backgrounds. The dim variants (8–12% opacity, matching border tone) are the container layer; full opacity is for text, icons, and chart elements only.

## 3. Typography

**Display Font:** Syne (sans-serif) — geometric, confident, architectural.
**Body Font:** DM Sans (sans-serif) — warm, readable, humanist alternate.

**Character:** Syne brings the authority — it stands for headlines, dashboard KPIs, and section titles. DM Sans does the work: tables, forms, labels, tooltips. The pairing says "serious tool, warm interaction."

### Hierarchy

- **Display** (Syne 700, 22–26px, 1.1): Page titles (`HR Dashboard`, `Payroll & WPS`). One per page. Never more.
- **Title** (Syne 700, 15–18px, 1.2): Section headings, card titles, dialog headers. The second level of the type ramp.
- **Body** (DM Sans 400, 13–13.5px, 1.5): All paragraph text, table cells, form labels, dropdown items. Cap width at 75ch.
- **Label** (DM Sans 600, 11.5px, uppercase, 0.06em letter-spacing): Column headers, form field labels, badge text, button text. The only uppercase role.
- **Mono** (DM Sans / monospace, 12–13px): Employee IDs, clock-in/out times, reference numbers.

### Named Rules

**The One Display Rule.** Exactly one `Display` element per page — the page title. Section headings use `Title`. The hierarchy is three deep, not six.

**The Body Cap Rule.** DM Sans body text never exceeds 75 characters per line. Tables and data grids are exempt; they follow their own density constraints.

## 4. Elevation

Depth is conveyed primarily through **tonal layering** (bg → surf → surf2 → surf3), not shadows. Each step up in lightness signals "one surface higher." This keeps the dark field clean and prevents the shadow-jungle that plagues dark UIs.

Shadows are reserved for momentary hierarchy: modals (needing to float above everything), buttons on hover (a subtle lift to signal affordance), and dropdown overlays (separating from their trigger).

### Surface Stack

- `bg` (#07091A) — ground. Never placed on top of anything.
- `surf` (#0D1028) — cards, sidebar, topbar. Primary container.
- `surf2` (#131830) — inputs, tab bars, secondary fills. Sits on surf.
- `surf3` (#181E38) — active tab, hover row. Sits on surf2.

### Shadow Vocabulary

- **Modal Float** (`box-shadow: 0 25px 50px rgba(0,0,0,0.4)`): Dialog overlays. The only element that breaks free of the tonal stack entirely.
- **Button Lift** (`box-shadow: 0 4px 12px rgba(0,0,0,0.3)`): Primary button hover state. Accompanies the `translateY(-1px)` transform.
- **Dropdown Panel** (`box-shadow: 0 8px 24px rgba(0,0,0,0.35)`): Menus, date pickers, popovers. Between tonal layer and modal.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state: hover, focus, open. A card never has a shadow when nothing is happening to it.

## 5. Components

### Buttons

Tactile and confident. All buttons use 8px radius, DM Sans 600 at 13px, 8px 16px padding, and a 0.15s ease transition on background, border, and transform.

- **Gold Primary** (`button-primary`): Background `#D4A843`, text `#0D0B07`. On hover: background `#EFC254`, transform `translateY(-1px)`, shadow `0 4px 12px rgba(0,0,0,0.3)`. On click: no transform. Never disabled without 0.4 opacity.
- **Outline Secondary** (`button-secondary`): Transparent background, 1px border `rgba(255,255,255,0.065)`, text `#8B93A8`. On hover: border `rgba(255,255,255,0.13)`, text `#E0E6F4`.
- **Ghost** (icon-only): Transparent, no border, 6px radius, 5px padding. On hover: background `rgba(255,255,255,0.05)`.

### Cards

The default container. 12px radius, surf background, faint border (`rgba(255,255,255,0.065)`), 20px interior padding. Flat at rest. Never nested. No left-stripe borders. When the card contains a table, the padding is 0 and the table has its own header padding.

### Inputs

Upper stratum fill (`#131830`), faint border. Focus shifts border to `rgba(212,168,67,0.4)` — the gold glow is the only focus indicator. No outline. Placeholder text uses `#4A5168`. 8px radius. Height auto via 9px vertical padding.

### Selects

Same as inputs with `appearance: none` and a custom chevron. Width fills container unless constrained.

### Badges

Charted indicators for status, leave type, and metadata. 20px pill radius with 3px 10px padding. Always paired: a dim background (8–12% of the semantic color) + a full-opacity text in the same hue. The `bgray` fallback uses `rgba(255,255,255,0.05)` background with `#8B93A8` text.

### Navigation / Sidebar

240px fixed left rail, surf background, right border `rgba(255,255,255,0.065)`. Nav items: 8px radius, 12px horizontal gap between icon and label, 9px vertical padding. Default: text `#8B93A8`. Hover: background `rgba(255,255,255,0.05)`, text `#E0E6F4`. Active: gold dim background (`rgba(212,168,67,0.12)`), gold bright text (`#EFC254`), inner border `rgba(212,168,67,0.2)`. Collapsed state shrinks to 64px.

### Tables

No outer border. Header row: uppercase label treatment (11px, 700 weight, 0.08em spacing, `#4A5168`), bottom border `rgba(255,255,255,0.065)`, 10px 14px padding. Body rows: 13.5px, bottom border `rgba(255,255,255,0.04)`, hover background `rgba(255,255,255,0.018)`. Last row has no bottom border.

### Tabs (Pill Tab Bar)

surf2 background, 4px padding, 10px radius container. Tabs: 7px 16px padding, 7px radius, surf3 background when active. Text sub when inactive, full text when active. No borders.

### Modal

Full-screen fixed overlay with `rgba(0,0,0,0.7)` + `backdrop-filter: blur(4px)`. Dialog panel: surf background, 16px radius, 28px padding, max 540px wide. Content scrolls internally beyond 90vh.

### KPIs (Metric Cards)

Standard card with a circular colored icon in the top-left (40px diameter, 10px radius, 18% opacity fill + 30% border), the metric in Display/Title type (26px Syne 700), label in body (13px DM Sans), optional sub-text in muted (11.5px). Optional trend indicator (green up / red down) in the top-right corner.

### Charts

Recharts components rendered in the card color vocabulary. Area charts use gold gradients. Bar charts use semantic colors by data category. Pie charts mimic badge hues. All tooltips use surf3 background with border tone.

## 6. Do's and Don'ts

### Do:

- **Do** use the tonal surface stack (bg → surf → surf2 → surf3) for all depth. Let lightness do the work of shadows.
- **Do** keep gold to ≤10% of any screen. Gold is the accent, not the theme.
- **Do** use semantic dim backgrounds for badges (8–12% opacity of the semantic color). Never use full-opacity color as a background.
- **Do** use Syne for exactly one element per page (the title) and DM Sans for everything else.
- **Do** keep cards flat with 12px radius and a single faint border. No shadows at rest.
- **Do** use the gold border glow on input focus — it's the only focus indicator.
- **Do** wrap tables in a horizontal scroll container. Tables don't cap at 75ch.
- **Do** use the pill tab bar for segmented views within a page.

### Don't:

- **Don't** use side-stripe borders (left/right borders >1px as colored accents on cards, list items, callouts, or alerts).
- **Don't** use gradient text (`background-clip: text` with gradient). Solid colors only.
- **Don't** use glassmorphism as a default decorative treatment.
- **Don't** use the hero-metric template (big number, small label, supporting stats, gradient accent).
- **Don't** nest cards. Cards sit on surf, not on other cards.
- **Don't** use default shadcn blue primary, white/gray cards, or light-mode-first design.
- **Don't** make anything that looks like a "2014 admin panel" — flat white, over-bordered, no hierarchy.
- **Don't** use bounce or elastic easings on transitions. Use ease-out quart/quint/expo for reveals, linear for state changes.
- **Don't** animate CSS layout properties (width, height, top, left, padding, margin).
