# PTAC Pro Tracker — Design System

The design system is implemented through **Streamlit theme config** (`.streamlit/config.toml`), **inline CSS** in each view module, and **shared HTML helpers** in `_shared.py`. There is no separate CSS file or component library.

---

## Colors

### Streamlit Theme (global)

| Token | Value | Usage |
|-------|-------|-------|
| `primaryColor` | `#2563eb` | Buttons, accents |
| `backgroundColor` | `#f8fafc` | App background |
| `secondaryBackgroundColor` | `#ffffff` | Widget backgrounds |
| `textColor` | `#0f172a` | Primary text |

### Brand / Navigation

| Name | Hex | Usage |
|------|-----|-------|
| Brand Blue | `#2563eb` | Logo badge, scanner pill, primary actions |
| Navy | `#0f172a` | Hero banners, dark headers, primary KPI |
| Slate 500 | `#64748b` | Secondary text, labels |
| Slate 400 | `#94a3b8` | Tertiary text, captions |
| Border | `#e2e8f0` | Card borders, dividers |
| Surface | `#ffffff` | Cards, panels |

### Operational Status Colors

| Status | Background | Border | Text | Notes |
|--------|------------|--------|------|-------|
| Active | `#f0fdf4` | `#bbf7d0` | `#166534` / `#15803d` | Green — healthy |
| Needs PM | `#fffbeb` | `#fde68a` | `#92400e` | Amber — pulsing animation |
| Maintenance Office | `#f5f3ff` | `#ddd6fe` | `#5b21b6` | Purple — onsite |
| Doyle Shop | `#fff1f2` | `#fecdd3` | `#9f1239` | Rose — offsite |
| Spare/Storage | `#eff6ff` | `#bfdbfe` | `#1e40af` / `#1d4ed8` | Blue — inventory |
| Unknown | `#f8fafc` | `#cbd5e1` (dashed) | `#64748b` | Empty/missing unit |

### KPI Accent Colors

| KPI | Color |
|-----|-------|
| Total Inventory | `#0f172a` |
| Active & Running | `#10b981` |
| PM Clean Overdue | `#f59e0b` |
| At Maint. Office | `#8b5cf6` |
| At Doyle Shop | `#ef4444` |

### Action Tile Icon Backgrounds

| Action | Background | Icon Color |
|--------|------------|------------|
| Custody Transfer | `#dbeafe` | `#2563eb` |
| PM Checklist | `#fef3c7` | `#92400e` |
| Onsite Repair | `#ffe4e6` | `#be123c` |

---

## Typography

### Font Family
- **Streamlit default:** `sans serif` (system stack: -apple-system, BlinkMacSystemFont, Segoe UI)
- **Avery print preview:** Same system stack in embedded HTML

### Scale

| Element | Size | Weight | Other |
|---------|------|--------|-------|
| App title | 18px | 900 | Line-height 1 |
| Page title (h2) | 28px | 950 | Letter-spacing -0.02em |
| Floor header (h3) | 20px | 950 | |
| KPI value | 36px | 900 | |
| KPI label | 11px | 900 | Uppercase, letter-spacing 0.04em |
| KPI sublabel | 10px | 600 | Color `#94a3b8` |
| Room cell main label | 15px | 950 | |
| Room cell PTAC ID | 9px | 800 | Color `#94a3b8` |
| BTU label | 10px | 950 | Letter-spacing 0.14em, color `#6aa08d` |
| Directory primary text | 15px | 950 | |
| Directory secondary | 11px | 850 | Uppercase |
| Status pill | 11px | 900 | Border-radius 999px |
| Section label (detail) | 12px | 950 | Uppercase, letter-spacing 0.08em |
| Body / caption | 12–13px | 600–750 | |

### Weight Convention
Headings and labels consistently use **900–950** font-weight for a bold operational/dashboard aesthetic.

---

## Spacing

| Context | Value |
|---------|-------|
| Card padding | 16–28px |
| Card border-radius | 14–22px (16px most common) |
| KPI card min-height | 130px |
| Room cell min-height | 68px |
| Floor card margin-bottom | 14px |
| Grid gap (room cells) | 8px |
| Grid gap (support grid) | 8px |
| Section margin (hero) | 22px top, 16px bottom |
| HR margin | 5px top, 20px bottom |
| Action tile padding | 20px |
| Action tile min-height | 132px |
| Directory row min-height | 76px |
| Filter shell padding | 16px |
| Filter shell margin-bottom | 26px |

---

## Grid

### Dashboard Floor Grid
```css
grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
gap: 8px;
```

### Dashboard Support Grid
```css
grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
gap: 8px;
```

### Avery Label Grid
```css
grid-template-columns: 1fr 1fr;  /* 2 columns */
/* 5 rows = 10 labels per sheet */
```

### Streamlit Layout Columns
Common patterns:
- KPI row: `st.columns(5)` or `st.columns(4)`
- Unit detail: `st.columns([1.05, 2.15])`
- Directory header: `[3, 1]`
- Doyle portal: `[1, 2]`

### Hotel Room Layout (logical grid)
- **Floors:** 2, 3, 4, 5, 6
- **Room suffixes per floor:** 03–12, 14–22, 24–29 (no 13, 23)
- **Suite 211:** Split into `Suite 211-A` and `Suite 211-B`

---

## Breakpoints

Only one explicit media query exists (dashboard):

```css
@media (max-width: 700px) {
  .dashboard-hero { display: block; }
  .scanner-pill { display: inline-block; margin-top: 16px; }
}
```

Streamlit's responsive behavior handles most column stacking. The app is primarily designed for **desktop/tablet landscape** hotel office use.

### Avery Print
```css
@media print {
  .avery-sheet { page-break-after: always; ... }
}
```

---

## Animations

### PM Pulse (Needs PM status)
```css
@keyframes pmPulse {
  0%, 100% {
    background-color: #fffbeb;
    border-color: #fde68a;
    color: #92400e;
  }
  50% {
    background-color: #fef3c7;
    border-color: #f59e0b;
    color: #78350f;
  }
}
animation: pmPulse 2s infinite ease-in-out;
```

Applied to:
- Dashboard room cells with Needs PM status
- Legend dot for Needs PM

### Hover (room cells)
```css
transition: transform .15s ease, box-shadow .15s ease;
.room-cell:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(15, 23, 42, .08);
}
```

---

## Icons

| Location | Icon | Implementation |
|----------|------|----------------|
| App favicon | 🏨 | `page_icon` in `st.set_page_config` |
| Logo badge | 🏨 | HTML div in nav header |
| Nav page icons | 📊 📋 📸 🖨️ 💰 🔧 | `st.Page(..., icon=...)` (hidden nav) |
| Scanner pill | ▦ | Unicode in hero HTML |
| Action tiles | → ✓ $ | Unicode in HTML |

No icon font library (Font Awesome, etc.) is used.

---

## UI Conventions

### Cards
- White background (`#fff`)
- 1px solid border (`#e2e8f0`)
- Border-radius 16–22px
- Subtle shadow: `0 1px 3px rgba(15, 23, 42, 0.04–0.05)`

### Buttons
- Streamlit primary buttons for main actions
- Directory/detail: `border-radius: 11px`, `font-weight: 900`
- Avery print button: dark navy `#0f172a` background

### Status Pills
- Fully rounded (`border-radius: 999px`)
- Background + border match status color palette
- Used in directory and unit detail header

### Forms
- `st.form(..., border=True)` for submit groups
- Dependent dropdowns **outside** forms when immediate rerun is needed (custody transfer)
- Required fields validated on submit with `st.error()`
- No prefilled technician names — placeholders only

### Navigation
- Custom segmented controls, labels collapsed
- Horizontal layout at top (not sidebar)
- HR separator below nav: `#e2e8f0`

### Empty States
- Centered gray text (`#94a3b8`, weight 800)
- `st.info()` for zero-data sections

### Warnings
- Occupied-room override: `st.warning()` before form
- Localhost QR: `st.warning()` on unit detail
- Delete: `st.warning()` in delete dialog

---

## Accessibility Rules

### Current State
The app relies heavily on **color alone** for status differentiation, with text labels also present on tiles and pills. No formal WCAG audit has been performed.

### Conventions to Preserve
1. **Status text always accompanies color** — tiles show PTAC ID + room number + status in `title` attribute
2. **Form labels** — Streamlit widgets use visible labels or captions
3. **Error messages** — `st.error()` for validation failures before any write
4. **Button text** — Descriptive labels (`Execute Custody Transfer`, not just icons)
5. **QR alt text** — `alt='QR code for {ptac_id}'` on unit detail image

### Recommended Improvements (not yet implemented)
- Add `aria-label` to HTML room cell links
- Ensure PM pulse animation respects `prefers-reduced-motion`
- Keyboard focus styles on custom HTML links
- Sufficient contrast audit for amber PM text on amber background

---

## Shared Style Helpers

| Helper | Location | Purpose |
|--------|----------|---------|
| `dashboard_status_style(status)` | `_shared.py` | Inline CSS string for tile colors |
| `kpi_card(...)` | `_shared.py` | Standard KPI card HTML |
| `inject_detail_styles()` | `unit_detail.py` | Full detail page CSS |
| Per-page `<style>` blocks | Each view | Page-specific CSS |

When adding new pages, match existing card/border/radius/shadow values for visual consistency.
