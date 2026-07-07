# PTAC Pro Tracker — Architecture

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (User)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP
┌─────────────────────────▼───────────────────────────────────┐
│              Streamlit App (app.py)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Navigation  │  │ Session State│  │ Query Params       │  │
│  │ (segmented  │  │ supabase,    │  │ ?unit_detail=      │  │
│  │  controls)  │  │ selected_*   │  │                    │  │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘  │
│         │                │                     │            │
│  ┌──────▼────────────────▼─────────────────────▼──────────┐  │
│  │              views/*.py (Page Modules)                 │  │
│  │  dashboard │ directory │ unit_detail │ scanner │ ...  │  │
│  └──────────────────────────┬─────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────▼─────────────────────────────┐  │
│  │              views/_shared.py (Data Layer)             │  │
│  │  fetch_* │ update_* │ display helpers │ URL builders   │  │
│  └──────────────────────────┬─────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ supabase-py REST API
┌─────────────────────────────▼───────────────────────────────┐
│                    Supabase (PostgreSQL)                    │
│  ptac_units │ custody_transfers │ pm_logs │ onsite_repairs  │
│             │ doyle_repairs                                 │
└─────────────────────────────────────────────────────────────┘
```

The app follows a **thin view + shared data layer** pattern:

- **`app.py`** — Entry point, secrets, navigation shell, page routing
- **`views/*.py`** — One file per screen; renders UI and delegates data ops to `_shared.py`
- **`views/_shared.py`** — All Supabase reads/writes, domain constants, and reusable helpers
- **`views/unit_detail.py`** — Shared hidden detail screen imported by pages that support unit selection

There is no separate backend server. Streamlit scripts call Supabase directly via the Python client.

---

## Folder Structure

```
PTAC/
├── app.py                      # Main entry point, navigation, Supabase init
├── requirements.txt            # Python dependencies
├── current.md                  # Legacy handoff notes (superseded by this package)
├── .streamlit/
│   ├── config.toml             # Streamlit theme and server settings
│   └── secrets.toml.example    # Template for local/cloud secrets
├── supabase/
│   └── rls_policies.sql        # Row-level security policies for all tables
└── views/
    ├── __init__.py             # Package marker (empty)
    ├── _shared.py              # Shared data layer and domain helpers
    ├── dashboard.py            # Floor grid dashboard
    ├── directory.py            # Inventory table
    ├── unit_detail.py          # Hidden unit action screen
    ├── scanner.py              # QR / manual lookup
    ├── avery.py                # Label printer
    ├── analytics.py            # Spending & PM audits
    └── doyle.py                # Contractor portal
```

---

## Tech Stack

| Layer | Technology | Version / Notes |
|-------|------------|-----------------|
| UI Framework | Streamlit | Latest via `requirements.txt` |
| Language | Python 3 | 3.11+ recommended |
| Database | Supabase (PostgreSQL) | Hosted; accessed via REST |
| DB Client | supabase-py | `create_client(url, key)` |
| Data Analysis | pandas | Used lightly in analytics |
| QR Generation | api.qrserver.com | External API for QR images |
| Hosting (planned) | Streamlit Community Cloud | Also compatible with Render, Railway |

---

## State Management

Streamlit uses **`st.session_state`** as the application state store. Key keys:

| Key | Set By | Purpose |
|-----|--------|---------|
| `supabase` | `app.py` on first load | Supabase client instance |
| `current_category` | `app.py` navigation | `"🏨 Hotel Operations View"` or `"🛠️ Contractor Portals"` |
| `current_page` | `app.py` navigation | Active sub-page name (e.g. `"Dashboard Grid"`) |
| `selected_ptac_id` | Dashboard, directory, scanner, analytics, QR deep link | Opens unit detail overlay |
| `show_add_spare_form` | `directory.py` | Toggles spare registration form |
| `avery_selected_ids` | `avery.py` | Label selection state |
| `avery_batch` | `avery.py` | Current batch filter |
| `avery_selection_version` | `avery.py` | Forces checkbox widget reset |
| `doyle_selected_ptac_id` | `doyle.py` | Selected queue unit |
| `doyle_form_version` | `doyle.py` | Clears form widgets on reset |

**Query parameters:**

- `?unit_detail=PTAC-001` — Deep link from QR codes; sets `selected_ptac_id` in `app.py`

**Navigation clearing:**

When category or page changes, `clear_unit_detail_selection()` resets `selected_ptac_id` and clears query params so unit detail does not persist across tab switches.

**No caching:** `_shared.py` intentionally performs live Supabase reads on every call.

---

## Routing

Streamlit 1.x **`st.navigation`** with hidden default sidebar:

```python
pg = st.navigation([target_page_obj], position="hidden")
pg.run()
```

Visible navigation is custom-built with **`st.segmented_control`** in `app.py`:

1. **Top level:** Hotel Operations vs. Contractor Portals
2. **Second level:** Sub-pages within the selected category

**Unit detail is not a routed page.** It is rendered inline when `get_selected_ptac_id()` returns a value:

```python
if get_selected_ptac_id():
    render_unit_detail()
    st.stop()
```

This pattern appears in: `dashboard.py`, `directory.py`, `scanner.py`, `analytics.py`.

**Deep link flow:**

1. User scans QR → browser opens `https://app-url?unit_detail=PTAC-001`
2. `app.py` reads query param → sets `st.session_state.selected_ptac_id`
3. Active page checks selection → renders `render_unit_detail()` instead of its normal content

---

## API Architecture

There is no custom REST API. All data access goes through **Supabase PostgREST** via `supabase-py`:

```python
get_supabase().table("ptac_units").select(...).execute()
get_supabase().table("custody_transfers").insert({...}).execute()
get_supabase().table("ptac_units").update({...}).eq("ptac_id", id).execute()
```

### Read operations (`_shared.py`)

| Function | Table(s) | Purpose |
|----------|----------|---------|
| `fetch_units()` | `ptac_units` | Full inventory list |
| `fetch_unit(ptac_id)` | `ptac_units` | Single unit |
| `fetch_pm_logs(ptac_id?)` | `pm_logs` | PM history |
| `fetch_transfers(ptac_id?)` | `custody_transfers` | Custody history |
| `fetch_onsite_repairs(ptac_id?)` | `onsite_repairs` | Onsite repair history |
| `fetch_doyle_repairs(ptac_id?)` | `doyle_repairs` | Doyle repair history |

### Write operations (`_shared.py`)

| Function | Tables Written | Side Effects |
|----------|----------------|--------------|
| `update_unit_location()` | `custody_transfers`, `ptac_units` | Updates status, location, location_type |
| `register_pm_log()` | `pm_logs`, `ptac_units` | Sets `last_pm_date` |
| `register_onsite_repair()` | `onsite_repairs` | — |
| `complete_doyle_repair()` | `doyle_repairs`, `custody_transfers`, `ptac_units` | May displace occupying unit |

Some write paths in `unit_detail.py` call Supabase directly (PM and onsite repair) rather than the `_shared` helpers, but follow the same table contracts.

### External API

- **QR codes:** `https://api.qrserver.com/v1/create-qr-code/?size=WxH&data={url}`

---

## Database Schema

Inferred from application usage. Run migrations in Supabase if columns differ.

### `ptac_units`

| Column | Type (inferred) | Description |
|--------|-----------------|-------------|
| `ptac_id` | text (PK) | e.g. `PTAC-001` |
| `serial_number` | text | Manufacturer serial |
| `model_specs` | text | e.g. `Amana PTAC12-Standard` |
| `current_location_name` | text | e.g. `Room 201`, `5th Floor Storage Closet` |
| `location_type` | enum/text | `Room`, `Hallway`, `Elevator Closet`, `Maintenance Office`, `Doyle Shop`, `Spare` |
| `status` | enum/text | `Active`, `Needs PM`, `Maintenance Office`, `Doyle Shop` |
| `last_pm_date` | date | Last PM completion |
| `created_at` | timestamptz | Installation date |

**Note:** Spare units are rows in `ptac_units` with `location_type = "Spare"`, not a separate table.

### `custody_transfers`

| Column | Description |
|--------|-------------|
| `ptac_id` | FK to unit |
| `from_location` | Previous location |
| `to_location` | New location |
| `technician_name` | Who performed transfer |
| `notes` | Transfer notes (includes override info when applicable) |
| `transfer_date` | Auto or explicit timestamp |

### `pm_logs`

| Column | Description |
|--------|-------------|
| `ptac_id` | FK to unit |
| `technician_name` | Technician |
| `date_performed` | PM date |
| `diagnostic_notes` | Free text |
| `filters_washed_replaced` | boolean |
| `coils_vacuumed_inspected` | boolean |
| `wiring_thermostat_calibrated` | boolean |
| `blower_fan_centered_oiled` | boolean |

### `onsite_repairs`

| Column | Description |
|--------|-------------|
| `ptac_id` | FK to unit |
| `technician_name` | Technician |
| `repair_date` | Date |
| `parts_replaced` | Text |
| `repair_cost` | numeric |
| `diagnostic_notes` | Text |

### `doyle_repairs`

| Column | Description |
|--------|-------------|
| `ptac_id` | FK to unit |
| `sent_date` | Dispatch date |
| `return_date` | Return date |
| `doyle_diagnosis` | Diagnosis / invoice summary |
| `labor_cost` | numeric |
| `parts_cost` | numeric |
| `total_cost` | numeric (optional; used by `doyle_repair_cost()`) |
| `is_completed` | boolean |

### RLS

See `supabase/rls_policies.sql`. All tables use permissive `allow_all_*` policies suitable for internal hotel use with anon key. Tighten before public deployment.

---

## Authentication Flow

**Currently: none.**

- Supabase client uses the anon/service key from `st.secrets["supabase"]["key"]`
- No login screen, no session tokens, no role checks
- Doyle portal is visually separated by navigation category but not access-controlled

Future auth would require Supabase Auth + RLS policies scoped by role.

---

## Component Hierarchy

```
app.py
├── Navigation Header (logo + segmented controls)
├── Category Segmented Control
├── Page Segmented Control
└── st.navigation → active view
    ├── dashboard.py
    │   └── [if selected] unit_detail.render_unit_detail()
    ├── directory.py
    │   └── [if selected] unit_detail.render_unit_detail()
    ├── scanner.py
    │   └── [if selected] unit_detail.render_unit_detail()
    ├── avery.py
    ├── analytics.py
    │   └── [if selected] unit_detail.render_unit_detail()
    └── doyle.py

unit_detail.py (shared overlay)
├── Header (back, edit, delete)
├── QR Card
├── Action Tiles → Modal Dialogs
│   ├── transfer_dialog → render_transfer_form
│   ├── pm_dialog → render_pm_form
│   ├── repair_dialog → render_repair_form
│   ├── edit_dialog → render_edit_form
│   └── delete_dialog → render_delete_form
└── History Timeline
```

---

## Design System

See **`DESIGN_SYSTEM.md`** for full token reference.

Summary:

- **Theme:** Streamlit config + inline CSS in each view
- **Primary color:** `#2563eb` (blue)
- **Background:** `#f8fafc` (slate-50)
- **Text:** `#0f172a` (slate-900)
- **Status colors:** Green (Active), Amber (Needs PM), Purple (Maintenance), Rose (Doyle), Blue (Spare)
- **Cards:** White background, `#e2e8f0` border, 16–22px border-radius, subtle box-shadow
- **Typography:** System sans-serif; heavy use of `font-weight: 900/950` for headings

CSS is page-scoped via `st.markdown("<style>...</style>")` rather than a global stylesheet.
