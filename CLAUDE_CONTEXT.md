# Claude Code Context — PTAC Pro Tracker

This document is written specifically for **Claude Code** (or any AI coding assistant) taking over development with zero prior context. Read this before making any changes.

---

## What This Project Is

A **Streamlit + Python + Supabase** web app for a **Hampton Inn** hotel to track ~125+ PTAC air conditioning units across guest rooms (floors 2–6), hallways, elevator closet, maintenance office, Doyle offsite repair shop, and spare storage.

It is **not** a React/Next.js app. There are no npm packages, no components with JSX props, and no client-side router. Everything is Python scripts rerun by Streamlit on each interaction.

---

## How the Project Was Built

### Phase 1: Foundation
- Created `app.py` with Supabase connection via `st.secrets`
- Built `views/dashboard.py` as visual floor grid
- Built `views/directory.py` as inventory table
- Established Supabase tables: `ptac_units`, `custody_transfers`, `pm_logs`, `onsite_repairs`, `doyle_repairs`

### Phase 2: Shared Layer & Unit Detail
- Extracted all duplicate fetch logic into `views/_shared.py`
- Created `views/unit_detail.py` as hidden shared action screen
- Added QR deep links via `?unit_detail=PTAC-###`
- Converted inline forms to `@st.dialog` modals
- Fixed custody transfer dependent dropdowns (widgets outside `st.form`)

### Phase 3: Navigation & QR
- Custom horizontal navigation replacing Streamlit sidebar
- `clear_unit_detail_selection()` to fix stuck unit detail on tab switch
- `app_base_url()` and `unit_detail_url()` for deployment-safe QR codes
- Same-tab dashboard links (`target="_self"`)

### Phase 4: Secondary Pages (first-pass)
- `views/scanner.py` — lookup gateway
- `views/avery.py` — printable labels with QR
- `views/analytics.py` — spending/PM reporting
- `views/doyle.py` — contractor portal

### Current stop point
Core workflows (dashboard, directory, unit detail) are **production-quality**. Secondary pages are **functional but need polish**. Deployment not yet done.

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Streamlit over React | Fast iteration for internal hotel ops tool; Python team familiarity |
| Supabase as sole backend | No custom API server; PostgREST handles CRUD |
| No caching | Owner wanted live inventory; stale PTAC location data is dangerous |
| Hidden unit detail (not routed page) | Same action surface from dashboard, directory, scanner, QR links |
| Custom nav, hidden Streamlit sidebar | Better horizontal ops-console UX |
| Inline CSS per view | No build step; matches Streamlit patterns; owner polished directory/dashboard |
| Spare units in `ptac_units` | No separate spares table; `location_type = "Spare"` |
| QR via external API | `api.qrserver.com` — no local QR library dependency |
| Permissive RLS | Internal hotel tool; tighten before public exposure |
| Hardcoded room layout | Single property (Hampton Inn); floors 2–6 with specific suffixes |

---

## Coding Conventions

### File Organization
- **One view file per screen** under `views/`
- **All shared data logic** in `views/_shared.py` — not in view files
- **Unit detail** is imported by pages that support selection overlay
- **No page-specific data helpers** — if two pages need it, put it in `_shared.py`

### Naming
- Functions: `snake_case` (`fetch_units`, `display_status`)
- Session keys: `snake_case` (`selected_ptac_id`, `current_page`)
- PTAC IDs: `PTAC-###` format (zero-padded 3 digits)
- Location names: `"Room 201"`, `"Suite 211-A"`, `"Floor 3 Hallway"`, `"5th Floor Storage Closet"`

### Streamlit Patterns
```python
# Always check for unit detail overlay at top of page
if get_selected_ptac_id():
    render_unit_detail()
    st.stop()

# After any Supabase write
st.rerun()

# Dependent dropdowns that need immediate rerun → OUTSIDE st.form
route = st.selectbox(...)  # outside
with st.form(...):
    technician = st.text_input(...)
    submitted = st.form_submit_button(...)

# Modal actions
@st.dialog("Title")
def my_dialog(unit):
    render_form(unit)
if st.button("Open"):
    my_dialog(unit)
```

### CSS
- Inject via `st.markdown("<style>...</style>", unsafe_allow_html=True)` at top of view
- Match existing tokens: `#f8fafc` bg, `#e2e8f0` border, `#0f172a` text, 16px radius
- Use `escape()` from `html` module when interpolating user/DB data into HTML

### Supabase
```python
supabase = st.session_state.supabase  # or get_supabase()
response = supabase.table("ptac_units").select(...).execute()
supabase.table("custody_transfers").insert({...}).execute()
supabase.table("ptac_units").update({...}).eq("ptac_id", id).execute()
```

---

## Patterns That MUST Be Preserved

1. **Unit-level actions flow through `unit_detail.py`** — Do not duplicate custody/PM/repair forms in scanner or other pages
2. **Live reads, no caching** — Do not add `@st.cache_data` without explicit owner approval
3. **`_shared.py` stays domain-focused** — No page-specific CSS in shared layer
4. **Custody transfer dropdowns outside form** — Required for Streamlit rerun behavior
5. **Technician name validation** — Never prefill with "Hotel Maintenance"; require real input
6. **Occupied-room override** — Always check `active_unit_at_location()` before room deployment; displace existing unit to Maintenance Office with logged notes
7. **Navigation clearing** — Any nav change must call `clear_unit_detail_selection()`
8. **QR URLs use `unit_detail_url()`** — Never encode plain PTAC ID text in QR codes
9. **Directory table styling** — Owner polished this; do not restyle without request
10. **Spare registration inserts into `ptac_units`** — No separate spares table

---

## Things That Should NOT Be Changed

- Supabase table names and column names used in queries ( downstream data depends on them )
- Room layout constants (`FLOORS`, `ROOM_SUFFIXES`) without owner confirmation
- The `display_status()` logic — many views depend on consistent status labels
- The `allowed_transfer_paths()` rules — these encode hotel operational policy
- Hidden navigation pattern (`st.navigation(..., position="hidden")`)
- The unit detail overlay pattern (`get_selected_ptac_id()` check at page top)
- `app.py` secrets loading flow and error messages

---

## Expected Behavior — Major Features

### Dashboard
- Shows KPI counts from live `fetch_units()`
- Renders floors 2–6 in ascending order
- Each room cell is color-coded by `display_status()` / `dashboard_status_style()`
- Clicking a unit cell opens unit detail (same tab)
- Empty rooms show "No unit" styling without link
- Support sections below floors: hallways, elevator, maintenance, Doyle, spares

### Directory
- Table of all units with search and dual filters
- "View / Action" sets `selected_ptac_id` and shows unit detail
- "+ Register New Spare Unit" toggles form; submit inserts new `ptac_units` row
- Next ID auto-generated, serial required

### Unit Detail
- Accessible via: dashboard click, directory button, scanner lookup, analytics click, QR deep link
- Shows QR encoding full URL to this unit
- Three primary actions via modals: custody transfer, PM, onsite repair
- Edit specs and delete via header buttons
- History timeline merges all log types, newest first
- "Back to Board" clears selection and returns to dashboard

### Custody Transfer
- Destination options depend on unit's current state (see `allowed_transfer_paths`)
- Guest Room → room dropdown; Corridor → hallway dropdown; Elevator → no sub-select
- Execute button disabled until valid target exists
- Occupied room → warning + override checkbox + displacement on submit

### PM Checklist
- All 4 checkboxes required
- Moves unit to Maintenance Office first if not already there
- Updates `last_pm_date` to today
- Unit stays at Maintenance Office after PM (deploy separately via custody transfer)

### Onsite Repair
- Moves unit to Maintenance Office first if needed
- Technician and diagnostic notes required
- Inserts into `onsite_repairs`

### Scanner
- Type PTAC ID or paste unit-detail URL
- Valid match → opens unit detail
- Invalid → error message, no write
- Does NOT contain its own custody/PM/repair forms

### Avery Labels
- Select units by batch filter and checkboxes
- Preview 2×5 grid per sheet
- QR encodes `unit_detail_url(ptac_id)`
- Print button triggers browser print dialog

### Analytics
- KPIs for spend, avg cost, PM compliance, active Doyle count
- Date window filter for repair spend
- Clickable unit references open unit detail

### Doyle Portal
- Shows ONLY units with Doyle Shop status
- Select from queue → fill repair form → submit
- Return to spare storage OR direct to guest room
- Occupied room override same as custody transfer
- Writes via `complete_doyle_repair()`

---

## Preferred Implementation Style

1. **Minimal diffs** — Change only what's needed for the task
2. **Extend `_shared.py`** for reusable data logic; extend existing views for UI
3. **Match existing CSS patterns** — copy card/border/radius from sibling views
4. **Validate before write** — `st.error()` + early return, never write invalid data
5. **Always `st.rerun()` after successful mutation**
6. **No new dependencies** unless clearly justified
7. **No abstractions for one-use code** — inline is fine
8. **Comments only for non-obvious business rules** — code should be self-explanatory
9. **Do not create markdown docs** unless explicitly requested
10. **Do not commit secrets** — ever

---

## Assumptions Made During Development

1. **Single hotel property** — Hampton Inn with floors 2–6 and specific room numbering
2. **Trusted internal users** — No auth needed for v1
3. **Small inventory** — ~130 units; full-table fetch on every page is acceptable
4. **Supabase schema already exists** — App assumes tables are created; no migration files in repo
5. **Anon key with permissive RLS** — App can read/write all tables
6. **English only** — No i18n
7. **Desktop-first** — Hotel office workstation, not mobile-native
8. **Doyle is the only contractor** — Single offsite shop workflow
9. **PM status is manually set** — No automated overdue calculation from dates (status field used directly)
10. **`seed.py` is complete** — Initial Hampton Inn PTAC inventory has been bootstrapped in Supabase
11. **Streamlit 1.x** — Uses `st.navigation`, `st.Page`, `st.segmented_control`, `st.dialog` (recent APIs)
12. **QR scanning from phone** — Requires deployed public URL; localhost QRs are dev-only

---

## Common Pitfalls for AI Assistants

| Pitfall | Correct Approach |
|---------|------------------|
| Adding React/npm tooling | This is Python/Streamlit only |
| Putting forms entirely inside `st.form` when dropdowns need rerun | Put route/selectbox outside form |
| Caching Supabase reads | Keep live reads unless owner requests caching |
| Creating separate spares table | Use `ptac_units` with `location_type = "Spare"` |
| Duplicating unit action forms in scanner | Route to `render_unit_detail()` |
| Using plain PTAC ID in QR | Use `unit_detail_url(ptac_id)` |
| Forgetting `clear_unit_detail_selection()` on nav | Tab switch will stick on unit detail |
| Changing directory CSS casually | Owner-polished; preserve styling |
| Adding auth without RLS update | Both must change together |
| Using `target="_blank"` on unit links | Use `target="_self"` or session state |

---

## Key Files to Read First

1. `app.py` — Entry point and navigation
2. `views/_shared.py` — All data operations and constants
3. `views/unit_detail.py` — Core action workflows
4. `views/dashboard.py` — Reference for CSS/style patterns
5. `PROJECT_STATE.md` — Where development stopped and what's next

---

## Questions to Ask the Owner Before Major Changes

- Is the room layout changing (new floors, different numbering)?
- Should auth/roles be added before deployment?
- Is the Supabase schema documented elsewhere (ERD, migration files)?
- Which hosting platform is chosen for the React migration (Vercel confirmed as target)?
- Should Streamlit be maintained in parallel during migration, or frozen?
- Should PM overdue be automated from `last_pm_date`?
