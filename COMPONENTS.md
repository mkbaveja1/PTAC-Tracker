# PTAC Pro Tracker — Components Reference

This project is a **Streamlit (Python) application**, not a React SPA. "Components" here means **page modules**, **shared functions**, and **UI building blocks** (HTML/CSS fragments, Streamlit widgets, modal dialogs).

Convention mapping for React-oriented readers:

| React concept | Streamlit equivalent |
|---------------|---------------------|
| Props | Function parameters, session state, query params |
| State | `st.session_state`, widget keys |
| Events | Button clicks, form submits → `st.rerun()` |
| Dependencies | Python imports from `views._shared`, `views.unit_detail` |

---

## App Shell — `app.py`

### Purpose
Main entry point. Configures Streamlit, initializes Supabase, renders custom navigation, routes to the active page.

### Session State (State)
| Key | Default | Purpose |
|-----|---------|---------|
| `supabase` | Created on first load | Supabase client |
| `current_category` | `"🏨 Hotel Operations View"` | Top nav selection |
| `current_page` | `"Dashboard Grid"` | Sub-nav selection |
| `selected_ptac_id` | Set from QR deep link | Unit detail selection |

### Events
| Trigger | Handler | Effect |
|---------|---------|--------|
| Category segmented control change | `clear_unit_detail_selection()` + rerun | Switch mode, reset unit detail |
| Page segmented control change | `clear_unit_detail_selection()` + rerun | Switch page, reset unit detail |
| `?unit_detail=PTAC-###` in URL | Read in `app.py` | Sets `selected_ptac_id` |

### Dependencies
- `streamlit`, `supabase.create_client`
- All view modules via `st.Page(...)`

### Reusable Patterns
- Hidden Streamlit sidebar: `st.navigation(..., position="hidden")`
- Custom horizontal nav with `st.segmented_control`
- `clear_unit_detail_selection()` before navigation changes

---

## Shared Data Layer — `views/_shared.py`

### Purpose
Central domain and data-access layer. All Supabase reads/writes and hotel-specific constants live here.

### Constants
```python
STATUSES = ["Active", "Needs PM", "Maintenance Office", "Doyle Shop"]
LOCATION_TYPES = ["Room", "Hallway", "Elevator Closet", "Maintenance Office", "Doyle Shop", "Spare"]
FLOORS = [2, 3, 4, 5, 6]
ROOM_SUFFIXES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29]
```

### Key Functions

| Function | Parameters | Returns | Purpose |
|----------|------------|---------|---------|
| `get_supabase()` | — | Client | Session Supabase client |
| `app_base_url()` | — | str | Public URL for QR links |
| `unit_detail_url(ptac_id)` | ptac_id | str | Full deep link URL |
| `fetch_units()` | — | list[dict] | All units |
| `fetch_unit(ptac_id)` | ptac_id | dict | Single unit |
| `fetch_pm_logs(ptac_id?)` | optional filter | list | PM logs |
| `fetch_transfers(ptac_id?)` | optional filter | list | Custody logs |
| `fetch_onsite_repairs(ptac_id?)` | optional filter | list | Onsite repairs |
| `fetch_doyle_repairs(ptac_id?)` | optional filter | list | Doyle repairs |
| `display_status(unit)` | unit dict | str | User-facing status label |
| `dashboard_status_style(status)` | status str | str | Inline CSS for tiles |
| `kpi_card(label, value, sublabel, color)` | 4 strings | — | Renders KPI HTML |
| `update_unit_location(...)` | ptac_id, status, location, tech, notes | — | Custody transfer write |
| `complete_doyle_repair(...)` | many | — | Full Doyle completion flow |
| `parse_scan_lookup(raw)` | str | str\|None | Parse PTAC ID or URL |
| `active_unit_at_location(units, loc, id)` | lists/str | dict\|None | Occupied room check |
| `next_ptac_id(units)` | list | str | Next `PTAC-###` ID |

### Dependencies
- `streamlit`, `datetime`, `urllib.parse`, `html.escape`

### Reusable Patterns
- **No caching** — always live reads
- **Occupied-room override** — check before room deployment, displace existing unit to Maintenance Office
- **QR URL resolution** — prefer live host header over secrets for deployed apps

---

## Unit Detail — `views/unit_detail.py`

### Purpose
Hidden shared action screen for a single PTAC unit. Opened from dashboard, directory, scanner, analytics, or QR deep links.

### Public API

| Function | Parameters | Purpose |
|----------|------------|---------|
| `get_selected_ptac_id()` | — | Read from query params or session |
| `render_unit_detail(ptac_id?)` | optional override | Render full detail screen |

### Session / Query State
- Reads: `st.query_params["unit_detail"]`, `st.session_state.selected_ptac_id`
- Writes on back/delete: clears selection, resets to Dashboard Grid

### Modal Dialogs (Events)

| Dialog | Decorator | Form Function | Submit Action |
|--------|-----------|---------------|---------------|
| Custody Transfer | `@st.dialog("Transfer PTAC Custody")` | `render_transfer_form` | `update_unit_location()` |
| PM Checklist | `@st.dialog("Preventative Maintenance")` | `render_pm_form` | Insert `pm_logs`, update unit |
| Onsite Repair | `@st.dialog("Document Repair Costs")` | `render_repair_form` | Insert `onsite_repairs` |
| Edit Specs | `@st.dialog("Edit Specifications")` | `render_edit_form` | Update `ptac_units` |
| Delete Record | `@st.dialog("Delete Record")` | `render_delete_form` | Delete from `ptac_units` |

### Custody Transfer Rules (`allowed_transfer_paths`)

| Current State | Allowed Destinations |
|---------------|---------------------|
| Active/Needs PM in Room/Hallway/Elevator | Maintenance Office, Doyle Shop |
| Doyle Shop | Spare Storage, Guest Room, Maintenance Office |
| Maintenance Office | Guest Room, Corridor/Hallway, Elevator Closet, Spare Storage, Doyle Shop |
| Spare/Storage | Guest Room, Corridor/Hallway, Elevator Closet, Maintenance Office, Doyle Shop |

**Important:** Route and destination dropdowns are **outside** `st.form` so dependent fields appear immediately on selection.

### UI Sections
1. **Header** — PTAC ID, status badge, model/serial/BTU, back button
2. **QR Card** — QR image (api.qrserver.com), current location
3. **Action Tiles** — Custody, PM, Repair (open modals)
4. **History Feed** — Combined timeline from transfers, PM, repairs, Doyle

### Dependencies
- `views._shared` (all fetch/update helpers)
- External QR API

### Reusable Patterns
- `@st.dialog` for modal forms
- `inject_detail_styles()` for page CSS
- `build_history_markup()` for timeline HTML
- Localhost QR warning when `detail_url.startswith("http://localhost")`

---

## Dashboard — `views/dashboard.py`

### Purpose
Visual command center. KPI cards + floor-by-floor room grid + support asset sections.

### State
- Reads `get_selected_ptac_id()` — if set, delegates to `render_unit_detail()` and stops

### Data Flow
- `fetch_units()` → KPI counts + location lookup dict
- Room grid built from hardcoded `FLOORS` × `ROOM_SUFFIXES` layout
- Suite 211 → `Suite 211-A` and `Suite 211-B`

### UI Building Blocks

| Block | Implementation |
|-------|----------------|
| KPI Cards | 5-column row, custom `.kpi-card` CSS |
| Hero Banner | Dark navy `.dashboard-hero` |
| Legend | Status color dots |
| Floor Cards | `.floor-card` with `.floor-row` grid |
| Room Cells | `make_cell()` → HTML anchor with `?unit_detail=` link, `target="_self"` |
| Support Sections | Corridors, Elevator, Maintenance, Doyle, Spares |

### Events
- Click room tile → browser navigates to `?unit_detail=PTAC-###` (same tab)

### Dependencies
- `views._shared`, `views.unit_detail`

### Status Colors
Driven by `dashboard_status_style()` — see DESIGN_SYSTEM.md

---

## Directory — `views/directory.py`

### Purpose
Master inventory table with search, filters, spare registration, and View/Action buttons.

### Session State
| Key | Purpose |
|-----|---------|
| `show_add_spare_form` | Toggle spare registration panel |

### Filters
- **Search:** PTAC ID, serial, model, location, location_type, status
- **Location filter:** All, Guest Rooms, Hallways, Elevator, Spares, Maintenance, Doyle
- **Status filter:** All, Active, Needs PM, Maintenance Office, Doyle Shop, Spare/Storage

### Events
| Action | Effect |
|--------|--------|
| `+ Register New Spare Unit` | Toggle form |
| Form submit `Ingest Stock Spare` | Insert into `ptac_units`, rerun |
| `View / Action` button | Set `selected_ptac_id`, rerun → unit detail |

### Spare Registration Form Fields
- Model Specifications (selectbox)
- Serial Number (required)
- Storage Location (default: `5th Floor Storage Closet`)
- Auto-assigned ID via `next_ptac_id()`

### Dependencies
- Direct Supabase insert for spare registration
- `views._shared`, `views.unit_detail`

### Reusable Patterns
- **Preserve table styling** — project owner polished this; do not change CSS casually
- Status pills via `status_class()` mapping

---

## Scanner — `views/scanner.py`

### Purpose
Lookup gateway to unit detail. Accepts typed PTAC ID or pasted unit-detail URL.

### State
| Widget Key | Purpose |
|------------|---------|
| `scanner_lookup_input` | Manual lookup field |

### Events
| Action | Effect |
|--------|--------|
| Valid parsed ID found | Set `selected_ptac_id`, rerun → unit detail |
| Invalid ID | Show error, no Supabase write |
| Fallback selectbox + `Open Unit Detail` | Set `selected_ptac_id` |

### Dependencies
- `parse_scan_lookup()`, `fetch_unit()`, `fetch_units()`
- `views.unit_detail`

### Remaining Work
- Camera scanning not implemented
- Should remain a pure gateway (no duplicate custody/PM/repair forms)

---

## Avery Labels — `views/avery.py`

### Purpose
Generate printable Avery PLS-591PM-10 label sheets (2 columns × 5 rows = 10 labels per sheet).

### Session State
| Key | Purpose |
|-----|---------|
| `avery_selected_ids` | List of selected PTAC IDs |
| `avery_batch` | Current batch filter |
| `avery_selection_version` | Widget key versioning for checkbox reset |

### Batch Filters
`All Units`, `Rooms Only`, `Hallways Only`, `Spares Only`, `Maintenance Office`, `Doyle Shop`

### Events
| Action | Effect |
|--------|--------|
| Batch change | Reset selection to first 10 of filtered set |
| Select All Shown | Select all filtered IDs |
| Clear All Selection | Empty selection |
| Print Label Sheet | `components.html()` with `window.print()` |

### Label Content (per unit)
- PTAC ID, location, BTU, serial number
- QR code encoding `unit_detail_url(ptac_id)` ✓ (implemented)

### Dependencies
- `streamlit.components.v1.html` for print preview
- `views._shared.unit_detail_url`, `btu_from_model`

### Functions
| Function | Purpose |
|----------|---------|
| `filter_units(units, batch)` | Apply batch filter |
| `build_label_markup(unit)` | Single label HTML |
| `build_sheet_markup(n, units)` | 10-label sheet |
| `build_preview_html(sheets, auto_print)` | Full print document |

---

## Analytics (Spending Audits) — `views/analytics.py`

### Purpose
Management reporting: repair spend, PM compliance, Doyle queue, recent PM logs.

### Filters
- Repair Spend Window: All Time, Last 30 Days, Last 90 Days

### KPI Cards (via `kpi_card()`)
1. Accumulated Repairs Spend
2. Avg Repair Cost
3. PM Compliance (%)
4. Active Doyle Units

### Sections
| Section | Content |
|---------|---------|
| Highest Repair Expenses | Top 10 PTAC by combined onsite + Doyle cost; bar chart; clickable buttons → unit detail |
| Active Doyle Shipments | List of Doyle Shop units with View buttons |
| Recent PM Logs | Last 20 PM entries, clickable → unit detail |

### Dependencies
- `pandas` for grouping/sorting repair costs
- `views._shared`, `views.unit_detail`

---

## Doyle Portal — `views/doyle.py`

### Purpose
Contractor-facing workflow for completing offsite repairs and returning units to the hotel.

### Session State
| Key | Purpose |
|-----|---------|
| `doyle_selected_ptac_id` | Selected queue unit |
| `doyle_form_version` | Form reset counter |

### UI Layout
- **Left column:** Offsite repair queue (Doyle Shop units only)
- **Right column:** Tech repair entry form

### Form Fields
- Technician Signature, Invoice/Work Order Ref
- Core components checklist (6 items)
- Additional parts, Total bill, Diagnostic notes
- Return route: Spare Storage or Direct to Guest Room
- Occupied-room override checkbox when applicable

### Events
| Action | Effect |
|--------|--------|
| Select unit | Set `doyle_selected_ptac_id` |
| Clear Card | Increment `doyle_form_version`, rerun |
| Mark Fixed & Ship | Call `complete_doyle_repair()`, clear selection |

### Dependencies
- `complete_doyle_repair()`, `active_unit_at_location()`, `latest_doyle_dispatch_note()`

### Constants
```python
CORE_COMPONENTS = ["Compressor", "Freon Recharge", "Fan Motor", "Relay Control", "Capacitor", "Solder Repair"]
SPARE_STORAGE = "5th Floor Storage Closet"
```

---

## Cross-Cutting UI Patterns

### Unit Detail Overlay Pattern
Used by: dashboard, directory, scanner, analytics

```python
if get_selected_ptac_id():
    render_unit_detail()
    st.stop()
```

### Modal Dialog Pattern
Used by: unit_detail (all action forms)

```python
@st.dialog("Title")
def my_dialog(unit):
    render_my_form(unit)

if st.button("Open..."):
    my_dialog(unit)
```

### Inline HTML/CSS Pattern
Each view injects its own `<style>` block via `st.markdown(..., unsafe_allow_html=True)`.

### KPI Card Pattern
```python
kpi_card("Label", "42", "Sublabel", "#2563eb")
```

---

## Screenshots / References

No screenshot files are stored in the repository. Visual reference:

- **Dashboard:** Color-coded grid matching Hampton Inn floors 2–6; dark hero banner; 5 KPI cards
- **Directory:** White card table with status pills; filter bar above
- **Unit Detail:** Two-column layout — QR card left, action tiles right; timeline below
- **Doyle:** Dark header banner; queue cards with rose border; form on right
- **Avery:** Blue-tinted preview shell; 2×5 label grid

Refer to inline CSS in each `views/*.py` file for exact styling.
