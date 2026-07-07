# Changelog

All notable implementation milestones for PTAC Pro Tracker. Versions are chronological phases, not semver releases.

---

## [Unreleased]

### Planned
- Production deployment with public QR base URL
- Scanner camera integration
- Analytics and Doyle portal polish
- Seed data script restoration

---

## Phase 4 — Secondary Pages & QR Hardening

### Scanner Gateway (`views/scanner.py`)
- Rewrote as lookup gateway routing to shared unit detail
- Added `parse_scan_lookup()` for PTAC ID or unit-detail URL input
- Removed duplicate custody/PM/repair action logic
- Fallback unit selectbox for manual selection

### Avery Labels (`views/avery.py`)
- Full label sheet preview for Avery PLS-591PM-10 (2×5 layout)
- Batch filters: all, rooms, hallways, spares, maintenance, Doyle
- Select all / clear all selection controls
- QR codes now encode `unit_detail_url(ptac_id)` (full URL)
- Multi-sheet pagination for >10 units
- Browser print via `components.html` with auto-print trigger
- Checkbox widget versioning to handle selection state resets

### Spending Audits (`views/analytics.py`)
- KPI cards: total spend, avg cost, PM compliance, active Doyle units
- Date window filter (all time, 30 days, 90 days)
- Top 10 highest repair expenses with bar chart
- Active Doyle queue with unit detail links
- Recent PM logs with clickable unit references
- Uses `doyle_repair_cost()` for consistent Doyle cost calculation

### Doyle Portal (`views/doyle.py`)
- Contractor-themed UI with queue and repair form
- Shows only Doyle Shop units
- Core components checklist (6 items)
- Return route: spare storage or direct guest room
- Occupied-room override on room return
- Integrated `complete_doyle_repair()` shared helper
- Dispatch notes from latest custody transfer to Doyle

### Shared Layer Additions (`views/_shared.py`)
- `parse_scan_lookup()` — normalize scanner input
- `doyle_repair_cost()` — compute billable Doyle cost
- `latest_doyle_dispatch_note()` — queue card dispatch context
- `complete_doyle_repair()` — full Doyle completion with displacement
- `kpi_card()` — reusable KPI HTML renderer

---

## Phase 3 — Navigation, QR & Modal Refactor

### Navigation Fix (`app.py`)
- Added `clear_unit_detail_selection()` on category and page change
- Clears `selected_ptac_id` and query params when switching tabs
- Prevents unit detail from persisting across navigation

### QR URL Strategy
- Added `app_base_url()` — prefers live host header on deployment
- Added `unit_detail_url(ptac_id)` — builds `?unit_detail=` deep links
- Unit detail QR now encodes full URL (not plain text)
- Localhost QR warning on unit detail screen
- Secrets template documents `[app].base_url`

### Dashboard Link Fix (`views/dashboard.py`)
- Unit tile links use `target="_self"` for same-tab navigation
- QR deep link format: `?unit_detail=PTAC-###`

### Modal Dialog Conversion (`views/unit_detail.py`)
- Custody transfer → `@st.dialog("Transfer PTAC Custody")`
- PM checklist → `@st.dialog("Preventative Maintenance")`
- Onsite repair → `@st.dialog("Document Repair Costs")`
- Edit specifications → `@st.dialog("Edit Specifications")`
- Delete record → `@st.dialog("Delete Record")`

### Custody Transfer Improvements
- Route and destination dropdowns moved outside `st.form`
- Dependent room/corridor dropdowns appear immediately on route selection
- Execute button disabled until valid target destination selected
- Occupied-room override notes appended to transfer notes before write
- Technician name required (removed "Hotel Maintenance" prefill)

### PM & Repair Validation
- PM requires all 4 checklist items checked
- PM and repair require real technician name (placeholder only)
- Onsite repair requires diagnostic notes

---

## Phase 2 — Shared Layer & Unit Detail

### Shared Data Layer (`views/_shared.py`)
- Created central helper module extracted from duplicate page logic
- `fetch_units()`, `fetch_unit()`, `fetch_pm_logs()`, `fetch_transfers()`
- `fetch_onsite_repairs()`, `fetch_doyle_repairs()`
- `display_status()`, `is_at_maintenance_office()`, `btu_from_model()`
- `room_options()`, `corridor_options()`, `location_options()`
- `infer_location_type()`, `target_status_for_location()`
- `active_unit_at_location()` — occupied room detection
- `next_ptac_id()` — auto ID generation
- `dashboard_status_style()` — tile color CSS
- `update_unit_location()` — custody transfer write path
- `register_pm_log()`, `register_onsite_repair()` — log write helpers
- Intentionally no caching (live reads)

### Unit Detail Screen (`views/unit_detail.py`)
- Hidden shared action screen for individual PTAC units
- Selection via `st.query_params["unit_detail"]` or `st.session_state.selected_ptac_id`
- Unit header with status badge, model, serial, BTU
- Physical QR identification card
- Action tiles for custody, PM, onsite repair
- Combined history timeline (install, transfers, PM, repairs, Doyle)
- Edit specifications and delete record functionality
- `allowed_transfer_paths()` — state-dependent destination rules
- `resolve_target_location()` — route category to concrete location
- Occupied-room displacement on room deployment

### Page Integration
- Dashboard, directory delegate to `render_unit_detail()` when unit selected
- Directory "View / Action" sets `selected_ptac_id`

---

## Phase 1 — Foundation

### App Shell (`app.py`)
- Streamlit page config (title, icon, wide layout)
- Supabase client from `st.secrets["supabase"]`
- Custom horizontal navigation with segmented controls
- Two categories: Hotel Operations View, Contractor Portals
- Five hotel sub-pages + Doyle contractor portal
- Hidden Streamlit sidebar navigation
- Session state defaults for category and page
- QR deep link handling on startup

### Dashboard (`views/dashboard.py`)
- KPI cards: total inventory, active, PM overdue, maintenance, Doyle
- Floor 2–6 visual grid with room/suite cells
- Color-coded status tiles with PM pulse animation
- Support sections: corridors, elevator, maintenance, Doyle, spares
- Legend panel for operational status colors
- Dark hero banner ("Control Room Visual Grid")

### Directory (`views/directory.py`)
- Full inventory table with polished styling
- Search by ID, serial, model, location, status
- Location and status filter dropdowns
- Spare unit registration form
- Status pills with color coding
- View/Action buttons per row

### Infrastructure
- `requirements.txt` — streamlit, supabase, pandas
- `.streamlit/config.toml` — theme colors, headless server
- `.streamlit/secrets.toml.example` — secrets template
- `supabase/rls_policies.sql` — permissive RLS for all 5 tables
- `views/__init__.py` — package marker

### Database Integration
- Confirmed write paths for all 5 Supabase tables
- Spare units as `ptac_units` rows with `location_type = "Spare"`
- Custody transfers paired with every location change
- PM logs update `last_pm_date`
- Doyle repairs linked to custody transfers on return

---

## Pre-Repository History

The following existed in project planning:

- Initial Supabase schema creation (tables assumed to exist)

## Data Bootstrap (completed)

- **`seed.py`** — Initial Hampton Inn PTAC inventory seed script. **Completed.** Guest rooms, hallways, elevator closet, and spare units are populated in Supabase. Re-run only if the database is reset.
